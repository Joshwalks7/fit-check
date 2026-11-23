import { useEffect, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { deleteMarketplaceListing, fetchMyListings, fetchSavedListings, saveListing, setMarketplaceListingStatus, unsaveListing } from '../services/marketplace.js'
import EditListingScreen from './EditListingScreen.jsx'
import ListingDetailsScreen from './ListingDetailsScreen.jsx'
import ConversationsScreen from './ConversationsScreen.jsx'

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

function MyListingsScreen({ onBack, initialTab = 'listings', onOpenConversation }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedListing, setSelectedListing] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [savedListings, setSavedListings] = useState([])
  const [activeTab, setActiveTab] = useState(initialTab)

  const loadListings = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [myListings, saved] = await Promise.all([fetchMyListings(), fetchSavedListings()])
      setListings(myListings)
      setSavedListings(saved)
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
    Promise.all([fetchMyListings(), fetchSavedListings()])
      .then(([myListings, saved]) => {
        if (!cancelled) {
          setListings(myListings)
          setSavedListings(saved)
        }
      })
      .catch((loadError) => { if (!cancelled) setError(loadError?.message || 'Your listings could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleSaved = async (listing) => {
    const nextSaved = !listing.isSaved
    setSavedListings((current) => nextSaved
      ? [...current, { ...listing, isSaved: true }]
      : current.filter((item) => item.listing_id !== listing.listing_id))
    setSelectedListing((current) => current?.listing_id === listing.listing_id ? { ...current, isSaved: nextSaved } : current)
    try {
      if (nextSaved) await saveListing(listing.listing_id)
      else await unsaveListing(listing.listing_id)
    } catch (saveError) {
      setSavedListings((current) => nextSaved
        ? current.filter((item) => item.listing_id !== listing.listing_id)
        : [...current, { ...listing, isSaved: true }])
      setSelectedListing((current) => current?.listing_id === listing.listing_id ? { ...current, isSaved: !nextSaved } : current)
      Alert.alert('Could not update saved listing', saveError?.message || 'The saved listing could not be updated.')
    }
  }

  if (editingListing) return <EditListingScreen listing={editingListing} onBack={() => setEditingListing(null)} onSaved={() => { setEditingListing(null); loadListings({ refresh: true }) }} />
  if (selectedListing) return <ListingDetailsScreen isSaved={selectedListing.isSaved} listing={selectedListing} ownerMode={activeTab === 'listings'} onBack={() => setSelectedListing(null)} onDelete={() => deleteListing(selectedListing)} onEdit={() => setEditingListing(selectedListing)} onStatusChange={(status) => runStatusAction(selectedListing, status)} onToggleSaved={toggleSaved} />

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => loadListings({ refresh: true })} refreshing={refreshing} tintColor="#7651e8" />}>
        <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.backText}>‹ Marketplace</Text></Pressable><Text style={styles.title}>My marketplace</Text><View style={styles.headerSpacer} /></View>
        <View style={styles.tabBar}><Pressable onPress={() => setActiveTab('listings')} style={[styles.tab, activeTab === 'listings' && styles.activeTab]}><Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>My listings</Text></Pressable><Pressable onPress={() => setActiveTab('saved')} style={[styles.tab, activeTab === 'saved' && styles.activeTab]}><Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text></Pressable><Pressable onPress={() => setActiveTab('messages')} style={[styles.tab, activeTab === 'messages' && styles.activeTab]}><Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text></Pressable></View>
        {activeTab === 'messages' ? <ConversationsScreen embedded onBack={() => setActiveTab('listings')} onOpenConversation={onOpenConversation} /> : <>
        <Text style={styles.subtitle}>{activeTab === 'listings' ? 'Drafts stay here and are not visible in the public marketplace.' : 'Listings you saved for later.'}</Text>
        {loading ? <Text style={styles.message}>Loading your listings…</Text> : null}
        {error ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Could not load your listings</Text><Text style={styles.message}>{error}</Text></View> : null}
        {!loading && !error && !(activeTab === 'listings' ? listings : savedListings).length ? <View style={styles.statusCard}><Text style={styles.statusTitle}>{activeTab === 'listings' ? 'No listings yet' : 'No saved listings'}</Text><Text style={styles.message}>{activeTab === 'listings' ? 'Your drafts and published listings will appear here.' : 'Saved marketplace items will appear here.'}</Text></View> : null}
        {!loading && !error ? (activeTab === 'listings' ? listings : savedListings).map((listing) => <MyListingRow key={listing.listing_id} listing={listing} onPress={() => setSelectedListing(listing)} />) : null}</>}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  headerSpacer: { minWidth: 100 },
  messagesButton: { minWidth: 100 }, messagesButtonText: { color: '#7651e8', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { padding: 18, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 12 }, backText: { color: '#7651e8', fontSize: 14, fontWeight: '700', minWidth: 100 }, title: { color: '#19171d', flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' }, spacer: { minWidth: 100 }, tabBar: { borderBottomColor: '#e7e2eb', borderBottomWidth: 1, flexDirection: 'row', marginTop: 6 }, tab: { alignItems: 'center', flex: 1, paddingVertical: 12 }, activeTab: { borderBottomColor: '#7651e8', borderBottomWidth: 2 }, tabText: { color: '#756e7d', fontSize: 14, fontWeight: '700' }, activeTabText: { color: '#7651e8' }, subtitle: { color: '#756e7d', fontSize: 13, lineHeight: 19, marginTop: 12 }, row: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, padding: 10 }, rowImage: { alignItems: 'center', backgroundColor: '#eee9f7', borderRadius: 10, height: 72, justifyContent: 'center', width: 72 }, rowImageText: { color: '#756e7d', fontSize: 11 }, rowContent: { flex: 1 }, rowTitle: { color: '#19171d', fontSize: 15, fontWeight: '700' }, rowMeta: { color: '#756e7d', fontSize: 12, marginTop: 5 }, rowStatus: { color: '#5d3bbd', fontSize: 12, fontWeight: '700', marginTop: 5 }, statusCard: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, marginTop: 18, padding: 16 }, statusTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' }, message: { color: '#756e7d', fontSize: 13, lineHeight: 20, marginTop: 8 },
})

export default MyListingsScreen
