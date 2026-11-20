import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { updateMarketplaceListing } from '../services/marketplace.js'

const CATEGORIES = [['Hats', 'hats'], ['Accessories', 'accessories'], ['Shirts', 'shirts'], ['Pants', 'pants'], ['Shoes', 'shoes'], ['Outerwear', 'outerwear']]
const CONDITIONS = [['New', 'new'], ['Like new', 'like_new'], ['Good', 'good'], ['Fair', 'fair'], ['Poor', 'poor']]

function EditListingScreen({ listing, onBack, onSaved }) {
  const [form, setForm] = useState({
    title: listing.title || '', description: listing.description || '', category: listing.category || '',
    brand: listing.brand || '', size: listing.size || '', color: listing.color || '', condition: listing.condition || '',
    price: String(listing.price ?? ''), location_label: listing.location_label || '',
  })
  const [saving, setSaving] = useState(false)

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await updateMarketplaceListing(listing.listing_id, form)
      Alert.alert('Listing updated', 'Your changes were saved.')
      onSaved()
    } catch (error) {
      Alert.alert('Could not update listing', error?.message || 'Something went wrong while saving your changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable disabled={saving} onPress={onBack}><Text style={styles.backText}>‹ Back</Text></Pressable><Text style={styles.headerTitle}>Edit listing</Text><View style={styles.spacer} /></View>
        <Text style={styles.note}>Image management will be added separately. Existing listing photos are preserved.</Text>
        <Field label="Title" value={form.title} onChangeText={(value) => updateField('title', value)} editable={!saving} />
        <Field label="Description" value={form.description} onChangeText={(value) => updateField('description', value)} editable={!saving} multiline />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>{CATEGORIES.map(([label, value]) => <Pressable key={value} disabled={saving} onPress={() => updateField('category', value)} style={[styles.chip, form.category === value && styles.selectedChip]}><Text style={[styles.chipText, form.category === value && styles.selectedChipText]}>{label}</Text></Pressable>)}</View>
        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipRow}>{CONDITIONS.map(([label, value]) => <Pressable key={value} disabled={saving} onPress={() => updateField('condition', value)} style={[styles.chip, form.condition === value && styles.selectedChip]}><Text style={[styles.chipText, form.condition === value && styles.selectedChipText]}>{label}</Text></Pressable>)}</View>
        <Field label="Price" value={form.price} onChangeText={(value) => updateField('price', value.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" editable={!saving} />
        <Field label="Brand" value={form.brand} onChangeText={(value) => updateField('brand', value)} editable={!saving} />
        <Field label="Size" value={form.size} onChangeText={(value) => updateField('size', value)} editable={!saving} />
        <Field label="Color" value={form.color} onChangeText={(value) => updateField('color', value)} editable={!saving} />
        <Field label="Location" value={form.location_label} onChangeText={(value) => updateField('location_label', value)} editable={!saving} />
        <Pressable disabled={saving} onPress={save} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
      </ScrollView>
    </View>
  )
}

function Field({ label, multiline = false, ...props }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} numberOfLines={multiline ? 4 : 1} placeholderTextColor="#756e7d" style={[styles.input, multiline && styles.multilineInput]} /></View>
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { padding: 18, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row' }, backText: { color: '#7651e8', fontSize: 14, fontWeight: '700', minWidth: 70 }, headerTitle: { color: '#19171d', flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' }, spacer: { minWidth: 70 }, note: { color: '#756e7d', fontSize: 12, lineHeight: 18, marginTop: 14 }, label: { color: '#3e3944', fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 15 }, input: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', fontSize: 14, paddingHorizontal: 13, paddingVertical: 12 }, multilineInput: { minHeight: 92, textAlignVertical: 'top' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#e2dce9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, selectedChip: { backgroundColor: '#7651e8', borderColor: '#7651e8' }, chipText: { color: '#756e7d', fontSize: 12, fontWeight: '600' }, selectedChipText: { color: '#fff' }, saveButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 13, marginTop: 26, paddingVertical: 13 }, saveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
})

export default EditListingScreen
