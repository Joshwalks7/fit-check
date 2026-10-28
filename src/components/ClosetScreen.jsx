import { useEffect, useMemo, useState } from 'react'
import { Image, Modal, RefreshControl, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { supabase } from '../lib/supabase.js'

const categories = ['Hats', 'Accessories', 'Shirts', 'Pants', 'Shoes', 'Outerwear']

const categoryLabel = value => categories.find(label => label.toLowerCase() === value) || value || 'Uncategorized'
const formatTags = values => Array.isArray(values) && values.length
  ? values.map(value => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())).join(', ')
  : 'Not specified'

async function loadClosetItems() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Please sign in to view your closet.')

  // Page through all owned items instead of stopping at the API row limit.
  const rows = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('clothing_items')
      .select('id, name, description, category, color, brand, size, seasons, styles, clothing_item_images(file_path)')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }

  const paths = [...new Set(rows.flatMap(row =>
    (row.clothing_item_images || []).map(image => image.file_path).filter(Boolean)))]
  const imageUrls = new Map()
  let photoWarning = ''

  if (paths.length) {
    try {
      // Signed URLs work for private buckets without making photos public.
      const { data, error } = await supabase.storage
        .from('Clothing_item_pics')
        .createSignedUrls(paths, 3600)
      if (error) throw error
      for (const image of data || []) {
        if (image.path && image.signedUrl && !image.error) imageUrls.set(image.path, image.signedUrl)
      }
      if (imageUrls.size < paths.length) photoWarning = 'Some photos could not be loaded. Refresh to try again.'
    } catch (error) {
      console.warn('Closet photo loading failed:', error)
      photoWarning = 'Your items loaded, but their photos could not be loaded. Refresh to try again.'
    }
  }

  return {
    items: rows.map(row => ({
      ...row,
      category: categoryLabel(row.category),
      imageUrl: (row.clothing_item_images || [])
        .map(image => imageUrls.get(image.file_path)).find(Boolean) || null,
    })),
    photoWarning,
  }
}

function ClosetScreen({ onAddItem }) {
  const [openCategories, setOpenCategories] = useState(categories)
  const [closetItems, setClosetItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [photoWarning, setPhotoWarning] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    let active = true
    loadClosetItems().then(result => {
      if (!active) return
      setClosetItems(result.items)
      setPhotoWarning(result.photoWarning)
    }).catch(error => {
      if (!active) return
      console.warn('Closet loading failed:', error)
      setClosetItems([])
      setLoadError(error?.message || 'Your closet could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [reloadKey])

  const refreshCloset = () => {
    setLoading(true)
    setLoadError('')
    setPhotoWarning('')
    setSelectedItem(null)
    setReloadKey(current => current + 1)
  }

  const filteredItems = useMemo(() => closetItems.filter((item) => {
    const matchesQuery = `${item.name || ''} ${item.description || ''} ${item.category}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = selectedFilter === 'All' || item.category === selectedFilter
    return matchesQuery && matchesFilter
  }), [closetItems, query, selectedFilter])

  const visibleCategories = [...new Set([...categories, ...closetItems.map(item => item.category)])]

  const toggleCategory = (category) => {
    setOpenCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category])
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshCloset} tintColor="#7651e8" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My closet</Text>
            <Text style={styles.subtitle}>{loading ? 'Loading your closet…' : loadError ? 'Closet unavailable' : `${closetItems.length} ${closetItems.length === 1 ? 'piece' : 'pieces'} in your wardrobe`}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onAddItem} style={styles.addButton}>
            <Text style={styles.addButtonText}>＋ Add item</Text>
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <TextInput
            accessibilityLabel="Search your closet"
            onChangeText={setQuery}
            placeholder="⌕  Search your closet"
            placeholderTextColor="#756e7d"
            style={styles.searchInput}
            value={query}
          />
          <Pressable accessibilityRole="button" onPress={() => setShowFilters(true)} style={styles.filterButton}>
            <Text style={styles.filterButtonText}>☷ Filter</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" disabled={loading} onPress={refreshCloset} style={styles.refreshButton}>
          <Text style={styles.filterButtonText}>{loading ? 'Loading…' : '↻ Refresh closet'}</Text>
        </Pressable>
        {loadError ? (
          <View style={styles.statusCard}>
            <Text style={styles.itemName}>Could not load your closet</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
            <Text style={styles.emptyText}>Use Refresh closet to try again.</Text>
          </View>
        ) : null}
        {photoWarning ? <Text style={styles.emptyText}>{photoWarning}</Text> : null}
        {!loading && !loadError && closetItems.length === 0 ? (
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Your closet is empty</Text>
            <Text style={styles.emptyText}>Tap Add item to save your first piece.</Text>
          </View>
        ) : null}
        {!loading && !loadError && closetItems.length > 0 && filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>No items match your search or filter.</Text>
        ) : null}

        {!loading && !loadError && visibleCategories.map((category) => {
          const items = filteredItems.filter((item) => item.category === category)
          const isOpen = openCategories.includes(category)

          return (
            <View key={category} style={styles.section}>
              <Pressable accessibilityRole="button" onPress={() => toggleCategory(category)} style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.chevron}>{isOpen ? '⌄' : '›'}</Text>
                  <Text style={styles.sectionTitle}>{category}</Text>
                  <Text style={styles.sectionCount}>{items.length}</Text>
                </View>
              </Pressable>
              {isOpen && (
                <View style={styles.grid}>
                  {items.length ? items.map((item) => (
                    <Pressable accessibilityRole="button" key={item.id} onPress={() => setSelectedItem(item)} style={styles.itemCard}>
                      <View style={styles.itemImage}>
                        <ItemPhoto key={item.imageUrl || 'missing'} uri={item.imageUrl} name={item.name} />
                      </View>
                      <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                      <Text numberOfLines={1} style={styles.itemDescription}>{item.description}</Text>
                    </Pressable>
                  )) : <Text style={styles.emptyText}>No items match this filter.</Text>}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setSelectedItem(null)} transparent visible={Boolean(selectedItem)}>
        <View style={styles.modalBackdrop}>
          {selectedItem && <ItemDetails item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setShowFilters(false)} transparent visible={showFilters}>
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Filter closet</Text><Pressable onPress={() => setShowFilters(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
            {['All', ...visibleCategories].map((filter) => <Pressable key={filter} onPress={() => { setSelectedFilter(filter); setShowFilters(false) }} style={styles.filterOption}><Text style={[styles.filterOptionText, filter === selectedFilter && styles.selectedFilter]}>{filter}</Text><Text style={styles.radio}>{filter === selectedFilter ? '●' : '○'}</Text></Pressable>)}
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ItemPhoto({ uri, name }) {
  const [failed, setFailed] = useState(false)
  return uri && !failed ? (
    <Image accessibilityLabel={name || 'Clothing photo'} source={{ uri }} style={styles.photo} resizeMode="cover" onError={() => setFailed(true)} />
  ) : <Text style={styles.emptyText}>{uri ? 'Photo unavailable' : 'No photo'}</Text>
}

function ItemDetails({ item, onClose }) {
  const facts = [
    ['Category', item.category], ['Color', item.color], ['Brand', item.brand],
    ['Size', item.size], ['Seasons', formatTags(item.seasons)], ['Styles', formatTags(item.styles)],
  ]
  return (
    <View style={styles.detailCard}>
      <ScrollView>
        <View style={styles.detailImage}>
          <ItemPhoto key={item.imageUrl || 'missing'} uri={item.imageUrl} name={item.name} />
          <Pressable accessibilityRole="button" accessibilityLabel="Close item details" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailTitle}>{item.name}</Text>
          {item.description ? <Text style={styles.detailDescription}>{item.description}</Text> : null}
          <View style={styles.facts}>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>{value || 'Not specified'}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.editButton}>
            <Text style={styles.editButtonText}>Close details</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: 18, paddingTop: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: '#19171d', fontSize: 26, fontWeight: '600', letterSpacing: -0.7 },
  subtitle: { color: '#756e7d', fontSize: 12, marginTop: 5 },
  addButton: { backgroundColor: '#7651e8', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 9, borderWidth: 1, color: '#19171d', flex: 1, fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 },
  filterButton: { backgroundColor: '#eee9ff', borderRadius: 9, justifyContent: 'center', paddingHorizontal: 11 },
  filterButtonText: { color: '#7651e8', fontSize: 12, fontWeight: '700' },
  section: { borderBottomColor: '#e7e2eb', borderBottomWidth: 1, paddingVertical: 13 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  chevron: { color: '#756e7d', fontSize: 20, lineHeight: 18, width: 14 },
  sectionTitle: { color: '#19171d', fontSize: 15, fontWeight: '700' },
  sectionCount: { color: '#756e7d', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12 },
  itemCard: { width: '31%' },
  itemImage: { alignItems: 'center', backgroundColor: '#eee9ff', borderRadius: 11, height: 90, justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  refreshButton: { alignSelf: 'flex-start', paddingVertical: 10 },
  statusCard: { backgroundColor: '#fff', borderRadius: 11, marginVertical: 12, padding: 16 },
  itemName: { color: '#19171d', fontSize: 11, fontWeight: '700', marginTop: 5 },
  itemDescription: { color: '#756e7d', fontSize: 10, marginTop: 2 },
  emptyText: { color: '#756e7d', fontSize: 12, paddingVertical: 8 },
  modalBackdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 },
  detailCard: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '90%', maxWidth: 380, overflow: 'hidden', width: '100%' },
  detailImage: { alignItems: 'center', backgroundColor: '#ded3fb', height: 220, justifyContent: 'center', position: 'relative' },
  closeButton: { alignItems: 'center', backgroundColor: '#ffffffcc', borderRadius: 16, height: 31, justifyContent: 'center', position: 'absolute', right: 11, top: 11, width: 31 },
  closeText: { color: '#19171d', fontSize: 22, lineHeight: 24 },
  detailContent: { padding: 16 },
  detailTitle: { color: '#19171d', fontSize: 20, fontWeight: '700' },
  detailDescription: { color: '#756e7d', fontSize: 12, lineHeight: 17, marginTop: 5 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 18 },
  fact: { width: '42%' },
  factLabel: { color: '#756e7d', fontSize: 10, marginBottom: 3 },
  factValue: { color: '#19171d', fontSize: 12, fontWeight: '600' },
  editButton: { backgroundColor: '#7651e8', borderRadius: 9, marginTop: 19, paddingVertical: 11 },
  editButtonText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  filterModal: { backgroundColor: '#fff', borderRadius: 18, maxWidth: 380, padding: 18, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { color: '#19171d', fontSize: 18, fontWeight: '700' },
  filterOption: { alignItems: 'center', borderBottomColor: '#e7e2eb', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13 },
  filterOptionText: { color: '#19171d', fontSize: 14 },
  selectedFilter: { color: '#7651e8', fontWeight: '700' },
  radio: { color: '#7651e8', fontSize: 16 },
})

export default ClosetScreen
