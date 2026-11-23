import { useCallback, useEffect, useState } from 'react'
import { fetchCommentPreviews } from '../services/comments.js'
import { getCurrentUser, getFollowingIds } from '../services/follows.js'
import { searchProfiles } from '../services/profile.js'
import { createPost, deletePost, fetchPosts, updatePost } from '../services/posts.js'

export const DEFAULT_FILTERS = { audience: 'all', date: 'any' }

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'following', label: 'Following only' },
]

export const DATE_OPTIONS = [
  { value: 'any', label: 'Any time', ms: null },
  { value: 'day', label: 'Past 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: 'week', label: 'Past week', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: 'month', label: 'Past month', ms: 30 * 24 * 60 * 60 * 1000 },
]

function applyFilters(posts, filters, followingIds) {
  const cutoffMs = DATE_OPTIONS.find((option) => option.value === filters.date)?.ms
  const since = cutoffMs ? Date.now() - cutoffMs : null
  const following = new Set(followingIds)
  return posts.filter((post) => (
    (filters.audience !== 'following' || following.has(post.user_id))
    && (!since || new Date(post.created_at).getTime() >= since)
  ))
}

export function useCommunityFeed({ refreshKey = 0 } = {}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [followingIds, setFollowingIds] = useState([])
  const [followingError, setFollowingError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const fetchCommunityPosts = useCallback(async () => {
    const data = await fetchPosts()
    const previews = await fetchCommentPreviews(data.map((post) => post.id)).catch(() => ({}))
    return data.map((post) => ({ ...post, comments: previews[post.id] || [] }))
  }, [])

  const loadPosts = useCallback(async () => {
    setPosts(await fetchCommunityPosts())
    setError(null)
  }, [fetchCommunityPosts])

  const loadFollowing = useCallback(async () => {
    try {
      setFollowingIds(await getFollowingIds())
      setFollowingError(null)
    } catch (err) {
      setFollowingError(err.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        const nextPosts = await fetchCommunityPosts()
        if (!cancelled) setPosts(nextPosts)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }

      try {
        const user = await getCurrentUser()
        if (!cancelled) setCurrentUserId(user.id)
      } catch {
        // A missing user is handled by the authenticated app shell.
      }
    }

    initialize()
    return () => { cancelled = true }
  }, [fetchCommunityPosts])

  useEffect(() => {
    if (!refreshKey) return undefined
    let cancelled = false

    fetchCommunityPosts()
      .then((nextPosts) => {
        if (!cancelled) {
          setPosts(nextPosts)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => { cancelled = true }
  }, [fetchCommunityPosts, refreshKey])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadPosts()
      if (filters.audience === 'following') await loadFollowing()
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }, [filters.audience, loadFollowing, loadPosts])

  const searchUsers = useCallback(async (query) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      setSearchResults(await searchProfiles(normalizedQuery))
    } catch (err) {
      setSearchError(err.message)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) return undefined
    const timeout = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, searchUsers])

  const chooseFilters = (next) => {
    setFilters(next)
    if (next.audience === 'following') loadFollowing()
  }

  const visiblePosts = applyFilters(posts, filters, followingIds)
  const updatePostComments = (postId, comments) => {
    setPosts((current) => current.map((post) => (post.id === postId ? { ...post, comments } : post)))
  }
  const savePost = async (fields, editingPost = null) => {
    const saved = editingPost ? await updatePost(editingPost.id, fields) : await createPost(fields)
    setPosts((current) => editingPost
      ? current.map((post) => post.id === saved.id ? { ...saved, comments: post.comments } : post)
      : [{ ...saved, comments: [] }, ...current])
    return saved
  }
  const removePost = async (post) => {
    await deletePost(post.id)
    setPosts((current) => current.filter((item) => item.id !== post.id))
  }

  return {
    posts,
    visiblePosts,
    loading,
    refreshing,
    error,
    currentUserId,
    filters,
    followingError,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    searchError,
    searchUsers,
    chooseFilters,
    setFilters,
    refresh,
    loadPosts,
    updatePostComments,
    savePost,
    removePost,
  }
}
