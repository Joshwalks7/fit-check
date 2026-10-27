import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { fetchPostsByUser } from '../services/posts.js'

function dayKey(date) {
  return new Date(date).toDateString()
}

function daysAgo(count) {
  const date = new Date()
  date.setDate(date.getDate() - count)
  return date
}

function getStreak(posts) {
  const postedDays = new Set(posts.map((post) => dayKey(post.created_at)))
  const postedToday = postedDays.has(dayKey(new Date()))

  let offset = postedToday ? 0 : 1
  let streak = 0
  while (postedDays.has(dayKey(daysAgo(offset)))) {
    streak += 1
    offset += 1
  }

  return { streak, postedToday }
}

function streakMessage({ streak, postedToday }) {
  if (postedToday) return 'Posted today ✓'
  if (streak > 0) return 'Post today to keep it'
  return 'Post to start one'
}

function PostStreakCard({ userId }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchPostsByUser(userId)
      .then((posts) => {
        if (!cancelled) setStats(getStreak(posts))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => { cancelled = true }
  }, [userId])

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Post streak</Text>
      {error ? (
        <Text style={styles.message}>Couldn’t load</Text>
      ) : !stats ? (
        <ActivityIndicator color="#7651e8" style={styles.loader} />
      ) : (
        <>
          <View style={styles.row}>
            <Text style={[styles.count, stats.streak === 0 && styles.flameOut]}>🔥</Text>
            <Text style={styles.count}>{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</Text>
          </View>
          <Text style={styles.message}>{streakMessage(stats)}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, padding: 14, width: '45%' },
  label: { color: '#7651e8', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  loader: { marginVertical: 12 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8 },
  count: { color: '#19171d', fontSize: 22, fontWeight: '700' },
  flameOut: { opacity: 0.3 },
  message: { color: '#756e7d', fontSize: 12, marginTop: 2 },
})

export default PostStreakCard
