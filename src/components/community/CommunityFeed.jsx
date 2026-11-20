import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useCommunityFeed } from '../../hooks/useCommunityFeed.js'
import FilterModal from './FilterModal.jsx'
import FeedToolbar from './FeedToolbar.jsx'
import PostCard, { PostComposerModal } from './PostCard.jsx'

function DeleteModal({ post, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  if (!post) return null
  const confirm = async () => { setDeleting(true); setError(null); try { await onDelete(post); onClose() } catch (err) { setError(`Could not delete post: ${err.message}`) } finally { setDeleting(false) } }
  return <View style={styles.deleteBackdrop}><View style={styles.deleteCard}><Text style={styles.deleteTitle}>Delete post?</Text><Text style={styles.deleteBody}>“{post.title}” will be removed for everyone.</Text>{error && <Text style={styles.error}>{error}</Text>}<View style={styles.actions}><Pressable disabled={deleting} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={deleting} onPress={confirm} style={styles.deleteButton}>{deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>Delete</Text>}</Pressable></View></View></View>
}

export default function CommunityFeed({ header, onOpenProfile, onPostSaved, onRefreshReady, refreshKey = 0 }) {
  const feed = useCommunityFeed({ refreshKey })
  const [showCreate, setShowCreate] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [deletingPost, setDeletingPost] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const refresh = async () => { await feed.refresh(); onRefreshReady?.() }
  const savePost = async (fields, editing) => {
    const saved = await feed.savePost(fields, editing)
    onPostSaved?.(saved)
  }
  return <View style={styles.container}>
    <FlatList
      contentContainerStyle={styles.content}
      data={feed.visiblePosts}
      keyExtractor={(post) => post.id}
      ListHeaderComponent={<View style={styles.headerContent}>{header}<FeedToolbar feed={feed} onCreate={() => setShowCreate(true)} onFilter={() => setShowFilters(true)} onOpenProfile={onOpenProfile} />{feed.followingError && feed.filters.audience === 'following' && <Text style={styles.error}>Couldn’t load who you follow: {feed.followingError}</Text>}</View>}
      ListEmptyComponent={feed.loading ? <ActivityIndicator color="#7651e8" style={styles.loader} /> : <View style={styles.emptyContainer}><Text style={styles.empty}>{feed.error ? `Couldn’t load posts: ${feed.error}` : feed.posts.length ? 'No posts match these filters.' : 'No posts yet. Be the first to share a fit!'}</Text>{!feed.error && feed.posts.length > 0 && <Pressable onPress={() => feed.setFilters({ audience: 'all', date: 'any' })} style={styles.clear}><Text style={styles.clearText}>Clear filters</Text></Pressable>}</View>}
      onRefresh={refresh}
      refreshing={feed.refreshing}
      renderItem={({ item }) => <PostCard feed={feed} isOwner={!!feed.currentUserId && item.user_id === feed.currentUserId} onDelete={setDeletingPost} onEdit={setEditingPost} onOpenProfile={onOpenProfile} post={item} />}
      showsVerticalScrollIndicator={false}
    />
    <PostComposerModal key={showCreate ? 'create-open' : 'create-closed'} visible={showCreate} onClose={() => setShowCreate(false)} onSaved={savePost} />
    <PostComposerModal key={editingPost?.id} post={editingPost} visible={!!editingPost} onClose={() => setEditingPost(null)} onSaved={savePost} />
    <FilterModal visible={showFilters} filters={feed.filters} onClose={() => setShowFilters(false)} onApply={(next) => { feed.chooseFilters(next); setShowFilters(false) }} />
    <DeleteModal post={deletingPost} onClose={() => setDeletingPost(null)} onDelete={feed.removePost} />
  </View>
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { paddingBottom: 24, paddingTop: 22 }, headerContent: { paddingHorizontal: 18 }, loader: { marginTop: 40 }, emptyContainer: { paddingHorizontal: 18 }, empty: { color: '#756e7d', fontSize: 12, paddingVertical: 20, textAlign: 'center' }, clear: { alignSelf: 'center', backgroundColor: '#eee9ff', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }, clearText: { color: '#7651e8', fontSize: 12, fontWeight: '700' }, error: { color: '#c0392b', fontSize: 12, marginBottom: 12 }, deleteBackdrop: { alignItems: 'center', backgroundColor: '#19171d99', bottom: 0, justifyContent: 'center', left: 0, padding: 20, position: 'absolute', right: 0, top: 0 }, deleteCard: { backgroundColor: '#fff', borderRadius: 20, maxWidth: 380, padding: 18, width: '100%' }, deleteTitle: { color: '#19171d', fontSize: 18, fontWeight: '700' }, deleteBody: { color: '#19171d', fontSize: 13, marginTop: 10 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }, cancel: { paddingHorizontal: 14, paddingVertical: 10 }, cancelText: { color: '#756e7d', fontSize: 13, fontWeight: '700' }, deleteButton: { backgroundColor: '#c0392b', borderRadius: 11, minWidth: 80, paddingHorizontal: 14, paddingVertical: 10 }, deleteText: { color: '#fff', fontSize: 13, fontWeight: '700' }, })
