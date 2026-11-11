import { supabase } from '../lib/supabase.js'

export const CLOTHING_IMAGE_BUCKET = 'Clothing_item_pics'

export async function uploadClothingImage(userId, image) {
  if (!userId) throw new Error('You must be signed in to upload a clothing photo.')
  if (!image?.uri) throw new Error('Choose a clothing photo before uploading.')

  const response = await fetch(image.uri)
  const body = await response.arrayBuffer()
  const extension = image.mimeType?.split('/')[1] || 'jpg'
  const filePath = `${userId}/${Date.now()}.${extension}`

  const { data, error } = await supabase.storage
    .from(CLOTHING_IMAGE_BUCKET)
    .upload(filePath, body, {
      contentType: image.mimeType || 'image/jpeg',
      upsert: false,
    })

  if (error) throw error
  return data
}

export async function removeClothingImage(path) {
  if (!path) return

  const { error } = await supabase.storage
    .from(CLOTHING_IMAGE_BUCKET)
    .remove([path])

  if (error) throw error
}

export async function getSignedClothingImageUrls(paths, expiresIn = 3600) {
  if (!paths.length) return new Map()

  const { data, error } = await supabase.storage
    .from(CLOTHING_IMAGE_BUCKET)
    .createSignedUrls(paths, expiresIn)

  if (error) throw error

  return new Map(
    (data || [])
      .filter((image) => image.path && image.signedUrl && !image.error)
      .map((image) => [image.path, image.signedUrl]),
  )
}

export function getFirstClothingImageUrl(images, imageUrls) {
  return (images || [])
    .map((image) => imageUrls.get(image.file_path))
    .find(Boolean) || null
}
