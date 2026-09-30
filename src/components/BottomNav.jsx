import { Pressable, StyleSheet, Text, View } from 'react-native'

const tabs = ['Home', 'Closet', 'Community', 'Profile']

function BottomNav({ activeTab, onChange }) {
  return (
    <View style={styles.footer}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab

        return (
          <Pressable key={tab} accessibilityRole="button" onPress={() => onChange(tab)} style={styles.tab}>
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>{tab}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    borderTopColor: '#e7e2eb',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 18,
    paddingTop: 14,
  },
  tab: {
    alignItems: 'center',
    minWidth: 60,
    paddingVertical: 6,
  },
  tabLabel: {
    color: '#756e7d',
    fontSize: 12,
  },
  activeLabel: {
    color: '#7651e8',
    fontWeight: '700',
  },
})

export default BottomNav
