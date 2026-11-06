import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { createOutfit, fetchClosetItemsForOutfit } from '../services/outfits.js'

function todayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCategory(value) {
  return value
    ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Uncategorized'
}

function DocumentOutfitScreen({ onBack }) {
  const [image, setImage] = useState(null)
  const [closetItems, setClosetItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [wornOn, setWornOn] = useState(todayKey)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [loadingItems, setLoadingItems] = useState(true)
  const [itemsError, setItemsError] = useState(null)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const loadItems = async () => {
    setLoadingItems(true)
    setItemsError(null)
    try {
      setClosetItems(await fetchClosetItemsForOutfit())
    } catch (error) {
      setItemsError(error.message)
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchClosetItemsForOutfit()
      .then((items) => {
        if (active) setClosetItems(items)
      })
      .catch((error) => {
        if (active) setItemsError(error.message)
      })
      .finally(() => {
        if (active) setLoadingItems(false)
      })

    return () => { active = false }
  }, [])

  const pickImage = async (source) => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to take an outfit photo.')
        return
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to choose an outfit photo.')
        return
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] })

    setShowPhotoOptions(false)
    if (!result.canceled) setImage(result.assets[0])
  }

  const toggleItem = (itemId) => {
    setSelectedIds((current) => current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId])
  }

  const save = async () => {
    setSaveError(null)
    if (!image) {
      setSaveError('Add a photo of your outfit before saving.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wornOn)) {
      setSaveError('Use a date in YYYY-MM-DD format.')
      return
    }
    if (!selectedIds.length) {
      setSaveError('Select at least one closet item.')
      return
    }

    setSaving(true)
    try {
      await createOutfit({
        image,
        wornOn,
        title,
        notes,
        clothingItemIds: selectedIds,
      })
      Alert.alert('Outfit saved', 'Your outfit and worn items were documented.')
      onBack()
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back" accessibilityRole="button" disabled={saving} onPress={onBack}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Document outfit</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>Save what you wore and keep your closet history accurate.</Text>

        <Pressable accessibilityRole="button" disabled={saving} onPress={() => setShowPhotoOptions(true)} style={styles.photoPicker}>
          {image ? (
            <View style={styles.previewFrame}>
              <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
            </View>
          ) : (
            <>
              <Text style={styles.photoIcon}>＋</Text>
              <Text style={styles.photoTitle}>Add an outfit photo</Text>
              <Text style={styles.photoHint}>Choose from your library or take a photo</Text>
            </>
          )}
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>Title (optional)</Text>
          <TextInput onChangeText={setTitle} placeholder="Friday fit" placeholderTextColor="#756e7d" style={styles.input} value={title} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Date worn</Text>
          <TextInput autoCapitalize="none" onChangeText={setWornOn} placeholder="YYYY-MM-DD" placeholderTextColor="#756e7d" style={styles.input} value={wornOn} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Where you wore it or how it felt" placeholderTextColor="#756e7d" style={[styles.input, styles.notesInput]} value={notes} />
        </View>

        <View style={styles.itemsHeader}>
          <View>
            <Text style={styles.sectionTitle}>What did you wear?</Text>
            <Text style={styles.sectionHint}>Tap each closet item included in this outfit.</Text>
          </View>
          {!!selectedIds.length && <Text style={styles.selectedCount}>{selectedIds.length} selected</Text>}
        </View>

        {loadingItems ? <ActivityIndicator color="#7651e8" style={styles.loader} /> : null}
        {itemsError ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Could not load your closet</Text>
            <Text style={styles.statusText}>{itemsError}</Text>
            <Pressable accessibilityRole="button" onPress={loadItems} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {!loadingItems && !itemsError && !closetItems.length ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Your closet is empty</Text>
            <Text style={styles.statusText}>Add closet items before documenting an outfit.</Text>
          </View>
        ) : null}
        {!loadingItems && !itemsError && closetItems.length ? (
          <View style={styles.itemGrid}>
            {closetItems.map((item) => {
              const selected = selectedIds.includes(item.id)
              return (
                <Pressable
                  accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${item.name || 'closet item'}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={item.id}
                  onPress={() => toggleItem(item.id)}
                  style={[styles.itemCard, selected && styles.selectedItemCard]}
                >
                  <View style={styles.itemImage}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemPhoto} resizeMode="cover" /> : <Text style={styles.noPhoto}>No photo</Text>}
                    {selected && <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓</Text></View>}
                  </View>
                  <Text numberOfLines={1} style={styles.itemName}>{item.name || 'Unnamed item'}</Text>
                  <Text numberOfLines={1} style={styles.itemMeta}>{formatCategory(item.category)}</Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <Pressable accessibilityRole="button" disabled={saving || loadingItems} onPress={save} style={[styles.saveButton, (saving || loadingItems) && styles.disabledButton]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save outfit</Text>}
        </Pressable>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setShowPhotoOptions(false)} transparent visible={showPhotoOptions}>
        <View style={styles.modalBackdrop}>
          <View style={styles.photoModal}>
            <Text style={styles.modalTitle}>Add outfit photo</Text>
            <Pressable onPress={() => pickImage('camera')} style={styles.photoOption}><Text style={styles.photoOptionText}>Take a photo</Text></Pressable>
            <Pressable onPress={() => pickImage('library')} style={styles.photoOption}><Text style={styles.photoOptionText}>Choose from photo library</Text></Pressable>
            <Pressable onPress={() => setShowPhotoOptions(false)} style={styles.cancelOption}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 },
  content: { paddingBottom: 30, paddingHorizontal: 20, paddingTop: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backText: { color: '#7651e8', fontSize: 14, fontWeight: '700' },
  title: { color: '#19171d', fontSize: 22, fontWeight: '700' },
  headerSpacer: { width: 45 },
  subtitle: { color: '#756e7d', fontSize: 13, marginTop: 8 },
  photoPicker: { alignItems: 'center', backgroundColor: '#eee9ff', borderColor: '#d9ccff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, marginTop: 22, overflow: 'hidden', paddingVertical: 24 },
  photoIcon: { color: '#7651e8', fontSize: 29, fontWeight: '300' },
  previewFrame: { backgroundColor: '#ded3fb', height: 360, width: '100%' },
  preview: { height: '100%', width: '100%' },
  photoTitle: { color: '#7651e8', fontSize: 14, fontWeight: '700', marginTop: 4 },
  photoHint: { color: '#756e7d', fontSize: 11, marginTop: 4 },
  field: { marginTop: 15 },
  label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 10, borderWidth: 1, color: '#19171d', fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 },
  notesInput: { minHeight: 82, textAlignVertical: 'top' },
  itemsHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  sectionTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' },
  sectionHint: { color: '#756e7d', fontSize: 12, marginTop: 4 },
  selectedCount: { color: '#7651e8', fontSize: 12, fontWeight: '700' },
  loader: { marginVertical: 24 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, marginTop: 14, padding: 16 },
  statusTitle: { color: '#19171d', fontSize: 14, fontWeight: '700' },
  statusText: { color: '#756e7d', fontSize: 12, lineHeight: 18, marginTop: 5 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#eee9ff', borderRadius: 9, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { color: '#7651e8', fontSize: 12, fontWeight: '700' },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  itemCard: { width: '31%' },
  selectedItemCard: { opacity: 0.95 },
  itemImage: { alignItems: 'center', backgroundColor: '#eee9ff', borderColor: '#e7e2eb', borderRadius: 11, borderWidth: 1, height: 100, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  itemPhoto: { height: '100%', width: '100%' },
  noPhoto: { color: '#756e7d', fontSize: 11 },
  selectedBadge: { alignItems: 'center', backgroundColor: '#7651e8', borderColor: '#fff', borderRadius: 12, borderWidth: 2, height: 24, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 24 },
  selectedBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemName: { color: '#19171d', fontSize: 11, fontWeight: '700', marginTop: 5 },
  itemMeta: { color: '#756e7d', fontSize: 10, marginTop: 2 },
  errorText: { color: '#c0392b', fontSize: 12, marginTop: 14 },
  saveButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 11, marginTop: 24, paddingVertical: 13 },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBackdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 },
  photoModal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%' },
  modalTitle: { color: '#19171d', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  photoOption: { borderBottomColor: '#e7e2eb', borderBottomWidth: 1, paddingVertical: 15 },
  photoOptionText: { color: '#19171d', fontSize: 14 },
  cancelOption: { paddingTop: 15 },
  cancelText: { color: '#7651e8', fontSize: 14, fontWeight: '700', textAlign: 'center' },
})

export default DocumentOutfitScreen
