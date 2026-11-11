import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { fetchClosetItemsWithWearStats } from '../services/closet.js'

function compareForgottenItems(first, second) {
  if (first.lastWorn === null && second.lastWorn !== null) return -1
  if (first.lastWorn !== null && second.lastWorn === null) return 1
  if (first.lastWorn === null && second.lastWorn === null) return first.name.localeCompare(second.name)
  return first.lastWorn.localeCompare(second.lastWorn) || first.name.localeCompare(second.name)
}

function ForgottenItemCard({ onWear, onList }) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchClosetItemsWithWearStats()
      .then((items) => {
        if (!cancelled) setItem([...items].sort(compareForgottenItems)[0] || null)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <View style={styles.card}><ActivityIndicator color="#7651e8" /></View>

  if (error) {
    return <View style={styles.card}><Text style={styles.label}>Forgotten item</Text><Text style={styles.empty}>Couldn’t load closet wear history.</Text></View>
  }

  if (!item) {
    return <View style={styles.card}><Text style={styles.label}>Forgotten item</Text><Text style={styles.empty}>Add a closet item to start tracking what needs more wear.</Text></View>
  }

  const daysLabel = item.daysSinceWorn === null ? 'Never worn' : `${item.daysSinceWorn} days unworn`
  const nudge = item.daysSinceWorn === null ? 'Give this piece its first outing.' : 'It may be time to bring this piece back into rotation.'

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.label}>Forgotten item</Text>
        <Text style={styles.days}>{daysLabel}</Text>
      </View>
      <View style={styles.body}>
        {item.imageUrl ? <Image accessibilityLabel={item.name || 'Clothing photo'} source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="contain" /> : <View style={styles.swatch} />}
        <View style={styles.info}>
          <Text style={styles.name}>Your {item.name.toLowerCase()} misses you</Text>
          <Text style={styles.meta}>{item.brand || 'Unbranded'} · {item.category || 'Uncategorized'}</Text>
          <Text style={styles.nudge}>{nudge}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => onWear(item)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Wear it</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onList} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>List item</Text></Pressable>
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
  photo: { backgroundColor: '#f2eff5', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, height: 72, width: 72 },
  swatch: { backgroundColor: '#f2eff5', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, height: 72, width: 72 },
  info: { flex: 1 },
  name: { color: '#19171d', fontSize: 16, fontWeight: '600' },
  meta: { color: '#756e7d', fontSize: 12, marginTop: 3 },
  nudge: { color: '#19171d', fontSize: 13, lineHeight: 18, marginTop: 8 },
  empty: { color: '#756e7d', fontSize: 13, lineHeight: 18, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, flex: 1, paddingVertical: 10 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#e7e2eb', borderRadius: 11, borderWidth: 1, flex: 1, paddingVertical: 10 },
  secondaryButtonText: { color: '#19171d', fontSize: 13, fontWeight: '600' },
})

export default ForgottenItemCard
