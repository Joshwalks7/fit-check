import { useState, useEffect } from 'react'
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native'
import { supabase } from './lib/supabase.js'
import { getProfile } from './services/profile.js'
import BottomNav from './components/BottomNav.jsx'
import ClosetScreen from './components/ClosetScreen.jsx'
import CommunityScreen from './components/CommunityScreen.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import AddItemScreen from './components/AddItemScreen.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import MarketplaceScreen from './components/MarketplaceScreen.jsx'
import CreateListingScreen from './components/CreateListingScreen.jsx'
import MyListingsScreen from './components/MyListingsScreen.jsx'
import ChatScreen from './components/ChatScreen.jsx'
import ProfileScreen from './components/ProfileScreen.jsx'
import DocumentOutfitScreen from './components/DocumentOutfitScreen.jsx'
import { startListingConversation } from './services/chat.js'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('Home')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showCreateListing, setShowCreateListing] = useState(false)
  const [showMyListings, setShowMyListings] = useState(false)
  const [chatConversationId, setChatConversationId] = useState(null)
  const [chatConversation, setChatConversation] = useState(null)
  const [myMarketplaceInitialTab, setMyMarketplaceInitialTab] = useState('listings')
  const [showDocumentOutfit, setShowDocumentOutfit] = useState(false)
  const [preselectedItemId, setPreselectedItemId] = useState(null)
  const [initialWornOn, setInitialWornOn] = useState(null)
  const [fitRefreshKey, setFitRefreshKey] = useState(0)
  const [sharedToday, setSharedToday] = useState(false)

  const openDocumentOutfit = (wornOn = null, itemId = null) => {
    setInitialWornOn(wornOn)
    setPreselectedItemId(itemId)
    setShowDocumentOutfit(true)
  }

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

  const openListingConversation = async (listing) => {
    try {
      const conversationId = await startListingConversation(listing.listing_id)
      setChatConversation(null)
      setChatConversationId(conversationId)
    } catch (error) {
      Alert.alert('Could not start conversation', error?.message || 'Please try again.')
    }
  }

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

  if (showCreateListing) {
    return <CreateListingScreen onBack={() => setShowCreateListing(false)} />
  }

  if (chatConversationId) {
    return <ChatScreen conversation={chatConversation} conversationId={chatConversationId} onBack={() => { setChatConversationId(null); setMyMarketplaceInitialTab('messages'); setShowMyListings(true) }} />
  }

  if (showMyListings) {
    return <MyListingsScreen initialTab={myMarketplaceInitialTab} onBack={() => setShowMyListings(false)} onOpenConversation={(conversationId, conversation) => { setChatConversation(conversation); setChatConversationId(conversationId) }} />
  }

  if (showDocumentOutfit) {
    return <DocumentOutfitScreen initialItemId={preselectedItemId} initialWornOn={initialWornOn} onBack={() => setShowDocumentOutfit(false)} onSaved={({ shared }) => { setSharedToday(shared); setFitRefreshKey((key) => key + 1) }} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {activeTab === 'Closet' ? (
          <ClosetScreen onAddItem={() => setShowAddItem(true)} />
        ) : activeTab === 'Marketplace' ? (
          <MarketplaceScreen onCreateListing={() => setShowCreateListing(true)} onMessageSeller={openListingConversation} onMyListings={() => setShowMyListings(true)} />
        ) : activeTab === 'Community' ? (
          <CommunityScreen />
        ) : activeTab === 'Profile' ? (
          <ProfileScreen user={session.user} profile={profile} setProfile={setProfile} />
        ) : (
          <HomeScreen fitRefreshKey={fitRefreshKey} onListForgotten={() => setActiveTab('Marketplace')} onRecordPast={() => openDocumentOutfit('')} onRecordToday={() => openDocumentOutfit()} onWearForgotten={(item) => openDocumentOutfit(null, item.id)} profile={profile} sharedToday={sharedToday} user={session.user} />
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
})

export default App
