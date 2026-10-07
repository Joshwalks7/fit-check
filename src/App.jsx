import { useState, useEffect } from 'react'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { supabase } from './lib/supabase.js'
import HomeHeader from './components/HomeHeader.jsx'
import BottomNav from './components/BottomNav.jsx'
import ClosetScreen from './components/ClosetScreen.jsx'
import AddItemScreen from './components/AddItemScreen.jsx'
import LoginScreen from './components/LoginScreen.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('Home')
  const [showAddItem, setShowAddItem] = useState(false)

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for changes to auth state (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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
        ) : (
          <>
            <HomeHeader />
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