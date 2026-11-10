import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { addComment, deleteComment, fetchComments, updateComment } from '../services/comments.js'
import { getCurrentUser } from '../services/follows.js'

const MAX_LENGTH = 500

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

function CommentSection({ postId, onCommentsChange, onOpenProfile }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchComments(postId)
      .then((data) => {
        if (!cancelled) setComments(data)
      })
      .catch((err) => {
        if (!cancelled) setError(`Couldn't load comments: ${err.message}`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [postId])

  useEffect(() => {
    getCurrentUser().then((user) => setCurrentUserId(user.id)).catch(() => {})
  }, [])

  const submit = async () => {
    const text = body.trim()
    if (!text || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const comment = await addComment(postId, text)
      const next = [...comments, comment]
      setComments(next)
      onCommentsChange?.(next)
      setBody('')
    } catch (err) {
      setError(`Could not add comment: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (comment) => {
    setError(null)
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  const cancelEdit = () => {
    if (saving) return
    setEditingId(null)
    setEditBody('')
  }

  const saveEdit = async () => {
    const text = editBody.trim()
    if (!text || saving) return
    const original = comments.find((comment) => comment.id === editingId)
    if (text === original?.body) {
      cancelEdit()
      return
    }
    setError(null)
    setSaving(true)
    try {
      const updated = await updateComment(editingId, text)
      const next = comments.map((comment) => (comment.id === editingId ? { ...comment, body: updated.body } : comment))
      setComments(next)
      onCommentsChange?.(next)
      setEditingId(null)
      setEditBody('')
    } catch (err) {
      setError(`Could not edit comment: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (commentId) => {
    setError(null)
    try {
      await deleteComment(commentId)
      const next = comments.filter((comment) => comment.id !== commentId)
      setComments(next)
      onCommentsChange?.(next)
    } catch (err) {
      setError(`Could not delete comment: ${err.message}`)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Comments{comments.length ? ` (${comments.length})` : ''}</Text>

      {loading ? (
        <ActivityIndicator color="#7651e8" style={styles.loader} />
      ) : !comments.length ? (
        <Text style={styles.emptyText}>No comments yet. Start the conversation!</Text>
      ) : (
        comments.map((comment) => {
          const canOpenProfile = !!onOpenProfile && !!comment.user_id && comment.user_id !== currentUserId
          const openProfile = () => onOpenProfile({ id: comment.user_id, full_name: comment.author_name, avatar_url: comment.avatar_url })
          return (
          <View key={comment.id} style={styles.comment}>
            <Pressable
              accessibilityLabel={`Open ${comment.author_name || 'user'} profile`}
              accessibilityRole={canOpenProfile ? 'button' : undefined}
              disabled={!canOpenProfile}
              onPress={openProfile}
            >
              {comment.avatar_url ? (
                <Image source={{ uri: comment.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(comment.author_name)}</Text></View>
              )}
            </Pressable>
            <View style={styles.commentContent}>
              <View style={styles.commentMeta}>
                <Pressable
                  accessibilityRole={canOpenProfile ? 'button' : undefined}
                  disabled={!canOpenProfile}
                  onPress={openProfile}
                  style={styles.authorNameTarget}
                >
                  <Text numberOfLines={1} style={styles.authorName}>{comment.author_name}</Text>
                </Pressable>
                <Text style={styles.timestamp}>{formatTimestamp(comment.created_at)}</Text>
                {comment.user_id === currentUserId && (
                  <Pressable accessibilityLabel="Delete comment" accessibilityRole="button" onPress={() => remove(comment.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                )}
              </View>
              {editingId === comment.id ? (
                <View>
                  <TextInput
                    autoFocus
                    maxLength={MAX_LENGTH}
                    multiline
                    onChangeText={setEditBody}
                    style={[styles.input, styles.editInput]}
                    value={editBody}
                  />
                  <View style={styles.editActions}>
                    <Pressable accessibilityRole="button" disabled={saving} onPress={cancelEdit}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!editBody.trim() || saving}
                      onPress={saveEdit}
                      style={[styles.saveButton, (!editBody.trim() || saving) && styles.disabled]}
                    >
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
                    </Pressable>
                  </View>
                </View>
              ) : comment.user_id === currentUserId ? (
                <Pressable accessibilityHint="Tap to edit your comment" accessibilityRole="button" onPress={() => startEdit(comment)}>
                  <Text style={styles.body}>{comment.body}</Text>
                </Pressable>
              ) : (
                <Text style={styles.body}>{comment.body}</Text>
              )}
            </View>
          </View>
          )
        })
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          maxLength={MAX_LENGTH}
          multiline
          onChangeText={setBody}
          placeholder="Add a comment"
          placeholderTextColor="#756e7d"
          style={styles.input}
          value={body}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!body.trim() || submitting}
          onPress={submit}
          style={[styles.sendButton, (!body.trim() || submitting) && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Post</Text>}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 14 },
  heading: { color: '#19171d', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  loader: { marginVertical: 12 },
  emptyText: { color: '#756e7d', fontSize: 12, marginBottom: 8 },
  comment: { flexDirection: 'row', gap: 8, paddingVertical: 7 },
  avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  avatarText: { color: '#4a2a20', fontSize: 10, fontWeight: '700' },
  commentContent: { flex: 1 },
  commentMeta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  authorNameTarget: { flexShrink: 1 },
  authorName: { color: '#19171d', flexShrink: 1, fontSize: 12, fontWeight: '700' },
  timestamp: { color: '#756e7d', fontSize: 10 },
  deleteText: { color: '#c0392b', fontSize: 10, fontWeight: '600' },
  body: { color: '#19171d', fontSize: 13, lineHeight: 18, marginTop: 2 },
  editInput: { flex: 0, fontSize: 13, marginTop: 4 },
  editActions: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 6 },
  cancelText: { color: '#756e7d', fontSize: 12, fontWeight: '700' },
  saveButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 8, justifyContent: 'center', minHeight: 28, minWidth: 52, paddingHorizontal: 10 },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorText: { color: '#c0392b', fontSize: 12, marginTop: 8 },
  inputRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 10 },
  input: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 9, borderWidth: 1, color: '#19171d', flex: 1, fontSize: 14, maxHeight: 100, paddingHorizontal: 11, paddingVertical: 9 },
  sendButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 9, justifyContent: 'center', minHeight: 38, minWidth: 60, paddingHorizontal: 12 },
  sendText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
})

export default CommentSection
