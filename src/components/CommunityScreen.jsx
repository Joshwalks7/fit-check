import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { createPost, deletePost, fetchPosts, updatePost } from '../services/posts.js'
import { searchProfiles } from '../services/profile.js'
import { getCurrentUser, getFollowingIds } from '../services/follows.js'
import { fetchCommentPreviews } from '../services/comments.js'
import CommentSection from './CommentSection.jsx'
import ProfileScreen from './ProfileScreen.jsx'

function formatTimestamp(value) {
  const date = new Date(value)
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function initials(name = '') {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

const SCREEN_PADDING = 18
const COLUMN_GAP = 10
const MIN_COLUMN_WIDTH = 160

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'following', label: 'Following only' },
]
const DATE_OPTIONS = [
  { value: 'any', label: 'Any time', ms: null },
  { value: 'day', label: 'Past 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: 'week', label: 'Past week', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: 'month', label: 'Past month', ms: 30 * 24 * 60 * 60 * 1000 },
]
const DEFAULT_FILTERS = { audience: 'all', date: 'any' }

function activeFilterCount(filters) {
  return Object.keys(DEFAULT_FILTERS).filter((key) => filters[key] !== DEFAULT_FILTERS[key]).length
}

function applyFilters(posts, filters, followingIds) {
  const cutoffMs = DATE_OPTIONS.find((option) => option.value === filters.date)?.ms
  const since = cutoffMs ? Date.now() - cutoffMs : null
  const following = new Set(followingIds)
  return posts.filter((post) => (
    (filters.audience !== 'following' || following.has(post.user_id))
    && (!since || new Date(post.created_at).getTime() >= since)
  ))
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: value === option.value }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, value === option.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === option.value && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  )
}

function FilterModal({ visible, filters, onClose, onApply }) {
  const [draft, setDraft] = useState(filters)
  const set = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Filter posts</Text>
            <Pressable accessibilityLabel="Close filters" accessibilityRole="button" onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <OptionGroup label="Show" options={AUDIENCE_OPTIONS} value={draft.audience} onChange={set('audience')} />
          <OptionGroup label="Posted" options={DATE_OPTIONS} value={draft.date} onChange={set('date')} />
          <View style={styles.modalActions}>
            <Pressable onPress={() => setDraft(DEFAULT_FILTERS)} style={styles.cancelButton}><Text style={styles.cancelText}>Reset</Text></Pressable>
            <Pressable onPress={() => onApply(draft)} style={styles.postButton}><Text style={styles.postText}>Apply</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// deal posts left to right into columns so the newest stay on top
function toColumns(posts, count) {
  const columns = Array.from({ length: count }, () => [])
  posts.forEach((post, index) => columns[index % count].push(post))
  return columns
}

// full image at its natural aspect ratio so the card fits the photo
function PostImage({ uri }) {
  const [aspectRatio, setAspectRatio] = useState(1)

  useEffect(() => {
    Image.getSize(uri, (width, height) => {
      if (width && height) setAspectRatio(width / height)
    }, () => {})
  }, [uri])

  return <Image source={{ uri }} style={[styles.cardImage, { aspectRatio }]} resizeMode="contain" />
}

function CommentsModal({ post, onClose, onCommentsChange, onOpenProfile }) {
  return (
    <Modal animationType="fade" transparent visible={!!post} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.commentsModal]}>
          <View style={styles.commentsHeader}>
            <Text numberOfLines={1} style={styles.commentsTitle}>{post?.title}</Text>
            <Pressable accessibilityLabel="Close comments" accessibilityRole="button" onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {post && <CommentSection postId={post.id} onCommentsChange={onCommentsChange} onOpenProfile={onOpenProfile} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function PostCard({ post, isOwner, onCommentsChange, onEdit, onDelete, onOpenProfile }) {
  const [showComments, setShowComments] = useState(false)
  const previewComments = post.comments || []
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Pressable
          accessibilityLabel={`Open ${post.author_name || 'user'} profile`}
          accessibilityRole={isOwner ? undefined : 'button'}
          disabled={isOwner || !post.user_id}
          onPress={() => onOpenProfile({ id: post.user_id, full_name: post.author_name, avatar_url: post.avatar_url })}
        >
          {post.avatar_url ? (
            <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(post.author_name)}</Text></View>
          )}
        </Pressable>
        <View style={styles.authorInfo}>
          <Pressable
            accessibilityRole={isOwner ? undefined : 'button'}
            disabled={isOwner || !post.user_id}
            onPress={() => onOpenProfile({ id: post.user_id, full_name: post.author_name, avatar_url: post.avatar_url })}
            style={styles.authorNameTarget}
          >
            <Text numberOfLines={1} style={styles.authorName}>{post.author_name}</Text>
          </Pressable>
          <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
        </View>
      </View>
      {!!post.image_url && <PostImage uri={post.image_url} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardTitle}>{post.title}</Text>
        {!!post.description && <Text numberOfLines={3} style={styles.cardDescription}>{post.description}</Text>}
        {!!previewComments.length && (
          <View style={styles.commentPreview}>
            {previewComments.map((comment) => (
              <Text key={comment.id} numberOfLines={2} style={styles.previewText}>
                <Text style={styles.previewAuthor}>{comment.author_name} </Text>
                {comment.body}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={() => setShowComments(true)} style={styles.commentButton}>
            <Text style={styles.commentText}>Comment</Text>
          </Pressable>
          {isOwner && (
            <View style={styles.ownerActions}>
              <Pressable accessibilityLabel="Edit post" accessibilityRole="button" onPress={() => onEdit(post)} style={styles.smallButton}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable accessibilityLabel="Delete post" accessibilityRole="button" onPress={() => onDelete(post)} style={[styles.smallButton, styles.deleteButton]}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
      <CommentsModal
        post={showComments ? post : null}
        onClose={() => setShowComments(false)}
        onCommentsChange={(comments) => onCommentsChange(post.id, comments.slice(-2))}
        onOpenProfile={(profile) => {
          setShowComments(false)
          onOpenProfile(profile)
        }}
      />
    </View>
  )
}

function DeletePostModal({ post, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    if (deleting) return
    setError(null)
    onClose()
  }

  const confirm = async () => {
    setError(null)
    setDeleting(true)
    try {
      await deletePost(post.id)
      onDeleted(post.id)
      onClose()
    } catch (err) {
      setError(`Could not delete post: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal animationType="fade" transparent visible={!!post} onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Delete post?</Text>
          <Text style={styles.cardDescription}>"{post?.title}" will be removed for everyone. This can't be undone.</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.modalActions}>
            <Pressable onPress={close} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable disabled={deleting} onPress={confirm} style={[styles.postButton, styles.confirmDelete, deleting && styles.disabled]}>
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postText}>Delete</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function PostModal({ visible, post, onClose, onSaved }) {
  const [image, setImage] = useState(null)
  const [title, setTitle] = useState(post?.title || '')
  const [description, setDescription] = useState(post?.description || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const editing = !!post

  const reset = () => {
    setError(null)
    setImage(null)
    setTitle('')
    setDescription('')
  }

  const close = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Allow photo access to add an image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!result.canceled) setImage(result.assets[0])
  }

  const submit = async () => {
    if (!title.trim()) {
      setError('Your post needs a title.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const fields = { image, title: title.trim(), description: description.trim() }
      const saved = editing ? await updatePost(post.id, fields) : await createPost(fields)
      onSaved(saved)
      reset()
      onClose()
    } catch (err) {
      setError(`Could not ${editing ? 'update' : 'create'} post: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{editing ? 'Edit post' : 'Create post'}</Text>

          <Pressable accessibilityRole="button" onPress={pickImage} style={styles.imagePicker}>
            {image || post?.image_url ? (
              <Image source={{ uri: image?.uri || post.image_url }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <>
                <Text style={styles.pickerPlus}>＋</Text>
                <Text style={styles.pickerText}>Add an image</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Title</Text>
          <TextInput onChangeText={setTitle} placeholder="Outfit name" placeholderTextColor="#756e7d" style={styles.input} value={title} />

          <Text style={styles.label}>Description</Text>
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder="Outfit description"
            placeholderTextColor="#756e7d"
            style={[styles.input, styles.multiline]}
            value={description}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.modalActions}>
            <Pressable onPress={close} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable disabled={submitting} onPress={submit} style={[styles.postButton, submitting && styles.disabled]}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postText}>{editing ? 'Save' : 'Post'}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function CommunityScreen() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [deletingPost, setDeletingPost] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [followingIds, setFollowingIds] = useState([])
  const [followingError, setFollowingError] = useState(null)
  const { width } = useWindowDimensions()
  const columnCount = Math.max(2, Math.floor((width - SCREEN_PADDING * 2 + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP)))

  const loadPosts = useCallback(() => fetchPosts()
    .then(async (data) => {
      const previews = await fetchCommentPreviews(data.map((post) => post.id)).catch(() => ({}))
      setError(null)
      setPosts(data.map((post) => ({ ...post, comments: previews[post.id] || [] })))
    })
    .catch((err) => setError(err.message)), [])

  const updatePostComments = (postId, comments) => {
    setPosts((current) => current.map((post) => (post.id === postId ? { ...post, comments } : post)))
  }

  useEffect(() => {
    loadPosts().finally(() => setLoading(false))
  }, [loadPosts])

  useEffect(() => {
    getCurrentUser().then((user) => setCurrentUserId(user.id)).catch(() => {})
  }, [])

  // follows can change on profile screens, so reload them each time the filter needs them
  const loadFollowing = useCallback(() => getFollowingIds()
    .then((ids) => {
      setFollowingIds(ids)
      setFollowingError(null)
    })
    .catch((err) => setFollowingError(err.message)), [])

  const applyFilterChoice = (next) => {
    setFilters(next)
    setShowFilters(false)
    if (next.audience === 'following') loadFollowing()
  }

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([loadPosts(), filters.audience === 'following' ? loadFollowing() : null])
    setRefreshing(false)
  }

  const filterCount = activeFilterCount(filters)
  const visiblePosts = applyFilters(posts, filters, followingIds)

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

    const timeout = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery, searchUsers])

  if (selectedProfile) {
    return (
      <ProfileScreen
        key={selectedProfile.id}
        isPublic
        onBack={() => setSelectedProfile(null)}
        profile={selectedProfile}
        user={{ id: selectedProfile.id }}
      />
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Check your fit</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setShowCreate(true)} style={styles.createButton}>
            <Text style={styles.createButtonText}>＋ Create post</Text>
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchUsers(searchQuery)}
            placeholder="Search people"
            placeholderTextColor="#756e7d"
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          <Pressable accessibilityRole="button" onPress={() => searchUsers(searchQuery)} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={filterCount ? `Filter, ${filterCount} active` : 'Filter'}
            accessibilityRole="button"
            onPress={() => setShowFilters(true)}
            style={[styles.searchButton, filterCount > 0 && styles.filterButtonActive]}
          >
            <Text style={[styles.searchButtonText, filterCount > 0 && styles.filterButtonTextActive]}>
              Filter{filterCount ? ` · ${filterCount}` : ''}
            </Text>
          </Pressable>
        </View>
        {!!followingError && filters.audience === 'following' && (
          <Text style={styles.searchError}>Couldn't load who you follow: {followingError}</Text>
        )}
        {searching && <ActivityIndicator color="#7651e8" style={styles.searchLoader} />}
        {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}
        {!searching && searchQuery.trim() && !searchError && !searchResults.length && (
          <Text style={styles.searchEmpty}>No people found.</Text>
        )}
        {!!searchResults.length && (
          <View style={styles.searchResults}>
            <Text style={styles.searchResultsTitle}>People</Text>
            {searchResults.map((result) => (
              <View key={result.id} style={styles.searchResult}>
                <Pressable
                  accessibilityLabel={`Open ${result.full_name || 'user'} profile`}
                  accessibilityRole={result.id === currentUserId ? undefined : 'button'}
                  disabled={result.id === currentUserId}
                  onPress={() => setSelectedProfile(result)}
                  style={styles.searchProfileTarget}
                >
                  {result.avatar_url ? (
                    <Image source={{ uri: result.avatar_url }} style={styles.searchAvatar} />
                  ) : (
                    <View style={styles.searchAvatar}><Text style={styles.avatarText}>{initials(result.full_name)}</Text></View>
                  )}
                  <Text numberOfLines={1} style={styles.searchName}>{result.full_name || 'Unnamed user'}</Text>
                </Pressable>
                {result.id === currentUserId ? (
                  <Text style={styles.youLabel}>You</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
        {visiblePosts.length ? (
          <View style={styles.grid}>
            {toColumns(visiblePosts, columnCount).map((column, index) => (
              <View key={index} style={styles.column}>
                {column.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isOwner={!!currentUserId && post.user_id === currentUserId}
                    onCommentsChange={updatePostComments}
                    onEdit={setEditingPost}
                    onDelete={setDeletingPost}
                    onOpenProfile={setSelectedProfile}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : loading
          ? <ActivityIndicator color="#7651e8" style={styles.loader} />
          : (
            <View>
              <Text style={styles.emptyText}>
                {error
                  ? `Couldn't load posts: ${error}`
                  : posts.length ? 'No posts match these filters.' : 'No posts yet. Be the first to share a fit!'}
              </Text>
              {!error && posts.length > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setFilters(DEFAULT_FILTERS)} style={styles.clearFilters}>
                  <Text style={styles.searchButtonText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          )}
      </ScrollView>
      <PostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(post) => setPosts((current) => [post, ...current])}
      />
      {editingPost && (
        <PostModal
          key={editingPost.id}
          visible
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(saved) => setPosts((current) => current.map((post) => (
            post.id === saved.id ? { ...saved, comments: post.comments } : post
          )))}
        />
      )}
      {showFilters && (
        <FilterModal
          visible
          filters={filters}
          onClose={() => setShowFilters(false)}
          onApply={applyFilterChoice}
        />
      )}
      <DeletePostModal
        post={deletingPost}
        onClose={() => setDeletingPost(null)}
        onDeleted={(postId) => setPosts((current) => current.filter((post) => post.id !== postId))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: SCREEN_PADDING, paddingTop: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: '#19171d', fontSize: 26, fontWeight: '600', letterSpacing: -0.7 },
  subtitle: { color: '#756e7d', fontSize: 12, marginTop: 5 },
  createButton: { backgroundColor: '#7651e8', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10 },
  createButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loader: { marginTop: 40 },
  emptyText: { color: '#756e7d', fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  grid: { alignItems: 'flex-start', flexDirection: 'row', gap: COLUMN_GAP },
  column: { flex: 1, gap: COLUMN_GAP },
  card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 7 },
  avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  avatarText: { color: '#4a2a20', fontSize: 8, fontWeight: '700' },
  authorInfo: { flex: 1 },
  authorNameTarget: { alignSelf: 'flex-start', maxWidth: '100%' },
  authorName: { color: '#19171d', fontSize: 11, fontWeight: '700' },
  timestamp: { color: '#756e7d', fontSize: 9, marginTop: 1 },
  cardImage: { backgroundColor: '#ded3fb', width: '100%' },
  cardBody: { paddingHorizontal: 8, paddingVertical: 8 },
  cardTitle: { color: '#19171d', fontSize: 13, fontWeight: '700' },
  cardDescription: { color: '#19171d', fontSize: 11, lineHeight: 15, marginTop: 3 },
  cardActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  commentButton: { backgroundColor: '#eee9ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  ownerActions: { flexDirection: 'row', gap: 4 },
  smallButton: { backgroundColor: '#f0eef2', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4 },
  editText: { color: '#756e7d', fontSize: 9, fontWeight: '700' },
  deleteButton: { backgroundColor: '#fdecea' },
  deleteText: { color: '#c0392b', fontSize: 9, fontWeight: '700' },
  confirmDelete: { backgroundColor: '#c0392b' },
  commentText: { color: '#7651e8', fontSize: 10, fontWeight: '700' },
  commentPreview: { borderTopColor: '#f0ecf3', borderTopWidth: 1, gap: 3, marginTop: 7, paddingTop: 6 },
  previewText: { color: '#19171d', fontSize: 10, lineHeight: 14 },
  previewAuthor: { fontWeight: '700' },
  commentsModal: { maxHeight: '80%' },
  commentsHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  commentsTitle: { color: '#19171d', flex: 1, fontSize: 18, fontWeight: '700' },
  closeText: { color: '#756e7d', fontSize: 26, lineHeight: 28 },
  errorText: { color: '#c0392b', fontSize: 12, marginTop: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchInput: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 10, borderWidth: 1, color: '#19171d', flex: 1, fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 },
  searchButton: { backgroundColor: '#eee9ff', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 },
  searchButtonText: { color: '#7651e8', fontSize: 12, fontWeight: '700' },
  searchLoader: { marginBottom: 12 },
  searchError: { color: '#c0392b', fontSize: 12, marginBottom: 12 },
  searchEmpty: { color: '#756e7d', fontSize: 12, marginBottom: 12 },
  searchResults: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 10 },
  searchResultsTitle: { color: '#19171d', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  searchResult: { alignItems: 'center', flexDirection: 'row', paddingVertical: 7 },
  searchProfileTarget: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  searchAvatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  searchName: { color: '#19171d', flex: 1, fontSize: 13, fontWeight: '600', marginLeft: 9 },
  youLabel: { color: '#756e7d', fontSize: 11, fontWeight: '600', paddingHorizontal: 10 },
  filterButtonActive: { backgroundColor: '#7651e8' },
  filterButtonTextActive: { color: '#fff' },
  clearFilters: { alignSelf: 'center', backgroundColor: '#eee9ff', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#f0eef2', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  chipActive: { backgroundColor: '#7651e8' },
  chipText: { color: '#756e7d', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  modalBackdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, maxWidth: 380, padding: 18, width: '100%' },
  modalTitle: { color: '#19171d', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  imagePicker: { alignItems: 'center', backgroundColor: '#f0ebff', borderColor: '#d8cdfb', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, height: 160, justifyContent: 'center', overflow: 'hidden' },
  imagePreview: { height: '100%', width: '100%' },
  pickerPlus: { color: '#7651e8', fontSize: 26 },
  pickerText: { color: '#7651e8', fontSize: 12, fontWeight: '700', marginTop: 4 },
  label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 9, borderWidth: 1, color: '#19171d', fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 18 },
  cancelButton: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: '#756e7d', fontSize: 13, fontWeight: '700' },
  postButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, minWidth: 80, paddingHorizontal: 14, paddingVertical: 10 },
  postText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
})

export default CommunityScreen
