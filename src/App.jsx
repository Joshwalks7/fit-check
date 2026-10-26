import { useState, useEffect } from 'react'
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { supabase } from './lib/supabase.js'
import { getProfile } from './services/profile.js'
import HomeHeader from './components/HomeHeader.jsx'
import BottomNav from './components/BottomNav.jsx'
import ClosetScreen from './components/ClosetScreen.jsx'
import CommunityScreen from './components/CommunityScreen.jsx'
import AddItemScreen from './components/AddItemScreen.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import MarketplaceScreen from './components/MarketplaceScreen.jsx'
import ProfileScreen from './components/ProfileScreen.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('Home')
  const [showAddItem, setShowAddItem] = useState(false)

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for changes to auth state (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setProfile(null)
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    let cancelled = false

    if (!userId) return () => { cancelled = true }

    getProfile(userId)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setProfile(null)
          Alert.alert('Could not load profile', error.message)
        }
      })

    return () => { cancelled = true }
  }, [userId])

  // If user is not logged in, show the Login screen
  if (!session) {
    return <LoginScreen />
  }

  if (showAddItem) {
    return <AddItemScreen onBack={() => setShowAddItem(false)} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {activeTab === 'Closet' ? (
          <ClosetScreen onAddItem={() => setShowAddItem(true)} />
        ) : activeTab === 'Marketplace' ? (
          <MarketplaceScreen />
        ) : activeTab === 'Community' ? (
          <CommunityScreen />
        ) : activeTab === 'Profile' ? (
          <ProfileScreen user={session.user} profile={profile} setProfile={setProfile} />
        ) : (
          <>
            <HomeHeader user={session.user} profile={profile} />
            <View style={styles.main}>
              <Text style={styles.placeholder}>
                {activeTab === 'Home' ? 'Home screen coming soon' : `${activeTab} screen coming soon`}
              </Text>
            </View>
          </>
        )}
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fbfafc',
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
})

export default App
