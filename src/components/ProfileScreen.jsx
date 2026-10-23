import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { getProfile, uploadAvatar } from '../services/profile.js'

function ProfileScreen({ user }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    getProfile(user.id)
      .then(setProfile)
      .catch((error) => Alert.alert('Could not load profile', error.message))
      .finally(() => setLoading(false))
  }, [user.id])

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

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email

  if (loading) {
    return <ActivityIndicator style={styles.loading} color="#7651e8" />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Pressable accessibilityRole="button" onPress={chooseAvatar} disabled={uploading}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.placeholderText}>Add photo</Text>
          </View>
        )}
      </Pressable>
      {uploading && <ActivityIndicator style={styles.uploadIndicator} color="#7651e8" />}
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.hint}>Tap your picture to change it</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    padding: 24,
  },
  title: {
    color: '#292331',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 28,
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
  loading: {
    flex: 1,
  },
})

export default ProfileScreen
