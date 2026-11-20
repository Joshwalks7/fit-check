import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { AUDIENCE_OPTIONS, DATE_OPTIONS, DEFAULT_FILTERS } from '../../hooks/useCommunityFeed.js'

export default function FilterModal({ visible, filters, onClose, onApply }) {
  const [draft, setDraft] = useState(filters)
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  return <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.modal}><View style={styles.header}><Text style={styles.title}>Filter posts</Text><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
      {[['Show', AUDIENCE_OPTIONS, 'audience'], ['Posted', DATE_OPTIONS, 'date']].map(([label, options, key]) => <View key={key}><Text style={styles.label}>{label}</Text><View style={styles.chips}>{options.map((option) => <Pressable key={option.value} onPress={() => set(key, option.value)} style={[styles.chip, draft[key] === option.value && styles.activeChip]}><Text style={[styles.chipText, draft[key] === option.value && styles.activeText]}>{option.label}</Text></Pressable>)}</View></View>)}
      <View style={styles.actions}><Pressable onPress={() => setDraft(DEFAULT_FILTERS)} style={styles.cancel}><Text style={styles.cancelText}>Reset</Text></Pressable><Pressable onPress={() => onApply(draft)} style={styles.apply}><Text style={styles.applyText}>Apply</Text></Pressable></View>
    </View></View>
  </Modal>
}

const styles = StyleSheet.create({ backdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 }, modal: { backgroundColor: '#fff', borderRadius: 20, maxWidth: 380, padding: 18, width: '100%' }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }, title: { color: '#19171d', fontSize: 18, fontWeight: '700' }, close: { color: '#756e7d', fontSize: 26 }, label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { backgroundColor: '#f0eef2', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 }, activeChip: { backgroundColor: '#7651e8' }, chipText: { color: '#756e7d', fontSize: 12, fontWeight: '600' }, activeText: { color: '#fff' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }, cancel: { paddingHorizontal: 14, paddingVertical: 10 }, cancelText: { color: '#756e7d', fontSize: 13, fontWeight: '700' }, apply: { backgroundColor: '#7651e8', borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10 }, applyText: { color: '#fff', fontSize: 13, fontWeight: '700' } })
