import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'outfit-analysis-temp'
const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_GEMINI_ATTEMPTS = 3
const RETRYABLE_GEMINI_STATUSES = new Set([429, 503])
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function getPublishableKey() {
  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (keys) return JSON.parse(keys).default
  return Deno.env.get('SUPABASE_ANON_KEY')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function responseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      matches: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            clothing_item_id: { type: 'STRING' },
            role: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            reason: { type: 'STRING' },
          },
          required: ['clothing_item_id', 'role', 'confidence', 'reason'],
        },
      },
      unmatched_garments: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            role: { type: 'STRING' },
            reason: { type: 'STRING' },
          },
          required: ['role', 'reason'],
        },
      },
    },
    required: ['matches', 'unmatched_garments'],
  }
}

function validateMatches(result: any, closetItems: Array<{ id: string }>) {
  const allowedIds = new Set(closetItems.map((item) => item.id))
  const seenIds = new Set<string>()
  const matches = Array.isArray(result?.matches) ? result.matches
    .filter((match: any) => {
      if (!allowedIds.has(match.clothing_item_id) || seenIds.has(match.clothing_item_id)) return false
      seenIds.add(match.clothing_item_id)
      return true
    })
    .map((match: any) => ({
      ...match,
      confidence: Math.max(0, Math.min(1, Number(match.confidence) || 0)),
    })) : []

  return {
    matches,
    unmatched_garments: Array.isArray(result?.unmatched_garments) ? result.unmatched_garments : [],
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST for outfit analysis.' }, 405)

  const authHeader = request.headers.get('Authorization')
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = getPublishableKey()
  if (!authHeader || !apiKey || !supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: 'Outfit analysis is not configured.' }, 500)
  }

  let storagePath = ''
  try {
    const body = await request.json()
    storagePath = body.storagePath || ''
    const mimeType = body.mimeType || 'image/jpeg'
    if (!storagePath) return jsonResponse({ error: 'A temporary image path is required.' }, 400)

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'You must be signed in to analyze an outfit.' }, 401)
    if (storagePath.split('/')[0] !== user.id) return jsonResponse({ error: 'You do not own this analysis image.' }, 403)

    const { data: image, error: imageError } = await supabase.storage.from(BUCKET).download(storagePath)
    if (imageError || !image) return jsonResponse({ error: 'The temporary outfit image could not be loaded.' }, 400)

    const { data: closetItems, error: closetError } = await supabase
      .from('clothing_items')
      .select('id, name, category, color, brand, description')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (closetError) return jsonResponse({ error: 'Your closet could not be loaded for analysis.' }, 500)
    if (!closetItems?.length) return jsonResponse({ matches: [], unmatched_garments: [], message: 'Add closet items before using outfit analysis.' })

    const imageBytes = new Uint8Array(await image.arrayBuffer())
    const closetCatalog = closetItems.map(({ id, name, category, color, brand, description }) => ({ id, name, category, color, brand, description }))
    const prompt = [
      'Analyze the outfit photo and suggest matching items from the supplied closet catalog.',
      'Only return clothing_item_id values that appear in the catalog.',
      'Do not guess when the photo is unclear. Put unclear garments in unmatched_garments.',
      'The confidence value must be between 0 and 1.',
      `Closet catalog: ${JSON.stringify(closetCatalog)}`,
    ].join('\n')
    const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
    const requestBody = JSON.stringify({
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { data: bytesToBase64(imageBytes), mime_type: mimeType } },
      ] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: responseSchema() },
    })

    let geminiResponse: Response | null = null
    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
      geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        body: requestBody,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (geminiResponse.ok || !RETRYABLE_GEMINI_STATUSES.has(geminiResponse.status) || attempt === MAX_GEMINI_ATTEMPTS) break

      const delay = attempt * 1000
      console.warn(`Gemini returned ${geminiResponse.status}; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_GEMINI_ATTEMPTS})`)
      await wait(delay)
    }

    if (!geminiResponse?.ok) {
      const status = geminiResponse?.status || 502
      const details = await geminiResponse?.text()
      console.error('Gemini request failed:', status, details?.slice(0, 1000))

      if (RETRYABLE_GEMINI_STATUSES.has(status)) {
        return jsonResponse({ error: 'Gemini is busy right now. Please try again in a moment.' }, 503)
      }

      let reason = 'Gemini could not analyze this outfit photo.'
      try {
        const parsed = JSON.parse(details || '')
        const apiMessage = parsed.error?.message
        if (apiMessage) reason = `Gemini rejected the analysis request: ${apiMessage}`
      } catch {
        // Keep the user-facing fallback when Gemini does not return JSON.
      }
      return jsonResponse({ error: reason }, 502)
    }

    const geminiResult = await geminiResponse.json()
    const text = geminiResult.candidates?.[0]?.content?.parts?.find((part: any) => part.text)?.text
    if (!text) return jsonResponse({ error: 'Gemini returned no usable outfit analysis.' }, 502)
    return jsonResponse(validateMatches(JSON.parse(text), closetItems))
  } catch (error) {
    console.error('Outfit analysis failed:', error instanceof Error ? error.message : 'Unknown error')
    return jsonResponse({ error: 'Outfit analysis failed. You can continue by selecting items manually.' }, 500)
  } finally {
    if (storagePath && authHeader && supabaseUrl && supabaseKey) {
      const cleanupClient = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } })
      await cleanupClient.storage.from(BUCKET).remove([storagePath]).catch(() => {})
    }
  }
})
