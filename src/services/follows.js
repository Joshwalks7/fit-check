import { supabase } from '../lib/supabase.js'

const TABLE = 'follows'

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('You must be signed in.')
  return user
}

export async function isFollowing(userId) {
  const currentUser = await getCurrentUser()
  const { data, error } = await supabase
    .from(TABLE)
    .select('id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function followUser(userId) {
  const currentUser = await getCurrentUser()
  const { error } = await supabase
    .from(TABLE)
    .insert({ follower_id: currentUser.id, following_id: userId })

  if (error) throw error
}

export async function unfollowUser(userId) {
  const currentUser = await getCurrentUser()
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('follower_id', currentUser.id)
    .eq('following_id', userId)

  if (error) throw error
}

export async function getFollowerCount(userId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId)

  if (error) throw error
  return count || 0
}

export async function getFollowingCount(userId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) throw error
  return count || 0
}

