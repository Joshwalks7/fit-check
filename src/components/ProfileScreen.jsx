import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { uploadAvatar } from '../services/profile.js'
import { fetchPostsByUser } from '../services/posts.js'
import { followUser, getFollowerCount, getFollowingCount, isFollowing, unfollowUser } from '../services/follows.js'
import SignOutButton from './SignOutButton.jsx';
import CommentSection from './CommentSection.jsx'

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

function ProfileScreen({ user, profile, setProfile, isPublic = false, onBack }) {
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [postsLoading, setPostsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followCountsLoading, setFollowCountsLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followError, setFollowError] = useState(null)

  useEffect(() => {
    fetchPostsByUser(user.id)
      .then(setPosts)
      .catch((error) => Alert.alert('Could not load posts', error.message))
      .finally(() => setPostsLoading(false))
  }, [user.id])

  useEffect(() => {
    Promise.all([getFollowerCount(user.id), getFollowingCount(user.id)])
      .then(([followers, following]) => {
        setFollowerCount(followers)
        setFollowingCount(following)
      })
      .catch((error) => Alert.alert('Could not load follow counts', error.message))
      .finally(() => setFollowCountsLoading(false))
  }, [user.id])

  useEffect(() => {
    let cancelled = false

    if (!isPublic) return () => { cancelled = true }

    isFollowing(user.id)
      .then((value) => {
        if (!cancelled) setFollowing(value)
      })
      .catch((error) => {
        if (!cancelled) setFollowError(error.message)
      })

    return () => { cancelled = true }
  }, [isPublic, user.id])

  const toggleFollow = async () => {
    setFollowLoading(true)
    setFollowError(null)
    try {
      if (following) {
        await unfollowUser(user.id)
      } else {
        await followUser(user.id)
      }
      setFollowing((current) => !current)
      setFollowerCount((current) => current + (following ? -1 : 1))
    } catch (error) {
      setFollowError(error.message)
    } finally {
      setFollowLoading(false)
    }
  }

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose a profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled) return

    setUploading(true)
    try {
      const avatarUrl = await uploadAvatar(user, result.assets[0])
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }))
    } catch (error) {
      Alert.alert('Upload failed', error.message)
    } finally {
      setUploading(false)
    }
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'Unnamed user'

  const avatarContent = profile?.avatar_url ? (
    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.placeholderText}>{isPublic ? 'No photo' : 'Add photo'}</Text>
    </View>
  )

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.titleRow, !onBack && styles.titleRowCentered]}>
        {onBack ? (
          <Pressable accessibilityLabel="Back to community" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        ) : <View style={styles.backButtonSpacer} />}
        <Text style={styles.title}>Profile</Text>
        <View style={styles.backButtonSpacer} />
      </View>
      {isPublic ? (
        avatarContent
      ) : (
        <Pressable accessibilityRole="button" onPress={chooseAvatar} disabled={uploading}>
          {avatarContent}
        </Pressable>
      )}
      {!isPublic && uploading && <ActivityIndicator style={styles.uploadIndicator} color="#7651e8" />}
      <Text style={styles.name}>{displayName}</Text>
      {!isPublic && <Text style={styles.email}>{user.email}</Text>}
      {!isPublic && <Text style={styles.hint}>Tap your picture to change it</Text>}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{followCountsLoading ? '—' : followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{followCountsLoading ? '—' : followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
      {isPublic && (
        <View style={styles.followSection}>
          <Pressable
            accessibilityRole="button"
            disabled={followLoading}
            onPress={toggleFollow}
            style={[styles.followButton, following && styles.followingButton]}
          >
            {followLoading ? (
              <ActivityIndicator color={following ? '#7651e8' : '#fff'} size="small" />
            ) : (
              <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            )}
          </Pressable>
          {!!followError && <Text style={styles.followError}>{followError}</Text>}
        </View>
      )}
      <View style={styles.postsSection}>
        <Text style={styles.postsTitle}>{isPublic ? `${displayName}'s posts` : 'Your posts'}</Text>
        {postsLoading ? (
          <ActivityIndicator color="#7651e8" style={styles.postsLoader} />
        ) : posts.length ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <Pressable
                accessibilityLabel={`Open post ${post.title}`}
                accessibilityRole="button"
                key={post.id}
                onPress={() => setSelectedPost(post)}
                style={styles.postTile}
              >
                {post.image_url ? (
                  <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
                ) : (
                  <View style={styles.textPostTile}>
                    <Text numberOfLines={3} style={styles.textPostTitle}>{post.title}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyPosts}>{isPublic ? `${displayName} hasn't shared any posts yet.` : "You haven't shared any posts yet."}</Text>
        )}
        {!isPublic && <SignOutButton />}
      </View>
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
        transparent
        visible={selectedPost !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.postModal}>
            <View style={styles.modalHeader}>
              <View style={styles.postAuthorAvatar}>
                {selectedPost?.avatar_url ? (
                  <Image source={{ uri: selectedPost.avatar_url }} style={styles.postAuthorImage} />
                ) : (
                  <Text style={styles.postAuthorInitials}>{initials(selectedPost?.author_name)}</Text>
                )}
              </View>
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthorName}>{selectedPost?.author_name}</Text>
                <Text style={styles.postTimestamp}>{selectedPost && formatTimestamp(selectedPost.created_at)}</Text>
              </View>
              <Pressable accessibilityLabel="Close post" accessibilityRole="button" onPress={() => setSelectedPost(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPost?.image_url ? (
                <Image source={{ uri: selectedPost.image_url }} style={styles.detailImage} resizeMode="contain" />
              ) : null}
              <View style={styles.detailBody}>
                <Text style={styles.detailTitle}>{selectedPost?.title}</Text>
                {!!selectedPost?.description && <Text style={styles.detailDescription}>{selectedPost.description}</Text>}
                {selectedPost && <CommentSection postId={selectedPost.id} />}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#292331',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 28,
  },
  titleRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRowCentered: {
    justifyContent: 'center',
  },
  backButton: {
    minWidth: 56,
  },
  backButtonSpacer: {
    minWidth: 56,
  },
  backText: {
    color: '#7651e8',
    fontSize: 14,
    fontWeight: '700',
  },
  avatar: {
    borderRadius: 64,
    height: 128,
    width: 128,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e7e2eb',
    borderRadius: 64,
    height: 128,
    justifyContent: 'center',
    width: 128,
  },
  placeholderText: {
    color: '#756e7d',
  },
  uploadIndicator: {
    marginTop: 12,
  },
  name: {
    color: '#292331',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
  },
  email: {
    color: '#756e7d',
    marginTop: 6,
  },
  hint: {
    color: '#756e7d',
    fontSize: 12,
    marginTop: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 20,
  },
  followSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: '#7651e8',
    borderRadius: 9,
    justifyContent: 'center',
    minWidth: 140,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  followingButton: {
    backgroundColor: '#eee9ff',
    borderColor: '#d8cdfb',
    borderWidth: 1,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#7651e8',
  },
  followError: {
    color: '#c0392b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#292331',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#756e7d',
    fontSize: 11,
    marginTop: 3,
  },
  postsSection: {
    alignSelf: 'stretch',
    marginTop: 28,
  },
  postsTitle: {
    color: '#292331',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  postsLoader: {
    marginVertical: 20,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  postTile: {
    aspectRatio: 1,
    flexBasis: '32%',
    flexGrow: 1,
    maxWidth: '32%',
    overflow: 'hidden',
  },
  postImage: {
    backgroundColor: '#e7e2eb',
    height: '100%',
    width: '100%',
  },
  textPostTile: {
    alignItems: 'center',
    backgroundColor: '#eee9ff',
    flex: 1,
    justifyContent: 'center',
    padding: 10,
  },
  textPostTitle: {
    color: '#7651e8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyPosts: {
    color: '#756e7d',
    fontSize: 12,
    paddingVertical: 12,
  },
  modalBackdrop: {
    backgroundColor: '#19171d99',
    flex: 1,
    justifyContent: 'flex-end',
  },
  postModal: {
    backgroundColor: '#fbfafc',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  postAuthorAvatar: {
    alignItems: 'center',
    backgroundColor: '#f7c2a1',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 32,
  },
  postAuthorImage: {
    height: '100%',
    width: '100%',
  },
  postAuthorInitials: {
    color: '#4a2a20',
    fontSize: 10,
    fontWeight: '700',
  },
  postAuthorInfo: {
    flex: 1,
    marginLeft: 9,
  },
  postAuthorName: {
    color: '#19171d',
    fontSize: 13,
    fontWeight: '700',
  },
  postTimestamp: {
    color: '#756e7d',
    fontSize: 11,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: '#756e7d',
    fontSize: 28,
    lineHeight: 28,
  },
  detailImage: {
    backgroundColor: '#e7e2eb',
    height: 360,
    width: '100%',
  },
  detailBody: {
    padding: 18,
  },
  detailTitle: {
    color: '#19171d',
    fontSize: 19,
    fontWeight: '700',
  },
  detailDescription: {
    color: '#19171d',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
})

export default ProfileScreen
