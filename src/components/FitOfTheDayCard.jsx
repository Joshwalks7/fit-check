import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { fetchTodaysOutfit } from '../services/outfits.js'

function todayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function TodayFitCard({ onRecordToday, onRecordPast }) {
  const [outfit, setOutfit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchTodaysOutfit(todayKey())
      .then((data) => {
        if (!cancelled) setOutfit(data)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Today's fit</Text>
      {loading ? (
        <ActivityIndicator color="#7651e8" style={styles.loader} />
      ) : error ? (
        <View>
          <Text style={styles.empty}>We couldn't load today's fit.</Text>
          <Pressable accessibilityRole="button" onPress={onRecordToday} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Record today's fit</Text>
          </Pressable>
        </View>
      ) : outfit ? (
        <View style={styles.recordedContent}>
          {outfit.imageUrl ? <Image source={{ uri: outfit.imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={styles.image} />}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{outfit.title || 'Outfit recorded'}</Text>
            {!!outfit.items?.length && <Text style={styles.items} numberOfLines={2}>{outfit.items.map((item) => item.name).join(', ')}</Text>}
            {!!outfit.notes && <Text style={styles.description} numberOfLines={2}>{outfit.notes}</Text>}
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.empty}>What are you wearing today?</Text>
          <Text style={styles.prompt}>Save your fit and keep your closet rotation moving.</Text>
          <Pressable accessibilityRole="button" onPress={onRecordToday} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Record today's fit</Text>
          </Pressable>
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={onRecordPast} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Record a past outfit</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, marginHorizontal: 18, marginTop: 22, padding: 16 },
  label: { color: '#7651e8', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  loader: { marginVertical: 24 },
  empty: { color: '#19171d', fontSize: 17, fontWeight: '600', marginTop: 14 },
  prompt: { color: '#756e7d', fontSize: 13, lineHeight: 18, marginTop: 5 },
  recordedContent: { flexDirection: 'row', gap: 14, marginTop: 14 },
  image: { backgroundColor: '#f2eff5', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, height: 110, width: 110 },
  info: { flex: 1, justifyContent: 'center' },
  title: { color: '#19171d', fontSize: 17, fontWeight: '600' },
  items: { color: '#7651e8', fontSize: 12, marginTop: 7 },
  description: { color: '#756e7d', fontSize: 13, lineHeight: 18, marginTop: 6 },
  primaryButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, marginTop: 14, paddingVertical: 11 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#e7e2eb', borderRadius: 11, borderWidth: 1, marginTop: 10, paddingVertical: 10 },
  secondaryButtonText: { color: '#19171d', fontSize: 13, fontWeight: '600' },
})

export default TodayFitCard
