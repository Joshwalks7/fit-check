import { useState } from 'react'
import {
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

const links = [
  { label: 'Explore Vite', url: 'https://vite.dev/', icon: 'vite' },
  { label: 'Learn more', url: 'https://react.dev/', icon: 'react' },
]

const socialLinks = [
  { label: 'GitHub', url: 'https://github.com/vitejs/vite' },
  { label: 'Discord', url: 'https://chat.vite.dev/' },
  { label: 'X.com', url: 'https://x.com/vite_js' },
  { label: 'Bluesky', url: 'https://bsky.app/profile/vite.dev' },
]

function ExternalLink({ label, url, icon }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      {icon ? <Text style={styles.linkIcon}>{icon === 'vite' ? '⚡' : '⚛'}</Text> : null}
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  )
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.center}>
          <Image
            source={require('./assets/hero.png')}
            resizeMode="contain"
            style={styles.heroImage}
            accessibilityLabel="React and Vite starter artwork"
          />
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.description}>
            Edit <Text style={styles.code}>src/App.jsx</Text> and save to test{' '}
            <Text style={styles.code}>Fast Refresh</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCount((value) => value + 1)}
            style={({ pressed }) => [styles.counter, pressed && styles.counterPressed]}
          >
            <Text style={styles.counterText}>Count is {count}</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.nextSteps}>
          <View style={styles.panel}>
            <Text style={styles.panelIcon}>▣</Text>
            <Text style={styles.heading}>Documentation</Text>
            <Text style={styles.panelDescription}>Your questions, answered</Text>
            <View style={styles.links}>
              {links.map((link) => <ExternalLink key={link.url} {...link} />)}
            </View>
          </View>

          <View style={[styles.panel, styles.socialPanel]}>
            <Text style={styles.panelIcon}>◎</Text>
            <Text style={styles.heading}>Connect with us</Text>
            <Text style={styles.panelDescription}>Join the Vite community</Text>
            <View style={styles.links}>
              {socialLinks.map((link) => <ExternalLink key={link.url} {...link} />)}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, maxWidth: 1126, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', padding: 32, gap: 18 },
  heroImage: { width: 220, height: 180, marginBottom: 10 },
  title: { color: '#08060d', fontSize: 42, fontWeight: '500', textAlign: 'center' },
  description: { color: '#6b6375', fontSize: 17, textAlign: 'center', lineHeight: 26 },
  code: { color: '#08060d', backgroundColor: '#f4f3ec', fontFamily: 'monospace', paddingHorizontal: 5 },
  counter: { backgroundColor: 'rgba(170, 59, 255, 0.1)', borderColor: 'rgba(170, 59, 255, 0.5)', borderWidth: 2, borderRadius: 7, paddingHorizontal: 14, paddingVertical: 9, marginTop: 8 },
  counterPressed: { opacity: 0.7 },
  counterText: { color: '#08060d', fontFamily: 'monospace', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#e5e4e7' },
  nextSteps: { flexDirection: 'row' },
  panel: { flex: 1, padding: 32 },
  socialPanel: { borderLeftWidth: 1, borderLeftColor: '#e5e4e7' },
  panelIcon: { color: '#aa3bff', fontSize: 24, marginBottom: 14 },
  heading: { color: '#08060d', fontSize: 24, fontWeight: '500', marginBottom: 8 },
  panelDescription: { color: '#6b6375', fontSize: 16 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  link: { alignItems: 'center', backgroundColor: 'rgba(244, 243, 236, 0.7)', borderRadius: 6, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8 },
  linkPressed: { opacity: 0.65 },
  linkIcon: { fontSize: 18 },
  linkText: { color: '#08060d', fontSize: 15 },
})

export default App
