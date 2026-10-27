import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { fetchFitOfTheDay } from '../services/posts.js'

function initials(name = '') {
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function FitOfTheDayCard() {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchFitOfTheDay()
      .then((data) => {
        if (!cancelled) setPost(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.label}>Fit of the day</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#7651e8" style={styles.loader} />
      ) : error ? (
        <Text style={styles.empty}>Couldn’t load today’s fit.</Text>
      ) : !post ? (
        <Text style={styles.empty}>No fits posted yet today. Be the first!</Text>
      ) : (
        <View style={styles.body}>
          {post.image_url ? (
            <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.image} />
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
            {!!post.description && <Text style={styles.description} numberOfLines={3}>{post.description}</Text>}
            <View style={styles.author}>
              {post.avatar_url ? (
                <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(post.author_name)}</Text></View>
              )}
              <Text style={styles.meta} numberOfLines={1}>{post.author_name}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, marginHorizontal: 18, marginTop: 22, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: '#7651e8', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  loader: { marginVertical: 24 },
  empty: { color: '#756e7d', fontSize: 13, paddingVertical: 12, textAlign: 'center' },
  body: { flexDirection: 'row', gap: 14 },
  image: { backgroundColor: '#f2eff5', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, height: 72, width: 72 },
  info: { flex: 1 },
  title: { color: '#19171d', fontSize: 16, fontWeight: '600' },
  description: { color: '#19171d', fontSize: 13, lineHeight: 18, marginTop: 4 },
  author: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8 },
  avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  avatarText: { color: '#4a2a20', fontSize: 9, fontWeight: '700' },
  meta: { color: '#756e7d', flex: 1, fontSize: 12 },
})

export default FitOfTheDayCard
