import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { fetchActiveListings, saveListing, unsaveListing } from '../services/marketplace.js'
import ListingDetailsScreen from './ListingDetailsScreen.jsx'

const CATEGORIES = ['All', 'Hats', 'Accessories', 'Shirts', 'Pants', 'Shoes', 'Outerwear']

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `$${Number(price || 0).toFixed(2)}`
}

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ListingCard({ listing, onPress, onToggleSaved }) {
  const [failed, setFailed] = useState(false)
  const sellerName = listing.seller?.full_name || 'FitCheck seller'
  const imageUrl = listing.imageUrl

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardImage}>
        {imageUrl && !failed ? <Image accessibilityLabel={`${listing.title} photo`} onError={() => setFailed(true)} source={{ uri: imageUrl }} style={styles.cardPhoto} /> : <View style={styles.cardPlaceholder}><Text style={styles.cardPlaceholderMark}>＋</Text><Text style={styles.cardPlaceholderText}>No photo</Text></View>}
        {onToggleSaved ? <Pressable accessibilityLabel={listing.isSaved ? 'Remove saved listing' : 'Save listing'} accessibilityRole="button" onPress={() => onToggleSaved(listing)} style={styles.saveButton}><Text style={styles.saveButtonText}>{listing.isSaved ? '♥' : '♡'}</Text></Pressable> : null}
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

function MarketplaceScreen({ onCreateListing, onMyListings, onMessageSeller }) {
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

  const toggleSaved = async (listing) => {
    const nextSaved = !listing.isSaved
    setListings((current) => current.map((item) => item.listing_id === listing.listing_id ? { ...item, isSaved: nextSaved } : item))
    setSelectedListing((current) => current?.listing_id === listing.listing_id ? { ...current, isSaved: nextSaved } : current)
    try {
      if (nextSaved) await saveListing(listing.listing_id)
      else await unsaveListing(listing.listing_id)
    } catch (saveError) {
      setListings((current) => current.map((item) => item.listing_id === listing.listing_id ? { ...item, isSaved: !nextSaved } : item))
      setSelectedListing((current) => current?.listing_id === listing.listing_id ? { ...current, isSaved: !nextSaved } : current)
      setError(saveError?.message || 'The saved listing could not be updated.')
    }
  }

  if (selectedListing) return <ListingDetailsScreen isOwner={selectedListing.isOwner} isSaved={selectedListing.isSaved} listing={selectedListing} onBack={() => setSelectedListing(null)} onMessageSeller={onMessageSeller} onToggleSaved={toggleSaved} />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => loadListings({ pullToRefresh: true })} refreshing={refreshing} tintColor="#7651e8" />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.flex}><Text style={styles.title}>Marketplace</Text><Text style={styles.subtitle}>Discover clothing from the FitCheck community.</Text></View><Pressable accessibilityRole="button" onPress={onMyListings} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>My marketplace</Text></Pressable></View>
        <View style={styles.toolbar}><TextInput accessibilityLabel="Search marketplace" onChangeText={setQuery} placeholder="⌕  Search listings" placeholderTextColor="#756e7d" style={styles.searchInput} value={query} /></View>
        <ScrollView contentContainerStyle={styles.categoryRow} horizontal showsHorizontalScrollIndicator={false}>{CATEGORIES.map((category) => <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.categoryChip, selectedCategory === category && styles.selectedCategoryChip]}><Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>{category}</Text></Pressable>)}</ScrollView>
        {error ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Marketplace unavailable</Text><Text style={styles.statusText}>{error}</Text><Pressable onPress={() => loadListings()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}
        {loading ? <Text style={styles.statusText}>Loading listings…</Text> : null}
        {!loading && !error && filteredListings.length === 0 ? <View style={styles.statusCard}><Text style={styles.statusTitle}>No listings found</Text><Text style={styles.statusText}>{listings.length ? 'Try another search or category.' : 'Listings from the FitCheck community will appear here.'}</Text></View> : null}
        {!loading && !error && filteredListings.length > 0 ? <View style={styles.grid}>{filteredListings.map((listing) => <ListingCard key={listing.listing_id} listing={listing} onPress={() => setSelectedListing(listing)} onToggleSaved={listing.isOwner ? null : toggleSaved} />)}</View> : null}
      </ScrollView>
      <Pressable accessibilityLabel="Create marketplace listing" accessibilityRole="button" onPress={onCreateListing} style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>＋</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { paddingBottom: 96, paddingHorizontal: 18, paddingTop: 22 }, flex: { flex: 1 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 }, title: { color: '#19171d', fontSize: 26, fontWeight: '600' }, subtitle: { color: '#756e7d', flex: 1, fontSize: 13, marginTop: 6 }, secondaryAction: { paddingHorizontal: 10, paddingVertical: 4 }, secondaryActionText: { color: '#5d3bbd', fontSize: 11, fontWeight: '700' }, toolbar: { marginTop: 18 }, searchInput: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 }, categoryRow: { gap: 8, paddingVertical: 14 }, categoryChip: { borderColor: '#e2dce9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, selectedCategoryChip: { backgroundColor: '#7651e8', borderColor: '#7651e8' }, categoryText: { color: '#756e7d', fontSize: 12, fontWeight: '600' }, selectedCategoryText: { color: '#fff' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, overflow: 'hidden', width: '48.2%' }, cardImage: { height: 150, overflow: 'hidden' }, cardPhoto: { height: '100%', width: '100%' }, cardPlaceholder: { alignItems: 'center', backgroundColor: '#eee9f7', flex: 1, justifyContent: 'center' }, cardPlaceholderMark: { color: '#7651e8', fontSize: 28, fontWeight: '700' }, cardPlaceholderText: { color: '#756e7d', fontSize: 11, marginTop: 4 }, saveButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, height: 36, justifyContent: 'center', position: 'absolute', right: 8, top: 8, width: 36 }, saveButtonText: { color: '#7651e8', fontSize: 22, lineHeight: 25 }, cardBody: { padding: 11 }, cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 5 }, cardTitle: { color: '#19171d', flex: 1, fontSize: 14, fontWeight: '700' }, cardPrice: { color: '#7651e8', fontSize: 13, fontWeight: '800' }, cardMeta: { color: '#756e7d', fontSize: 11, marginTop: 6, textTransform: 'capitalize' }, cardSeller: { color: '#3e3944', fontSize: 11, marginTop: 7 }, cardLocation: { color: '#756e7d', fontSize: 10, marginTop: 3 }, statusCard: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 18 }, statusTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' }, statusText: { color: '#756e7d', fontSize: 13, lineHeight: 20, marginTop: 7 }, retryButton: { alignSelf: 'flex-start', backgroundColor: '#7651e8', borderRadius: 10, marginTop: 12, paddingHorizontal: 13, paddingVertical: 9 }, retryText: { color: '#fff', fontSize: 12, fontWeight: '700' }, floatingButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 30, bottom: 20, elevation: 5, height: 58, justifyContent: 'center', position: 'absolute', right: 20, shadowColor: '#2d1b6e', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.24, shadowRadius: 6, width: 58 }, floatingButtonText: { color: '#fff', fontSize: 30, fontWeight: '400', lineHeight: 34 },
})

export default MarketplaceScreen
