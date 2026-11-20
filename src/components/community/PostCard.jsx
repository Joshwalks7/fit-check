import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import CommentSection from '../CommentSection.jsx'

function initials(name = '') {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

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

function PostImage({ uri }) {
  const [aspectRatio, setAspectRatio] = useState(1)
  useEffect(() => {
    Image.getSize(uri, (width, height) => {
      if (width && height) setAspectRatio(width / height)
    }, () => {})
  }, [uri])
  return <Image source={{ uri }} style={[styles.postImage, { aspectRatio }]} resizeMode="contain" />
}

function CommentsModal({ post, onClose, onCommentsChange, onOpenProfile }) {
  return <Modal animationType="fade" transparent visible={!!post} onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={[styles.modal, styles.commentsModal]}>
      <View style={styles.modalHeader}><Text numberOfLines={1} style={styles.modalTitle}>{post?.title}</Text><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{post && <CommentSection postId={post.id} onCommentsChange={onCommentsChange} onOpenProfile={onOpenProfile} />}</ScrollView>
    </View></View>
  </Modal>
}

export function PostComposerModal({ visible, post, onClose, onSaved }) {
  const [image, setImage] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const editing = !!post

  const close = () => { if (!submitting) onClose() }
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return setError('Allow photo access to add an image.')
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!result.canceled) setImage(result.assets[0])
  }
  const submit = async () => {
    if (!title.trim()) return setError('Your post needs a title.')
    setSubmitting(true); setError(null)
    try {
      await onSaved({ image, title: title.trim(), description: description.trim() }, post)
      onClose()
    } catch (err) {
      setError(`Could not ${editing ? 'update' : 'create'} post: ${err.message}`)
    } finally { setSubmitting(false) }
  }

  return <Modal animationType="fade" transparent visible={visible} onRequestClose={close}>
    <View style={styles.backdrop}><View style={styles.modal}>
      <Text style={styles.modalTitle}>{editing ? 'Edit post' : 'Create post'}</Text>
      <Pressable onPress={pickImage} style={styles.imagePicker}>{image || post?.image_url ? <Image source={{ uri: image?.uri || post.image_url }} style={styles.imagePreview} resizeMode="cover" /> : <Text style={styles.pickerText}>＋ Add an image</Text>}</Pressable>
      <Text style={styles.label}>Title</Text><TextInput onChangeText={setTitle} placeholder="Outfit name" placeholderTextColor="#756e7d" style={styles.input} value={title} />
      <Text style={styles.label}>Description</Text><TextInput multiline onChangeText={setDescription} placeholder="Outfit description" placeholderTextColor="#756e7d" style={[styles.input, styles.multiline]} value={description} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}><Pressable onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={submitting} onPress={submit} style={styles.primary}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editing ? 'Save' : 'Post'}</Text>}</Pressable></View>
    </View></View>
  </Modal>
}

export default function PostCard({ post, isOwner, feed, onEdit, onDelete, onOpenProfile }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const previewComments = post.comments || []
  return <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Pressable disabled={!post.user_id || isOwner} onPress={() => onOpenProfile({ id: post.user_id, full_name: post.author_name, avatar_url: post.avatar_url })}>
        {post.avatar_url ? <Image source={{ uri: post.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(post.author_name)}</Text></View>}
      </Pressable>
      <View style={styles.author}><Pressable disabled={!post.user_id || isOwner} onPress={() => onOpenProfile({ id: post.user_id, full_name: post.author_name, avatar_url: post.avatar_url })}><Text numberOfLines={1} style={styles.authorName}>{post.author_name}</Text></Pressable><Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text></View>
    </View>
    {!!post.image_url && <PostImage uri={post.image_url} />}
    <View style={styles.body}><Text style={styles.title}>{post.title}</Text>{!!post.description && <Text style={styles.description}>{post.description}</Text>}
      {!!previewComments.length && <View style={styles.preview}>{previewComments.map((comment) => <Text key={comment.id} numberOfLines={2} style={styles.previewText}><Text style={styles.previewAuthor}>{comment.author_name} </Text>{comment.body}</Text>)}</View>}
      <View style={styles.actions}><Pressable onPress={() => setCommentsOpen(true)} style={styles.commentButton}><Text style={styles.commentText}>Comment</Text></Pressable>{isOwner && <View style={styles.ownerActions}><Pressable onPress={() => onEdit(post)} style={styles.smallButton}><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={() => onDelete(post)} style={[styles.smallButton, styles.deleteButton]}><Text style={styles.deleteText}>Delete</Text></Pressable></View>}</View>
    </View>
    <CommentsModal post={commentsOpen ? post : null} onClose={() => setCommentsOpen(false)} onCommentsChange={(comments) => feed.updatePostComments(post.id, comments.slice(-2))} onOpenProfile={(profile) => { setCommentsOpen(false); onOpenProfile(profile) }} />
  </View>
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderBottomColor: '#e7e2eb', borderBottomWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, padding: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  avatarText: { color: '#4a2a20', fontSize: 10, fontWeight: '700' },
  author: { flex: 1 }, authorName: { color: '#19171d', fontSize: 13, fontWeight: '700' }, timestamp: { color: '#756e7d', fontSize: 10, marginTop: 2 },
  postImage: { backgroundColor: '#ded3fb', width: '100%' }, body: { padding: 12 }, title: { color: '#19171d', fontSize: 15, fontWeight: '700' }, description: { color: '#19171d', fontSize: 13, lineHeight: 18, marginTop: 4 },
  preview: { borderTopColor: '#f0ecf3', borderTopWidth: 1, gap: 3, marginTop: 9, paddingTop: 7 }, previewText: { color: '#19171d', fontSize: 12, lineHeight: 16 }, previewAuthor: { fontWeight: '700' },
  actions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, commentButton: { backgroundColor: '#eee9ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, commentText: { color: '#7651e8', fontSize: 11, fontWeight: '700' }, ownerActions: { flexDirection: 'row', gap: 5 }, smallButton: { backgroundColor: '#f0eef2', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 }, editText: { color: '#756e7d', fontSize: 10, fontWeight: '700' }, deleteButton: { backgroundColor: '#fdecea' }, deleteText: { color: '#c0392b', fontSize: 10, fontWeight: '700' },
  backdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 }, modal: { backgroundColor: '#fff', borderRadius: 20, maxWidth: 420, padding: 18, width: '100%' }, commentsModal: { maxHeight: '80%' }, modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, modalTitle: { color: '#19171d', flex: 1, fontSize: 18, fontWeight: '700', marginBottom: 14 }, close: { color: '#756e7d', fontSize: 26 }, imagePicker: { alignItems: 'center', backgroundColor: '#f0ebff', borderColor: '#d8cdfb', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, height: 160, justifyContent: 'center', overflow: 'hidden' }, imagePreview: { height: '100%', width: '100%' }, pickerText: { color: '#7651e8', fontSize: 13, fontWeight: '700' }, label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14 }, input: { borderColor: '#e7e2eb', borderRadius: 9, borderWidth: 1, color: '#19171d', fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 }, multiline: { minHeight: 80, textAlignVertical: 'top' }, error: { color: '#c0392b', fontSize: 12, marginTop: 12 }, cancel: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 }, cancelText: { color: '#756e7d', fontSize: 13, fontWeight: '700' }, primary: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, minWidth: 80, paddingHorizontal: 14, paddingVertical: 10 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
})
