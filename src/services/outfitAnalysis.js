import { supabase } from '../lib/supabase.js'

const BUCKET = 'outfit-analysis-temp'

function fileExtension(image) {
  const mimeExtension = image.mimeType?.split('/')[1]
  return mimeExtension === 'jpeg' ? 'jpg' : mimeExtension || 'jpg'
}

export async function uploadAnalysisImage(userId, image) {
  if (!userId) throw new Error('You must be signed in to analyze an outfit.')
  if (!image?.uri) throw new Error('Choose an outfit photo before analyzing it.')

  const extension = fileExtension(image)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const body = await (await fetch(image.uri)).arrayBuffer()
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: image.mimeType || 'image/jpeg',
    upsert: false,
  })

  if (error) {
    const response = error.context
    if (response?.json) {
      let body = null
      try {
        body = await response.json()
      } catch {
        // Keep the original FunctionsHttpError when the response is not JSON.
      }
      if (body?.error) throw new Error(body.error)
    }
    throw error
  }
  return path
}

export async function removeAnalysisImage(path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export async function analyzeOutfitImage(storagePath, mimeType = 'image/jpeg') {
  if (!storagePath) throw new Error('An outfit analysis image is required.')

  const { data, error } = await supabase.functions.invoke('analyze-outfit', {
    body: { mimeType, storagePath },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
