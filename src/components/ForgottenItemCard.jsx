import { Pressable, StyleSheet, Text, View } from 'react-native'

// Mock data until closet items track when they were last worn
const forgottenItems = [
  { id: 'outerwear-1', name: 'Golf Shirt', category: 'Business Casual', brand: 'Peter Millar', daysSinceWorn: 47, swatch: '#0E1D49'},]

function ForgottenItemCard({ onWear, onList }) {
  const item = forgottenItems[0]

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.label}>Forgotten item</Text>
        <Text style={styles.days}>{item.daysSinceWorn} days unworn</Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.swatch, { backgroundColor: item.swatch }]} />
        <View style={styles.info}>
          <Text style={styles.name}>Your {item.name.toLowerCase()} misses you</Text>
          <Text style={styles.meta}>{item.brand} · {item.category}</Text>
          <Text style={styles.nudge}>{item.nudge}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onWear} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Wear it</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onList} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>List item</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, marginHorizontal: 18, marginTop: 22, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: '#7651e8', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  days: { backgroundColor: '#eee9ff', borderRadius: 99, color: '#7651e8', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  body: { flexDirection: 'row', gap: 14 },
  swatch: { borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, height: 72, width: 72 },
  info: { flex: 1 },
  name: { color: '#19171d', fontSize: 16, fontWeight: '600' },
  meta: { color: '#756e7d', fontSize: 12, marginTop: 3 },
  nudge: { color: '#19171d', fontSize: 13, lineHeight: 18, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, flex: 1, paddingVertical: 10 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#e7e2eb', borderRadius: 11, borderWidth: 1, flex: 1, paddingVertical: 10 },
  secondaryButtonText: { color: '#19171d', fontSize: 13, fontWeight: '600' },
})

export default ForgottenItemCard
