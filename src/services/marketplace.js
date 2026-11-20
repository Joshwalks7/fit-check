import { supabase } from '../lib/supabase.js'
import { getOrderedMarketplaceImages, getSignedMarketplaceImageUrls, removeMarketplaceImages, uploadMarketplaceImage } from './marketplaceImages.js'

const LISTING_SELECT = `
  listing_id,
  seller_id,
  title,
  description,
  category,
  brand,
  size,
  color,
  condition,
  price,
  location_label,
  status,
  created_at,
  updated_at,
  published_at,
  sold_at
`

function normalizeListing(row, imageRows, profileById, imageUrls) {
  const images = getOrderedMarketplaceImages(imageRows, imageUrls)
  return {
    ...row,
    seller: profileById[row.seller_id] || null,
    images,
    imageUrl: images.find((image) => image.imageUrl)?.imageUrl || null,
  }
}

async function hydrateListings(rows) {
  if (!rows.length) return []

  const listingIds = rows.map((row) => row.listing_id)
  const sellerIds = [...new Set(rows.map((row) => row.seller_id).filter(Boolean))]

  const [imagesResult, profilesResult] = await Promise.all([
    supabase
      .from('marketplace_listing_images')
      .select('image_id, listing_id, storage_path, sort_order, alt_text')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', sellerIds),
  ])

  if (imagesResult.error) throw imagesResult.error
  if (profilesResult.error) throw profilesResult.error

  const imageRowsByListingId = new Map()
  for (const image of imagesResult.data || []) {
    const listingImages = imageRowsByListingId.get(image.listing_id) || []
    listingImages.push(image)
    imageRowsByListingId.set(image.listing_id, listingImages)
  }

  const profileById = Object.fromEntries((profilesResult.data || []).map((profile) => [profile.id, profile]))
  const allImages = imagesResult.data || []
  const imageUrls = await getSignedMarketplaceImageUrls(allImages.map((image) => image.storage_path))

  return rows.map((row) => normalizeListing(
    row,
    imageRowsByListingId.get(row.listing_id) || [],
    profileById,
    imageUrls,
  ))
}

async function requireUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Please sign in to view the marketplace.')
  return user
}

export async function fetchClosetItemsForListing() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('clothing_items')
    .select('id, name, description, category, color, brand, size')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

function validateListingInput(listing, images, publish) {
  if (!listing.title?.trim()) throw new Error('Add a title for your listing.')
  if (!listing.category) throw new Error('Choose a category.')
  if (!listing.condition) throw new Error('Choose the item condition.')
  if (listing.price === '' || listing.price === null || listing.price === undefined || Number.isNaN(Number(listing.price)) || Number(listing.price) < 0) {
    throw new Error('Enter a price of zero or more.')
  }
  if (publish && !images.length) throw new Error('Add at least one photo before publishing.')
}

export async function createMarketplaceListing({ listing, images = [], publish = false }) {
  const user = await requireUser()
  validateListingInput(listing, images, publish)

  const { data: createdListing, error: listingError } = await supabase
    .from('marketplace_listings')
    .insert({
      seller_id: user.id,
      source_clothing_item_id: listing.source_clothing_item_id || null,
      title: listing.title.trim(),
      description: listing.description?.trim() || null,
      category: listing.category,
      brand: listing.brand?.trim() || null,
      size: listing.size?.trim() || null,
      color: listing.color?.trim() || null,
      condition: listing.condition,
      price: Number(listing.price),
      location_label: listing.location_label?.trim() || null,
      status: 'draft',
    })
    .select('listing_id')
    .single()

  if (listingError) throw listingError

  const listingId = createdListing.listing_id
  const uploadedPaths = []
  let imageRowsInserted = false

  try {
    for (const [index, image] of images.entries()) {
      uploadedPaths.push(await uploadMarketplaceImage(user.id, listingId, image, index))
    }

    if (uploadedPaths.length) {
      const { error: imageError } = await supabase
        .from('marketplace_listing_images')
        .insert(uploadedPaths.map((storagePath, index) => ({
          listing_id: listingId,
          storage_path: storagePath,
          sort_order: index,
        })))

      if (imageError) throw imageError
      imageRowsInserted = true
    }

    if (publish) {
      const { data: publishedListing, error: publishError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'active', published_at: new Date().toISOString() })
        .eq('listing_id', listingId)
        .select('listing_id, status, published_at')
        .single()

      if (publishError) throw publishError
      return publishedListing
    }

    return { listing_id: listingId, status: 'draft' }
  } catch (error) {
    if (imageRowsInserted) {
      await supabase
        .from('marketplace_listing_images')
        .delete()
        .eq('listing_id', listingId)
    }

    try {
      await removeMarketplaceImages(uploadedPaths)
    } catch (cleanupError) {
      console.warn('Marketplace image cleanup failed:', cleanupError)
    }

    await supabase
      .from('marketplace_listings')
      .delete()
      .eq('listing_id', listingId)

    throw error
  }
}

export async function fetchActiveListings() {
  await requireUser()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return hydrateListings(data || [])
}

export async function fetchMyListings() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(LISTING_SELECT)
    .eq('seller_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return hydrateListings(data || [])
}

export async function updateMarketplaceListing(listingId, changes) {
  await requireUser()

  const editableChanges = {
    title: changes.title?.trim(),
    description: changes.description?.trim() || null,
    category: changes.category,
    brand: changes.brand?.trim() || null,
    size: changes.size?.trim() || null,
    color: changes.color?.trim() || null,
    condition: changes.condition,
    price: Number(changes.price),
    location_label: changes.location_label?.trim() || null,
  }

  validateListingInput(editableChanges, [{ uri: 'existing-listing-image' }], false)

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(editableChanges)
    .eq('listing_id', listingId)
    .select('listing_id, status, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function setMarketplaceListingStatus(listingId, status) {
  await requireUser()

  const changes = { status }
  if (status === 'active') {
    changes.published_at = new Date().toISOString()
    changes.sold_at = null
  }
  if (status === 'sold') changes.sold_at = new Date().toISOString()
  if (status !== 'sold') changes.sold_at = null

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(changes)
    .eq('listing_id', listingId)
    .select('listing_id, status, published_at, sold_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteMarketplaceListing(listingId) {
  await requireUser()

  const { data: images, error: imageLookupError } = await supabase
    .from('marketplace_listing_images')
    .select('storage_path')
    .eq('listing_id', listingId)

  if (imageLookupError) throw imageLookupError

  const { error } = await supabase
    .from('marketplace_listings')
    .delete()
    .eq('listing_id', listingId)

  if (error) throw error

  try {
    await removeMarketplaceImages((images || []).map((image) => image.storage_path))
  } catch (cleanupError) {
    console.warn('Marketplace listing image cleanup failed after deletion:', cleanupError)
  }
}

export async function fetchListingById(listingId) {
  await requireUser()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(LISTING_SELECT)
    .eq('listing_id', listingId)
    .single()

  if (error) throw error
  const [listing] = await hydrateListings([data])
  return listing
}
