import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

const categories = ['Hats', 'Accessories', 'Shirts', 'Pants', 'Shoes', 'Outerwear']

const mockItems = [
  { id: 'hat-1', category: 'Hats', name: 'Brown cap', description: 'Everyday neutral', color: 'Brown', brand: 'New Era', size: 'One size', season: 'All season', style: 'Casual', notes: 'Easy everyday hat.' },
  { id: 'hat-2', category: 'Hats', name: 'Black beanie', description: 'Soft knit', color: 'Black', brand: 'Carhartt', size: 'One size', season: 'Winter', style: 'Streetwear', notes: 'Warm and simple.' },
  { id: 'accessory-1', category: 'Accessories', name: 'Silver watch', description: 'Minimal detail', color: 'Silver', brand: 'Casio', size: 'Adjustable', season: 'All season', style: 'Minimal', notes: 'Works with dressier outfits.' },
  { id: 'shirt-1', category: 'Shirts', name: 'Vintage tee', description: 'Faded graphic', color: 'Washed black', brand: 'Thrifted', size: 'Medium', season: 'All season', style: 'Casual', notes: 'Relaxed cotton fit.' },
  { id: 'shirt-2', category: 'Shirts', name: 'Oxford shirt', description: 'Clean cotton', color: 'White', brand: 'Uniqlo', size: 'Medium', season: 'Spring/Fall', style: 'Smart casual', notes: 'Good for layering.' },
  { id: 'pants-1', category: 'Pants', name: 'Straight jeans', description: 'Classic denim', color: 'Blue', brand: 'Levi’s', size: '32 x 30', season: 'All season', style: 'Casual', notes: 'Favorite everyday pair.' },
  { id: 'shoes-1', category: 'Shoes', name: 'Canvas sneakers', description: 'Daily pair', color: 'Off-white', brand: 'Converse', size: '10', season: 'Spring/Summer', style: 'Casual', notes: 'Comfortable for campus.' },
  { id: 'outerwear-1', category: 'Outerwear', name: 'Denim jacket', description: 'Light layer', color: 'Medium blue', brand: 'Levi’s', size: 'Medium', season: 'Spring/Fall', style: 'Casual', notes: 'Great transitional layer.' },
]

function ClosetScreen({ onAddItem }) {
  const [openCategories, setOpenCategories] = useState([])
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const filteredItems = useMemo(() => mockItems.filter((item) => {
    const matchesQuery = `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = selectedFilter === 'All' || item.category === selectedFilter
    return matchesQuery && matchesFilter
  }), [query, selectedFilter])

  const toggleCategory = (category) => {
    setOpenCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category])
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My closet</Text>
            <Text style={styles.subtitle}>{mockItems.length} pieces in your wardrobe</Text>
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

        {categories.map((category) => {
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
                {isOpen && <Text style={styles.sectionMeta}>Newest</Text>}
              </Pressable>
              {isOpen && (
                <View style={styles.grid}>
                  {items.length ? items.map((item, index) => (
                    <Pressable accessibilityRole="button" key={item.id} onPress={() => setSelectedItem(item)} style={styles.itemCard}>
                      <View style={[styles.itemImage, imageColors[index % imageColors.length]]}>
                        <View style={styles.mockClothing} />
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
            {['All', ...categories].map((filter) => <Pressable key={filter} onPress={() => { setSelectedFilter(filter); setShowFilters(false) }} style={styles.filterOption}><Text style={[styles.filterOptionText, filter === selectedFilter && styles.selectedFilter]}>{filter}</Text><Text style={styles.radio}>{filter === selectedFilter ? '●' : '○'}</Text></Pressable>)}
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ItemDetails({ item, onClose }) {
  const facts = [['Category', item.category], ['Color', item.color], ['Brand', item.brand], ['Size', item.size], ['Season', item.season], ['Style', item.style]]
  return <View style={styles.detailCard}><View style={styles.detailImage}><Pressable accessibilityLabel="Close item details" onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable><View style={styles.largeMockClothing} /></View><View style={styles.detailContent}><Text style={styles.detailTitle}>{item.name}</Text><Text style={styles.detailDescription}>{item.description}. {item.notes}</Text><View style={styles.facts}>{facts.map(([label, value]) => <View key={label} style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>)}</View><Pressable onPress={onClose} style={styles.editButton}><Text style={styles.editButtonText}>Close details</Text></Pressable></View></View>
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
  sectionMeta: { color: '#756e7d', fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12 },
  itemCard: { width: '31%' },
  itemImage: { alignItems: 'center', borderRadius: 11, height: 90, justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 7 },
  peachImage: { backgroundColor: '#f5cfb9' },
  lilacImage: { backgroundColor: '#ded3fb' },
  blueImage: { backgroundColor: '#c8d5ee' },
  mockClothing: { backgroundColor: '#42385e', borderRadius: 20, height: 60, width: 45 },
  itemName: { color: '#19171d', fontSize: 11, fontWeight: '700', marginTop: 5 },
  itemDescription: { color: '#756e7d', fontSize: 10, marginTop: 2 },
  emptyText: { color: '#756e7d', fontSize: 12, paddingVertical: 8 },
  modalBackdrop: { alignItems: 'center', backgroundColor: '#19171d99', flex: 1, justifyContent: 'center', padding: 20 },
  detailCard: { backgroundColor: '#fff', borderRadius: 20, maxWidth: 380, overflow: 'hidden', width: '100%' },
  detailImage: { alignItems: 'center', backgroundColor: '#ded3fb', height: 220, justifyContent: 'center', position: 'relative' },
  largeMockClothing: { backgroundColor: '#42385e', borderRadius: 32, height: 145, width: 105 },
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

const imageColors = [styles.peachImage, styles.lilacImage, styles.blueImage]

export default ClosetScreen
