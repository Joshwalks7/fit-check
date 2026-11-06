import { supabase } from '../lib/supabase.js'

const OUTFIT_BUCKET = 'outfit-images'

async function getSignedImageUrls(paths) {
  if (!paths.length) return new Map()

  const { data, error } = await supabase.storage
    .from('Clothing_item_pics')
    .createSignedUrls(paths, 3600)

  if (error) throw error

  return new Map(
    (data || [])
      .filter((image) => image.path && image.signedUrl && !image.error)
      .map((image) => [image.path, image.signedUrl]),
  )
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
  const imageUrls = await getSignedImageUrls(paths)

  return rows.map((item) => ({
    ...item,
    imageUrl: (item.clothing_item_images || [])
      .map((image) => imageUrls.get(image.file_path))
      .find(Boolean) || null,
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
