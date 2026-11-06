import { useState, useEffect } from 'react'
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from './lib/supabase.js'
import { getProfile } from './services/profile.js'
import HomeHeader from './components/HomeHeader.jsx'
import ForgottenItemCard from './components/ForgottenItemCard.jsx'
import FitOfTheDayCard from './components/FitOfTheDayCard.jsx'
import PostStreakCard from './components/PostStreakCard.jsx'
import BottomNav from './components/BottomNav.jsx'
import ClosetScreen from './components/ClosetScreen.jsx'
import CommunityScreen from './components/CommunityScreen.jsx'
import AddItemScreen from './components/AddItemScreen.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import MarketplaceScreen from './components/MarketplaceScreen.jsx'
import ProfileScreen from './components/ProfileScreen.jsx'
import DocumentOutfitScreen from './components/DocumentOutfitScreen.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('Home')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showDocumentOutfit, setShowDocumentOutfit] = useState(false)

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

  if (showDocumentOutfit) {
    return <DocumentOutfitScreen onBack={() => setShowDocumentOutfit(false)} />
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
          <ScrollView style={styles.main} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
            <HomeHeader user={session.user} profile={profile}>
              <PostStreakCard userId={session.user.id} />
            </HomeHeader>
            <Pressable accessibilityRole="button" onPress={() => setShowDocumentOutfit(true)} style={styles.documentCard}>
              <View style={styles.documentCardCopy}>
                <Text style={styles.documentCardLabel}>Track your fit</Text>
                <Text style={styles.documentCardTitle}>Document today's outfit</Text>
                <Text style={styles.documentCardSubtitle}>Save a photo and mark the closet pieces you wore.</Text>
              </View>
              <Text style={styles.documentCardArrow}>›</Text>
            </Pressable>
            <FitOfTheDayCard />
            <ForgottenItemCard onWear={() => setActiveTab('Community')} onList={() => setActiveTab('Marketplace')} />
          </ScrollView>
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
  homeContent: {
    paddingBottom: 24,
  },
  documentCard: {
    alignItems: 'center',
    backgroundColor: '#eee9ff',
    borderColor: '#d9ccff',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 18,
    marginTop: 22,
    padding: 16,
  },
  documentCardCopy: {
    flex: 1,
  },
  documentCardLabel: {
    color: '#7651e8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  documentCardTitle: {
    color: '#19171d',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  documentCardSubtitle: {
    color: '#756e7d',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  documentCardArrow: {
    color: '#7651e8',
    fontSize: 30,
    marginLeft: 12,
  },
})

export default App
