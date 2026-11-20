import { useEffect, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { deleteMarketplaceListing, fetchMyListings, setMarketplaceListingStatus } from '../services/marketplace.js'
import EditListingScreen from './EditListingScreen.jsx'
import ListingDetailsScreen from './ListingDetailsScreen.jsx'

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `$${Number(price || 0).toFixed(2)}`
}

function MyListingRow({ listing, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowImage}><Text style={styles.rowImageText}>{listing.images?.some((image) => image.imageUrl) ? 'Photo' : 'No photo'}</Text></View>
      <View style={styles.rowContent}><Text numberOfLines={1} style={styles.rowTitle}>{listing.title}</Text><Text style={styles.rowMeta}>{formatPrice(listing.price)} · {labelize(listing.condition)}</Text><Text style={styles.rowStatus}>{labelize(listing.status)}</Text></View>
    </Pressable>
  )
}

function MyListingsScreen({ onBack }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedListing, setSelectedListing] = useState(null)
  const [editingListing, setEditingListing] = useState(null)

  const loadListings = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      setListings(await fetchMyListings())
    } catch (loadError) {
      setError(loadError?.message || 'Your listings could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const runStatusAction = async (listing, status) => {
    try {
      await setMarketplaceListingStatus(listing.listing_id, status)
      const refreshedListings = await fetchMyListings()
      setListings(refreshedListings)
      setSelectedListing(refreshedListings.find((item) => item.listing_id === listing.listing_id) || null)
    } catch (actionError) {
      Alert.alert('Could not update listing', actionError?.message || 'The listing status could not be changed.')
    }
  }

  const deleteListing = (listing) => {
    deleteMarketplaceListing(listing.listing_id)
      .then(async () => {
        setSelectedListing(null)
        await loadListings({ refresh: true })
      })
      .catch((actionError) => Alert.alert('Could not delete listing', actionError?.message || 'The listing could not be deleted.'))
  }

  useEffect(() => {
    let cancelled = false
    fetchMyListings()
      .then((data) => { if (!cancelled) setListings(data) })
      .catch((loadError) => { if (!cancelled) setError(loadError?.message || 'Your listings could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (editingListing) return <EditListingScreen listing={editingListing} onBack={() => setEditingListing(null)} onSaved={() => { setEditingListing(null); loadListings({ refresh: true }) }} />
  if (selectedListing) return <ListingDetailsScreen listing={selectedListing} ownerMode onBack={() => setSelectedListing(null)} onDelete={() => deleteListing(selectedListing)} onEdit={() => setEditingListing(selectedListing)} onStatusChange={(status) => runStatusAction(selectedListing, status)} />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => loadListings({ refresh: true })} refreshing={refreshing} tintColor="#7651e8" />}>
        <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.backText}>‹ Marketplace</Text></Pressable><Text style={styles.title}>My listings</Text><View style={styles.spacer} /></View>
        <Text style={styles.subtitle}>Drafts stay here and are not visible in the public marketplace.</Text>
        {loading ? <Text style={styles.message}>Loading your listings…</Text> : null}
        {error ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Could not load your listings</Text><Text style={styles.message}>{error}</Text></View> : null}
        {!loading && !error && !listings.length ? <View style={styles.statusCard}><Text style={styles.statusTitle}>No listings yet</Text><Text style={styles.message}>Your drafts and published listings will appear here.</Text></View> : null}
        {!loading && !error ? listings.map((listing) => <MyListingRow key={listing.listing_id} listing={listing} onPress={() => setSelectedListing(listing)} />) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { padding: 18, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 12 }, backText: { color: '#7651e8', fontSize: 14, fontWeight: '700', minWidth: 100 }, title: { color: '#19171d', flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' }, spacer: { minWidth: 100 }, subtitle: { color: '#756e7d', fontSize: 13, lineHeight: 19 }, row: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, padding: 10 }, rowImage: { alignItems: 'center', backgroundColor: '#eee9f7', borderRadius: 10, height: 72, justifyContent: 'center', width: 72 }, rowImageText: { color: '#756e7d', fontSize: 11 }, rowContent: { flex: 1 }, rowTitle: { color: '#19171d', fontSize: 15, fontWeight: '700' }, rowMeta: { color: '#756e7d', fontSize: 12, marginTop: 5 }, rowStatus: { color: '#5d3bbd', fontSize: 12, fontWeight: '700', marginTop: 5 }, statusCard: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, marginTop: 18, padding: 16 }, statusTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' }, message: { color: '#756e7d', fontSize: 13, lineHeight: 20, marginTop: 8 },
})

export default MyListingsScreen
