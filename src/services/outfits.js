import { supabase } from '../lib/supabase.js'
import { getFirstClothingImageUrl, getSignedClothingImageUrls } from './clothingImages.js'

const OUTFIT_BUCKET = 'outfit-images'

async function getSignedOutfitImageUrl(path) {
  if (!path) return null

  const { data, error } = await supabase.storage
    .from(OUTFIT_BUCKET)
    .createSignedUrl(path, 3600)

  if (error) throw error
  return data?.signedUrl || null
}

export async function fetchTodaysOutfit(dateKey) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Please sign in to view today\'s fit.')

  const { data, error } = await supabase
    .from('outfits')
    .select('id, photo_path, worn_on, title, notes, created_at')
    .eq('user_id', user.id)
    .eq('worn_on', dateKey)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const outfit = data?.[0]
  if (!outfit) return null

  const { data: outfitItems, error: itemsError } = await supabase
    .from('outfit_items')
    .select('clothing_item_id, clothing_items(name, category)')
    .eq('outfit_id', outfit.id)

  if (itemsError) throw itemsError

  return {
    ...outfit,
    imageUrl: await getSignedOutfitImageUrl(outfit.photo_path),
    items: (outfitItems || []).map((item) => item.clothing_items).filter(Boolean),
  }
}

export async function fetchClosetItemsForOutfit() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Please sign in to document an outfit.')

  const { data, error } = await supabase
    .from('clothing_items')
    .select('id, name, category, color, brand, clothing_item_images(file_path)')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw error

  const rows = data || []
  const paths = [...new Set(rows.flatMap((item) => (
    item.clothing_item_images || []
  ).map((image) => image.file_path).filter(Boolean)))]
  const imageUrls = await getSignedClothingImageUrls(paths)

  return rows.map((item) => ({
    ...item,
    imageUrl: getFirstClothingImageUrl(item.clothing_item_images, imageUrls),
  }))
}

async function uploadOutfitImage(userId, image) {
  const extension = image.mimeType?.split('/')[1] || 'jpg'
  const filePath = `${userId}/${Date.now()}.${extension}`
  const body = await (await fetch(image.uri)).arrayBuffer()

  const { error } = await supabase.storage
    .from(OUTFIT_BUCKET)
    .upload(filePath, body, {
      contentType: image.mimeType || 'image/jpeg',
      upsert: false,
    })

  if (error) throw error
  return filePath
}

export async function createOutfit({ image, wornOn, title, notes, clothingItemIds }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to save an outfit.')
  if (!image?.uri) throw new Error('Choose an outfit photo before saving.')
  if (!clothingItemIds.length) throw new Error('Select at least one closet item.')

  const photoPath = await uploadOutfitImage(user.id, image)
  let outfitId = null

  try {
    const { data: outfit, error: outfitError } = await supabase
      .from('outfits')
      .insert({
        user_id: user.id,
        photo_path: photoPath,
        worn_on: wornOn,
        title: title.trim() || null,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (outfitError) throw outfitError
    outfitId = outfit.id

    const { error: itemsError } = await supabase
      .from('outfit_items')
      .insert(clothingItemIds.map((clothingItemId) => ({
        outfit_id: outfitId,
        clothing_item_id: clothingItemId,
        source: 'manual',
      })))

    if (itemsError) throw itemsError
    return outfit
  } catch (error) {
    if (outfitId) await supabase.from('outfits').delete().eq('id', outfitId)
    await supabase.storage.from(OUTFIT_BUCKET).remove([photoPath])
    throw error
  }
}
