import { SafeAreaView, StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader.jsx'
import BottomNav from './components/BottomNav.jsx'

function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <HomeHeader />
        <View style={styles.main} />
        <BottomNav />
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
