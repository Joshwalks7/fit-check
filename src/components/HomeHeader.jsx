import { Image, StyleSheet, Text, View } from 'react-native'

function initials(name = '') {
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function HomeHeader({ user, profile }) {
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>Monday, October 7</Text>
        <Text style={styles.greeting}>Good morning</Text>
      </View>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(displayName)}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  eyebrow: {
    color: '#756e7d',
    fontSize: 12,
    marginBottom: 5,
  },
  greeting: {
    color: '#19171d',
    fontSize: 26,
    fontWeight: '600',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#f7c2a1',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#4a2a20',
    fontSize: 14,
    fontWeight: '700',
  },
})

export default HomeHeader
