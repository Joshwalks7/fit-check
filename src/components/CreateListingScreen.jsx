import { useEffect, useState } from 'react'
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { createMarketplaceListing, fetchClosetItemsForListing } from '../services/marketplace.js'

const CATEGORIES = [
  ['Hats', 'hats'], ['Accessories', 'accessories'], ['Shirts', 'shirts'],
  ['Pants', 'pants'], ['Shoes', 'shoes'], ['Outerwear', 'outerwear'],
]

const CONDITIONS = [
  ['New', 'new'], ['Like new', 'like_new'], ['Good', 'good'], ['Fair', 'fair'], ['Poor', 'poor'],
]

const EMPTY_FORM = {
  title: '', description: '', category: '', brand: '', size: '', color: '', condition: '', price: '', location_label: '', source_clothing_item_id: null,
}

function fieldLabel(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function CreateListingScreen({ onBack }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [images, setImages] = useState([])
  const [closetItems, setClosetItems] = useState([])
  const [showCloset, setShowCloset] = useState(false)
  const [loadingCloset, setLoadingCloset] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchClosetItemsForListing()
      .then((items) => { if (!cancelled) setClosetItems(items) })
      .catch((error) => console.warn('Closet listing autofill failed:', error))
      .finally(() => { if (!cancelled) setLoadingCloset(false) })
    return () => { cancelled = true }
  }, [])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const selectClosetItem = (item) => {
    setForm({
      title: item.name || '',
      description: item.description || '',
      category: item.category || '',
      brand: item.brand || '',
      size: item.size || '',
      color: item.color || '',
      condition: '',
      price: '',
      location_label: '',
      source_clothing_item_id: item.id,
    })
    setShowCloset(false)
  }

  const pickImages = async (source) => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ['images'], selectionLimit: 6, quality: 0.8 })

    if (!result.canceled) {
      const nextImages = result.assets || []
      setImages((current) => [...current, ...nextImages].slice(0, 6))
    }
  }

  const save = async (publish) => {
    if (saving) return
    setSaving(true)
    try {
      await createMarketplaceListing({ listing: form, images, publish })
      Alert.alert(publish ? 'Listing published' : 'Draft saved', publish ? 'Your listing is now visible in the marketplace.' : 'You can publish it later from My Listings.')
      onBack()
    } catch (error) {
      Alert.alert(publish ? 'Could not publish listing' : 'Could not save draft', error?.message || 'Something went wrong while saving your listing.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" disabled={saving} onPress={onBack}><Text style={styles.backText}>‹ Back</Text></Pressable><Text style={styles.headerTitle}>Sell something</Text><View style={styles.headerSpacer} /></View>

        <Text style={styles.subtitle}>Create a listing from your closet or start from scratch.</Text>

        <View style={styles.sourceRow}>
          <Pressable disabled={saving || loadingCloset} onPress={() => setShowCloset(true)} style={styles.sourceButton}><Text style={styles.sourceButtonTitle}>{form.source_clothing_item_id ? 'Change closet item' : 'Autofill from closet'}</Text><Text style={styles.sourceButtonText}>{loadingCloset ? 'Loading closet…' : form.source_clothing_item_id ? 'Fields copied — you can edit them' : 'Optional'}</Text></Pressable>
          {form.source_clothing_item_id ? <Pressable disabled={saving} onPress={() => setForm(EMPTY_FORM)} style={styles.clearSource}><Text style={styles.clearSourceText}>Clear</Text></Pressable> : null}
        </View>

        <Text style={styles.sectionTitle}>Photos</Text>
        <ScrollView contentContainerStyle={styles.imageRow} horizontal showsHorizontalScrollIndicator={false}>
          {images.map((image, index) => <View key={`${image.uri}-${index}`} style={styles.imageWrap}><Image source={{ uri: image.uri }} style={styles.preview} /><Pressable accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} style={styles.removeImage}><Text style={styles.removeImageText}>×</Text></Pressable></View>)}
          <Pressable disabled={saving} onPress={() => pickImages('library')} style={styles.addPhoto}><Text style={styles.addPhotoMark}>＋</Text><Text style={styles.addPhotoText}>{images.length ? 'Add more' : 'Add photos'}</Text></Pressable>
          <Pressable disabled={saving} onPress={() => pickImages('camera')} style={styles.cameraPhoto}><Text style={styles.addPhotoMark}>⌾</Text><Text style={styles.addPhotoText}>Camera</Text></Pressable>
        </ScrollView>
        <Text style={styles.hint}>At least one photo is required to publish. Drafts may be saved without photos.</Text>

        <Text style={styles.sectionTitle}>Listing details</Text>
        <Field label="Title" value={form.title} onChangeText={(value) => updateField('title', value)} placeholder="Vintage graphic tee" editable={!saving} />
        <Field label="Description" value={form.description} onChangeText={(value) => updateField('description', value)} placeholder="Add details about fit, wear, or flaws" editable={!saving} multiline />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>{CATEGORIES.map(([label, value]) => <Pressable key={value} disabled={saving} onPress={() => updateField('category', value)} style={[styles.chip, form.category === value && styles.selectedChip]}><Text style={[styles.chipText, form.category === value && styles.selectedChipText]}>{label}</Text></Pressable>)}</View>

        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipRow}>{CONDITIONS.map(([label, value]) => <Pressable key={value} disabled={saving} onPress={() => updateField('condition', value)} style={[styles.chip, form.condition === value && styles.selectedChip]}><Text style={[styles.chipText, form.condition === value && styles.selectedChipText]}>{label}</Text></Pressable>)}</View>

        <Field label="Price" value={String(form.price)} onChangeText={(value) => updateField('price', value.replace(/[^0-9.]/g, ''))} placeholder="0 for free" keyboardType="decimal-pad" editable={!saving} />
        <Field label="Brand" value={form.brand} onChangeText={(value) => updateField('brand', value)} placeholder="Optional" editable={!saving} />
        <Field label="Size" value={form.size} onChangeText={(value) => updateField('size', value)} placeholder="Optional" editable={!saving} />
        <Field label="Color" value={form.color} onChangeText={(value) => updateField('color', value)} placeholder="Optional" editable={!saving} />
        <Field label="Location" value={form.location_label} onChangeText={(value) => updateField('location_label', value)} placeholder="Campus, city, or neighborhood" editable={!saving} />

        <View style={styles.actions}><Pressable disabled={saving} onPress={() => save(false)} style={styles.draftButton}><Text style={styles.draftButtonText}>{saving ? 'Saving…' : 'Save draft'}</Text></Pressable><Pressable disabled={saving} onPress={() => save(true)} style={styles.publishButton}><Text style={styles.publishButtonText}>{saving ? 'Saving…' : 'Publish listing'}</Text></Pressable></View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setShowCloset(false)} transparent visible={showCloset}>
        <View style={styles.modalBackdrop}><View style={styles.closetModal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Choose closet item</Text><Pressable onPress={() => setShowCloset(false)}><Text style={styles.closeText}>×</Text></Pressable></View>{closetItems.length ? <ScrollView>{closetItems.map((item) => <Pressable key={item.id} onPress={() => selectClosetItem(item)} style={styles.closetItem}><Text style={styles.closetItemName}>{item.name}</Text><Text style={styles.closetItemMeta}>{fieldLabel(item.category)}{item.brand ? ` · ${item.brand}` : ''}{item.size ? ` · ${item.size}` : ''}</Text></Pressable>)}</ScrollView> : <Text style={styles.hint}>Your closet is empty. You can still create a standalone listing.</Text>}</View></View>
      </Modal>
    </View>
  )
}

function Field({ label, multiline = false, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} numberOfLines={multiline ? 4 : 1} placeholderTextColor="#756e7d" style={[styles.input, multiline && styles.multilineInput]} /></View>
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { paddingBottom: 34, paddingHorizontal: 18, paddingTop: 18 }, header: { alignItems: 'center', flexDirection: 'row' }, backText: { color: '#7651e8', fontSize: 15, fontWeight: '700' }, headerTitle: { color: '#19171d', flex: 1, fontSize: 19, fontWeight: '700', textAlign: 'center' }, headerSpacer: { minWidth: 42 }, subtitle: { color: '#756e7d', fontSize: 13, lineHeight: 19, marginTop: 8 }, sourceRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 18 }, sourceButton: { backgroundColor: '#eee9fb', borderRadius: 14, flex: 1, padding: 13 }, sourceButtonTitle: { color: '#5d3bbd', fontSize: 14, fontWeight: '700' }, sourceButtonText: { color: '#756e7d', fontSize: 12, marginTop: 4 }, clearSource: { padding: 8 }, clearSourceText: { color: '#7651e8', fontSize: 12, fontWeight: '700' }, sectionTitle: { color: '#19171d', fontSize: 16, fontWeight: '700', marginTop: 22 }, imageRow: { gap: 10, paddingVertical: 12 }, imageWrap: { borderRadius: 14, height: 104, overflow: 'hidden', width: 104 }, preview: { height: '100%', width: '100%' }, removeImage: { alignItems: 'center', backgroundColor: 'rgba(25,23,29,0.72)', borderRadius: 13, height: 26, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 26 }, removeImageText: { color: '#fff', fontSize: 18, lineHeight: 20 }, addPhoto: { alignItems: 'center', backgroundColor: '#eee9f7', borderColor: '#d8cfeb', borderRadius: 14, borderWidth: 1, height: 104, justifyContent: 'center', width: 104 }, cameraPhoto: { alignItems: 'center', backgroundColor: '#f2eff6', borderRadius: 14, height: 104, justifyContent: 'center', width: 104 }, addPhotoMark: { color: '#7651e8', fontSize: 26, fontWeight: '700' }, addPhotoText: { color: '#5d3bbd', fontSize: 12, fontWeight: '700', marginTop: 5 }, hint: { color: '#756e7d', fontSize: 12, lineHeight: 18, marginTop: 2 }, label: { color: '#3e3944', fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 15 }, field: {}, input: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', fontSize: 14, paddingHorizontal: 13, paddingVertical: 12 }, multilineInput: { minHeight: 92, textAlignVertical: 'top' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#e2dce9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, selectedChip: { backgroundColor: '#7651e8', borderColor: '#7651e8' }, chipText: { color: '#756e7d', fontSize: 12, fontWeight: '600' }, selectedChipText: { color: '#fff' }, actions: { flexDirection: 'row', gap: 10, marginTop: 26 }, draftButton: { alignItems: 'center', borderColor: '#7651e8', borderRadius: 13, borderWidth: 1, flex: 1, paddingVertical: 13 }, draftButtonText: { color: '#7651e8', fontSize: 13, fontWeight: '800' }, publishButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 13, flex: 1, paddingVertical: 13 }, publishButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' }, modalBackdrop: { backgroundColor: 'rgba(25,23,29,0.42)', flex: 1, justifyContent: 'flex-end' }, closetModal: { backgroundColor: '#fbfafc', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '75%', padding: 18 }, modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }, modalTitle: { color: '#19171d', fontSize: 18, fontWeight: '700' }, closeText: { color: '#756e7d', fontSize: 28, lineHeight: 28 }, closetItem: { borderBottomColor: '#e7e2eb', borderBottomWidth: 1, paddingVertical: 14 }, closetItemName: { color: '#19171d', fontSize: 15, fontWeight: '700' }, closetItemMeta: { color: '#756e7d', fontSize: 12, marginTop: 4 },
})

export default CreateListingScreen
