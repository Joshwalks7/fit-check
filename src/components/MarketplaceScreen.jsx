import { StyleSheet, Text, View } from 'react-native'

function MarketplaceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      <Text style={styles.subtitle}>
        Discover clothing from the FitCheck community.
      </Text>

      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Your marketplace is ready</Text>
        <Text style={styles.emptyDescription}>
          Clothing listings will appear here once we connect your database.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfafc',
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  title: {
    color: '#19171d',
    fontSize: 26,
    fontWeight: '600',
  },
  subtitle: {
    color: '#756e7d',
    fontSize: 13,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#19171d',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#756e7d',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
})

export default MarketplaceScreen