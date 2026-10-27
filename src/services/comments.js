import { supabase } from '../lib/supabase.js'

const TABLE = 'comments'
const PROFILE_TABLE = 'profiles'

async function addProfileImages(rows) {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
  if (!userIds.length) return rows

  const { data: profiles, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id, avatar_url')
    .in('id', userIds)
  if (error) throw error

  const avatarByUserId = Object.fromEntries(profiles.map((profile) => [profile.id, profile.avatar_url]))
  return rows.map((row) => ({ ...row, avatar_url: avatarByUserId[row.user_id] || null }))
}

export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return addProfileImages(data)
}

export async function fetchCommentPreviews(postIds, perPost = 2) {
  if (!postIds.length) return {}

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: false })
  if (error) throw error

  const previews = {}
  data.forEach((row) => {
    previews[row.post_id] = previews[row.post_id] || []
    if (previews[row.post_id].length < perPost) previews[row.post_id].unshift(row)
  })
  return previews
}

export async function addComment(postId, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to comment.')

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      post_id: postId,
      user_id: user.id,
      author_name: user.user_metadata?.full_name || user.email,
      body,
    })
    .select()
    .single()
  if (error) throw error
  return (await addProfileImages([data]))[0]
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', commentId)
  if (error) throw error
}
