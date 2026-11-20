import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { fetchActiveListings } from '../services/marketplace.js'
import ListingDetailsScreen from './ListingDetailsScreen.jsx'

const CATEGORIES = ['All', 'Hats', 'Accessories', 'Shirts', 'Pants', 'Shoes', 'Outerwear']

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `$${Number(price || 0).toFixed(2)}`
}

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ListingCard({ listing, onPress, prototype = false }) {
  const [failed, setFailed] = useState(false)
  const sellerName = listing.seller?.full_name || (prototype ? 'Preview seller' : 'FitCheck seller')
  const imageUrl = listing.imageUrl

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={[styles.cardImage, prototype && { backgroundColor: listing.prototypeColor }]}>
        {imageUrl && !failed ? <Image accessibilityLabel={`${listing.title} photo`} onError={() => setFailed(true)} source={{ uri: imageUrl }} style={styles.cardPhoto} /> : <View style={styles.cardPlaceholder}><Text style={styles.cardPlaceholderMark}>{prototype ? listing.prototypeMark : '＋'}</Text><Text style={styles.cardPlaceholderText}>{prototype ? 'Draft card' : 'No photo'}</Text></View>}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}><Text numberOfLines={1} style={styles.cardTitle}>{listing.title}</Text><Text style={styles.cardPrice}>{formatPrice(listing.price)}</Text></View>
        <Text numberOfLines={1} style={styles.cardMeta}>{labelize(listing.condition)} · {listing.category}</Text>
        <Text numberOfLines={1} style={styles.cardSeller}>{sellerName}</Text>
        {listing.location_label ? <Text numberOfLines={1} style={styles.cardLocation}>{listing.location_label}</Text> : null}
      </View>
    </Pressable>
  )
}

function MarketplaceScreen({ onCreateListing, onMyListings }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedListing, setSelectedListing] = useState(null)

  const loadListings = async ({ pullToRefresh = false } = {}) => {
    if (pullToRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      setListings(await fetchActiveListings())
    } catch (loadError) {
      console.warn('Marketplace loading failed:', loadError)
      setError(loadError?.message || 'The marketplace could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    fetchActiveListings()
      .then((data) => {
        if (!cancelled) {
          setListings(data)
          setError('')
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          console.warn('Marketplace loading failed:', loadError)
          setError(loadError?.message || 'The marketplace could not be loaded.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const filteredListings = useMemo(() => listings.filter((listing) => {
    const haystack = [listing.title, listing.description, listing.category, listing.brand, listing.color, listing.size].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query.trim().toLowerCase()) && (selectedCategory === 'All' || listing.category?.toLowerCase() === selectedCategory.toLowerCase())
  }), [listings, query, selectedCategory])

  if (selectedListing) return <ListingDetailsScreen listing={selectedListing} onBack={() => setSelectedListing(null)} />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => loadListings({ pullToRefresh: true })} refreshing={refreshing} tintColor="#7651e8" />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.flex}><Text style={styles.title}>Marketplace</Text><Text style={styles.subtitle}>Discover clothing from the FitCheck community.</Text></View><View style={styles.headerActions}><Pressable accessibilityRole="button" onPress={onMyListings} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>My listings</Text></Pressable><Pressable accessibilityRole="button" onPress={onCreateListing} style={styles.headerAction}><Text style={styles.headerActionText}>Sell something</Text></Pressable></View></View>
        <View style={styles.toolbar}><TextInput accessibilityLabel="Search marketplace" onChangeText={setQuery} placeholder="⌕  Search listings" placeholderTextColor="#756e7d" style={styles.searchInput} value={query} /></View>
        <ScrollView contentContainerStyle={styles.categoryRow} horizontal showsHorizontalScrollIndicator={false}>{CATEGORIES.map((category) => <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.categoryChip, selectedCategory === category && styles.selectedCategoryChip]}><Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>{category}</Text></Pressable>)}</ScrollView>
        {error ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Marketplace unavailable</Text><Text style={styles.statusText}>{error}</Text><Pressable onPress={() => loadListings()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}
        {loading ? <Text style={styles.statusText}>Loading listings…</Text> : null}
        {!loading && !error && filteredListings.length === 0 ? <View style={styles.statusCard}><Text style={styles.statusTitle}>No listings found</Text><Text style={styles.statusText}>{listings.length ? 'Try another search or category.' : 'Listings from the FitCheck community will appear here.'}</Text></View> : null}
        {!loading && !error && filteredListings.length > 0 ? <View style={styles.grid}>{filteredListings.map((listing) => <ListingCard key={listing.listing_id} listing={listing} onPress={() => setSelectedListing(listing)} />)}</View> : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { paddingBottom: 36, paddingHorizontal: 18, paddingTop: 22 }, flex: { flex: 1 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 }, headerActions: { alignItems: 'flex-end', gap: 6 }, title: { color: '#19171d', fontSize: 26, fontWeight: '600' }, subtitle: { color: '#756e7d', fontSize: 13, marginTop: 6 }, headerAction: { backgroundColor: '#eee9fb', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 }, headerActionText: { color: '#5d3bbd', fontSize: 12, fontWeight: '700' }, secondaryAction: { paddingHorizontal: 10, paddingVertical: 4 }, secondaryActionText: { color: '#5d3bbd', fontSize: 11, fontWeight: '700' }, toolbar: { marginTop: 18 }, searchInput: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 }, categoryRow: { gap: 8, paddingVertical: 14 }, categoryChip: { borderColor: '#e2dce9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, selectedCategoryChip: { backgroundColor: '#7651e8', borderColor: '#7651e8' }, categoryText: { color: '#756e7d', fontSize: 12, fontWeight: '600' }, selectedCategoryText: { color: '#fff' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, overflow: 'hidden', width: '48.2%' }, cardImage: { backgroundColor: '#eee9f7', height: 150, overflow: 'hidden' }, cardPhoto: { height: '100%', width: '100%' }, cardPlaceholder: { alignItems: 'center', flex: 1, justifyContent: 'center' }, cardPlaceholderMark: { color: '#7651e8', fontSize: 28, fontWeight: '700' }, cardPlaceholderText: { color: '#756e7d', fontSize: 11, marginTop: 4 }, cardBody: { padding: 11 }, cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 5 }, cardTitle: { color: '#19171d', flex: 1, fontSize: 14, fontWeight: '700' }, cardPrice: { color: '#7651e8', fontSize: 13, fontWeight: '800' }, cardMeta: { color: '#756e7d', fontSize: 11, marginTop: 6, textTransform: 'capitalize' }, cardSeller: { color: '#3e3944', fontSize: 11, marginTop: 7 }, cardLocation: { color: '#756e7d', fontSize: 10, marginTop: 3 }, statusCard: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 18 }, statusTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' }, statusText: { color: '#756e7d', fontSize: 13, lineHeight: 20, marginTop: 7 }, retryButton: { alignSelf: 'flex-start', backgroundColor: '#7651e8', borderRadius: 10, marginTop: 12, paddingHorizontal: 13, paddingVertical: 9 }, retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})

export default MarketplaceScreen
