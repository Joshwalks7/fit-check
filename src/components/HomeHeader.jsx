import { StyleSheet, Text, View } from 'react-native'

function HomeHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>Monday, October 7</Text>
        <Text style={styles.greeting}>Good morning</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>M</Text>
      </View>
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
