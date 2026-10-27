import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

function initials(name = '') {
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function timeOfDay(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function HomeHeader({ user, profile, children }) {
  const fullName = profile?.full_name || user.user_metadata?.full_name
  const displayName = fullName || user.email
  const firstName = fullName?.trim().split(/\s+/)[0]

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const greeting = firstName ? `${timeOfDay(now.getHours())}, ${firstName}` : timeOfDay(now.getHours())
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>Let’s find today’s fit</Text>
          <Text style={styles.dateTime}>{dateLabel} · {timeLabel}</Text>
        </View>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: '#19171d', fontSize: 26, fontWeight: '600', letterSpacing: -0.7 },
  row: { flexDirection: 'row', gap: 12 },
  greetingBlock: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, flex: 1, justifyContent: 'center', padding: 14 },
  greeting: { color: '#000', fontSize: 20, fontWeight: '600' },
  subtitle: { color: '#756e7d', fontSize: 12, marginTop: 5 },
  dateTime: { color: '#7651e8', fontSize: 12, fontWeight: '600', marginTop: 8 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#f7c2a1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: '#4a2a20',
    fontSize: 14,
    fontWeight: '700',
  },
})

export default HomeHeader
