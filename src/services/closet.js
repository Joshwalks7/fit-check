import { supabase } from '../lib/supabase.js'
import { getFirstClothingImageUrl, getSignedClothingImageUrls } from './clothingImages.js'

function daysSince(dateValue) {
  if (!dateValue) return null

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const wornDate = new Date(`${dateValue}T00:00:00`)
  return Math.max(0, Math.floor((todayStart - wornDate) / 86400000))
}

export async function fetchClosetItemsWithWearStats() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Please sign in to view your closet.')

  const rows = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('clothing_items')
      .select('id, name, description, category, color, brand, size, seasons, styles, clothing_item_images(file_path)')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }

  const { data: outfits, error: outfitsError } = await supabase
    .from('outfits')
    .select('id, worn_on')
    .eq('user_id', user.id)

  if (outfitsError) throw outfitsError

  const outfitIds = (outfits || []).map((outfit) => outfit.id)
  const { data: outfitItems, error: outfitItemsError } = outfitIds.length
    ? await supabase
      .from('outfit_items')
      .select('outfit_id, clothing_item_id')
      .in('outfit_id', outfitIds)
    : { data: [], error: null }

  if (outfitItemsError) throw outfitItemsError

  const wornOnByOutfitId = new Map((outfits || []).map((outfit) => [outfit.id, outfit.worn_on]))
  const statsByItemId = new Map()

  for (const link of outfitItems || []) {
    const wornOn = wornOnByOutfitId.get(link.outfit_id)
    if (!wornOn) continue

    const current = statsByItemId.get(link.clothing_item_id) || { wearCount: 0, lastWorn: null }
    current.wearCount += 1
    if (!current.lastWorn || wornOn > current.lastWorn) current.lastWorn = wornOn
    statsByItemId.set(link.clothing_item_id, current)
  }

  const paths = [...new Set(rows.flatMap((item) => (
    item.clothing_item_images || []
  ).map((image) => image.file_path).filter(Boolean)))]
  let imageUrls = new Map()

  try {
    imageUrls = await getSignedClothingImageUrls(paths)
  } catch (error) {
    console.warn('Closet image loading failed:', error)
  }

  return rows.map((item) => {
    const stats = statsByItemId.get(item.id) || { wearCount: 0, lastWorn: null }
    const imageUrl = getFirstClothingImageUrl(item.clothing_item_images, imageUrls)

    return {
      ...item,
      imageUrl,
      wearCount: stats.wearCount,
      lastWorn: stats.lastWorn,
      daysSinceWorn: daysSince(stats.lastWorn),
    }
  })
}
