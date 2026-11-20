import { supabase } from '../lib/supabase.js'

export const MARKETPLACE_IMAGE_BUCKET = 'marketplace-listing-images'

function getImageExtension(image) {
  const mimeType = image?.mimeType || 'image/jpeg'
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return extensions[mimeType] || 'jpg'
}

export async function uploadMarketplaceImage(userId, listingId, image, index) {
  if (!userId || !listingId || !image?.uri) throw new Error('A valid marketplace image is required.')

  const mimeType = image.mimeType || 'image/jpeg'
  const filePath = `${userId}/${listingId}/${Date.now()}-${index}.${getImageExtension(image)}`
  const response = await fetch(image.uri)
  const body = await response.arrayBuffer()
  if (!body.byteLength) throw new Error('The selected marketplace image is empty.')

  const { error } = await supabase.storage
    .from(MARKETPLACE_IMAGE_BUCKET)
    .upload(filePath, body, { contentType: mimeType, upsert: false })

  if (error) throw error
  return filePath
}

export async function removeMarketplaceImages(paths) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))]
  if (!uniquePaths.length) return

  const { error } = await supabase.storage
    .from(MARKETPLACE_IMAGE_BUCKET)
    .remove(uniquePaths)

  if (error) throw error
}

export async function getSignedMarketplaceImageUrls(paths, expiresIn = 3600) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))]
  if (!uniquePaths.length) return new Map()

  const { data, error } = await supabase.storage
    .from(MARKETPLACE_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, expiresIn)

  if (error) throw error

  return new Map(
    (data || [])
      .filter((image) => image.path && image.signedUrl && !image.error)
      .map((image) => [image.path, image.signedUrl]),
  )
}

export function getOrderedMarketplaceImages(images, imageUrls) {
  return (images || [])
    .filter((image) => image.storage_path)
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
    .map((image) => ({
      ...image,
      imageUrl: imageUrls.get(image.storage_path) || null,
    }))
}
