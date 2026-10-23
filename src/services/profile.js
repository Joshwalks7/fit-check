import { supabase } from '../lib/supabase.js'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function uploadAvatar(user, image) {
  try {
    const response = await fetch(image.uri)
    const imageData = await response.arrayBuffer()
    const extension = image.mimeType?.split('/')[1] || 'jpg'
    const contentType = image.mimeType || 'image/jpeg'
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageData, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select('avatar_url')
      .single()

    if (profileError) {
      throw new Error(`Profile update: ${profileError.message}`)
    }

    const { data: previousAvatars, error: listError } = await supabase.storage
      .from('avatars')
      .list(user.id)

    if (listError) {
      throw new Error(`Avatar cleanup: ${listError.message}`)
    }

    const oldAvatarPaths = previousAvatars
      .filter((file) => file.name !== filePath.split('/').pop())
      .map((file) => `${user.id}/${file.name}`)

    if (oldAvatarPaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove(oldAvatarPaths)

      if (deleteError) {
        throw new Error(`Avatar cleanup: ${deleteError.message}`)
      }
    }

    return avatarUrl
  } catch (error) {
    throw new Error(error.message || 'Unknown avatar upload error')
  }
}
