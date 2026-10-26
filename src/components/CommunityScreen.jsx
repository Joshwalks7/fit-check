import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { createPost, fetchPosts } from '../services/posts.js'

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

function PostCard({ post }) {
  const [showCommentNote, setShowCommentNote] = useState(false)
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {post.avatar_url ? (
          <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(post.author_name)}</Text></View>
        )}
        <View style={styles.authorInfo}>
          <Text numberOfLines={1} style={styles.authorName}>{post.author_name}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
        </View>
      </View>
      {!!post.image_url && <PostImage uri={post.image_url} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardTitle}>{post.title}</Text>
        {!!post.description && <Text numberOfLines={3} style={styles.cardDescription}>{post.description}</Text>}
        <Pressable accessibilityRole="button" onPress={() => setShowCommentNote(true)} style={styles.commentButton}>
          <Text style={styles.commentText}>💬 Add comment</Text>
        </Pressable>
        {showCommentNote && <Text style={styles.commentNote}>Comments coming soon</Text>}
      </View>
    </View>
  )
}

function CreatePostModal({ visible, onClose, onCreated }) {
  const [image, setImage] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

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
      const post = await createPost({ image, title: title.trim(), description: description.trim() })
      onCreated(post)
      reset()
      onClose()
    } catch (err) {
      setError(`Could not create post: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Create post</Text>

          <Pressable accessibilityRole="button" onPress={pickImage} style={styles.imagePicker}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
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
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postText}>Post</Text>}
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
  const { width } = useWindowDimensions()
  const columnCount = Math.max(2, Math.floor((width - SCREEN_PADDING * 2 + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP)))

  const loadPosts = useCallback(() => fetchPosts()
    .then((data) => {
      setError(null)
      setPosts(data)
    })
    .catch((err) => setError(err.message)), [])

  useEffect(() => {
    loadPosts().finally(() => setLoading(false))
  }, [loadPosts])

  const refresh = async () => {
    setRefreshing(true)
    await loadPosts()
    setRefreshing(false)
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
        {posts.length ? (
          <View style={styles.grid}>
            {toColumns(posts, columnCount).map((column, index) => (
              <View key={index} style={styles.column}>
                {column.map((post) => <PostCard key={post.id} post={post} />)}
              </View>
            ))}
          </View>
        ) : loading
          ? <ActivityIndicator color="#7651e8" style={styles.loader} />
          : <Text style={styles.emptyText}>{error ? `Couldn't load posts: ${error}` : 'No posts yet. Be the first to share a fit!'}</Text>}
      </ScrollView>
      <CreatePostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(post) => setPosts((current) => [post, ...current])}
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
  authorName: { color: '#19171d', fontSize: 11, fontWeight: '700' },
  timestamp: { color: '#756e7d', fontSize: 9, marginTop: 1 },
  cardImage: { backgroundColor: '#ded3fb', width: '100%' },
  cardBody: { paddingHorizontal: 8, paddingVertical: 8 },
  cardTitle: { color: '#19171d', fontSize: 13, fontWeight: '700' },
  cardDescription: { color: '#19171d', fontSize: 11, lineHeight: 15, marginTop: 3 },
  commentButton: { alignSelf: 'flex-start', backgroundColor: '#eee9ff', borderRadius: 8, marginTop: 7, paddingHorizontal: 8, paddingVertical: 5 },
  commentText: { color: '#7651e8', fontSize: 10, fontWeight: '700' },
  commentNote: { color: '#756e7d', fontSize: 10, marginTop: 5 },
  errorText: { color: '#c0392b', fontSize: 12, marginTop: 12 },
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
