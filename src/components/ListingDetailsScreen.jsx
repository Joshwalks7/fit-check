import { useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { submitListingReport } from '../services/marketplace.js'

const REPORT_REASONS = [
  ['scam', 'Scam or suspicious behavior'],
  ['prohibited_item', 'Prohibited item'],
  ['misleading', 'Misleading information'],
  ['harassment', 'Harassment'],
  ['duplicate', 'Duplicate listing'],
  ['other', 'Other'],
]

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `$${Number(price || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return 'Recently listed'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recently listed' : `Listed ${date.toLocaleDateString()}`
}

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function availableStatuses(status) {
  const statuses = {
    draft: [{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'withdrawn', label: 'Withdrawn' }],
    active: [{ value: 'active', label: 'Active' }, { value: 'reserved', label: 'Reserved' }, { value: 'sold', label: 'Sold' }, { value: 'withdrawn', label: 'Withdrawn' }],
    reserved: [{ value: 'reserved', label: 'Reserved' }, { value: 'active', label: 'Active' }, { value: 'sold', label: 'Sold' }, { value: 'withdrawn', label: 'Withdrawn' }],
    sold: [{ value: 'sold', label: 'Sold' }, { value: 'active', label: 'Relist' }],
    withdrawn: [{ value: 'withdrawn', label: 'Withdrawn' }, { value: 'active', label: 'Active' }],
  }
  return statuses[status] || [{ value: status, label: labelize(status) }]
}

function ListingImage({ image, title, large = false }) {
  const [failed, setFailed] = useState(false)

  if (image?.imageUrl && !failed) {
    return <Image accessibilityLabel={image.alt_text || title || 'Marketplace listing photo'} onError={() => setFailed(true)} resizeMode="cover" source={{ uri: image.imageUrl }} style={large ? styles.detailPhoto : styles.galleryPhoto} />
  }

  return <View style={[styles.photoFallback, large && styles.detailPhoto]}><Text style={styles.photoFallbackText}>No photo</Text></View>
}

function ListingDetailsScreen({ listing, onBack, ownerMode = false, isOwner = false, isSaved = false, onToggleSaved, onMessageSeller, onStatusChange, onEdit, onDelete }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportError, setReportError] = useState('')
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [draftStatus, setDraftStatus] = useState(listing.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const images = listing.images?.length ? listing.images : [null]
  const sellerName = listing.seller?.full_name || 'FitCheck seller'
  const isUnavailable = listing.status !== 'active'
  const hasUnsavedStatus = draftStatus !== listing.status

  const saveStatus = async () => {
    if (!hasUnsavedStatus || savingStatus) return
    setSavingStatus(true)
    try {
      await onStatusChange(draftStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  const submitReport = async () => {
    setReportSubmitting(true)
    setReportError('')
    try {
      await submitListingReport({ listingId: listing.listing_id, reason: reportReason, details: reportDetails })
      setReportSubmitted(true)
    } catch (error) {
      setReportError(error?.message || 'The report could not be submitted.')
    } finally {
      setReportSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to marketplace" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹ Back</Text></Pressable>
        <Text style={styles.headerTitle}>Listing details</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListingImage image={images[selectedImageIndex]} large title={listing.title} />
        {images.length > 1 ? <ScrollView contentContainerStyle={styles.gallery} horizontal showsHorizontalScrollIndicator={false}>{images.map((image, index) => <Pressable key={image?.image_id || `missing-${index}`} onPress={() => setSelectedImageIndex(index)} style={[styles.galleryItem, index === selectedImageIndex && styles.selectedGalleryItem]}><ListingImage image={image} title={listing.title} /></Pressable>)}</ScrollView> : null}
        {isUnavailable ? <View style={styles.unavailableBanner}><Text style={styles.unavailableTitle}>This listing is no longer available</Text><Text style={styles.unavailableText}>The seller has changed this listing's status.</Text></View> : null}
        <View style={styles.titleRow}><View style={styles.flex}><Text style={styles.title}>{listing.title}</Text><Text style={styles.subtitle}>{labelize(listing.category)} · {labelize(listing.condition)}</Text></View><Text style={styles.price}>{formatPrice(listing.price)}</Text></View>
        <Text style={styles.description}>{listing.description || 'No description provided.'}</Text>
        <View style={styles.factGrid}>{[['Brand', listing.brand], ['Size', listing.size], ['Color', listing.color], ['Location', listing.location_label]].map(([label, value]) => <View key={label} style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value || 'Not specified'}</Text></View>)}</View>
        <View style={styles.sellerCard}><View style={styles.avatar}><Text style={styles.avatarText}>{sellerName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.sellerLabel}>Seller</Text><Text style={styles.sellerName}>{sellerName}</Text></View></View>
        <Text style={styles.date}>{formatDate(listing.published_at || listing.created_at)}</Text>

        {!ownerMode && !isOwner && (listing.status === 'active' || isSaved) ? <View style={styles.publicActions}>{listing.status === 'active' && onMessageSeller ? <Pressable onPress={() => onMessageSeller(listing)} style={styles.messageAction}><Text style={styles.messageActionText}>Message seller</Text></Pressable> : null}<Pressable disabled={!onToggleSaved || (listing.status !== 'active' && !isSaved)} onPress={() => onToggleSaved?.(listing)} style={[styles.saveListingAction, isSaved && styles.savedListingAction]}><Text style={[styles.saveListingText, isSaved && styles.savedListingText]}>{isSaved ? '✓  Saved listing' : '＋  Save listing'}</Text></Pressable>{listing.status === 'active' ? <View style={styles.moreWrap}><Pressable onPress={() => setMoreMenuOpen((open) => !open)} style={styles.moreButton}><Text style={styles.moreButtonText}>•••</Text></Pressable>{moreMenuOpen ? <View style={styles.moreMenu}><Pressable onPress={() => { setMoreMenuOpen(false); setReportOpen(true); setReportSubmitted(false); setReportReason(''); setReportDetails(''); setReportError('') }} style={styles.moreMenuItem}><Text style={styles.moreMenuText}>Report listing</Text></Pressable></View> : null}</View> : null}</View> : null}

        {ownerMode ? (
          <View style={styles.ownerTools}>
            <Text style={styles.ownerToolsTitle}>Manage listing</Text>
            <Pressable onPress={() => setStatusMenuOpen((open) => !open)} style={styles.statusPicker}>
              <Text style={styles.statusPickerText}>{labelize(draftStatus)}</Text>
              <Text style={styles.statusChevron}>{statusMenuOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {statusMenuOpen ? (
              <View style={styles.statusMenu}>
                {availableStatuses(listing.status).map((statusOption) => (
                  <Pressable key={statusOption.value} onPress={() => { setStatusMenuOpen(false); setDraftStatus(statusOption.value) }} style={[styles.statusOption, statusOption.value === draftStatus && styles.selectedStatusOption]}>
                    <Text style={[styles.statusOptionText, statusOption.value === draftStatus && styles.selectedStatusOptionText]}>{statusOption.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.ownerActionRow}>
              <Pressable disabled={savingStatus} onPress={onEdit} style={styles.editAction}><Text style={styles.editActionText}>Edit details</Text></Pressable>
              {hasUnsavedStatus ? <Pressable disabled={savingStatus} onPress={saveStatus} style={styles.saveAction}><Text style={styles.saveActionText}>{savingStatus ? 'Saving…' : 'Save listing'}</Text></Pressable> : <Pressable onPress={() => setDeleteConfirmOpen(true)} style={styles.deleteAction}><Text style={styles.deleteActionText}>Delete listing</Text></Pressable>}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)} transparent visible={deleteConfirmOpen}>
        <View style={styles.confirmBackdrop}><View style={styles.confirmCard}><Text style={styles.confirmTitle}>Delete listing?</Text><Text style={styles.confirmText}>This permanently deletes “{listing.title}”. This cannot be undone.</Text><View style={styles.confirmActions}><Pressable onPress={() => setDeleteConfirmOpen(false)} style={styles.cancelAction}><Text style={styles.cancelActionText}>Cancel</Text></Pressable><Pressable onPress={() => { setDeleteConfirmOpen(false); onDelete() }} style={styles.confirmDeleteAction}><Text style={styles.confirmDeleteText}>Delete</Text></Pressable></View></View></View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setReportOpen(false)} transparent visible={reportOpen}>
        <View style={styles.confirmBackdrop}><View style={styles.reportCard}>{reportSubmitted ? <><Text style={styles.confirmTitle}>Report submitted</Text><Text style={styles.confirmText}>Thanks for helping keep FitCheck safe.</Text><Pressable onPress={() => setReportOpen(false)} style={styles.reportDoneButton}><Text style={styles.reportDoneText}>Done</Text></Pressable></> : <><View style={styles.reportHeader}><Text style={styles.confirmTitle}>Report listing</Text><Pressable onPress={() => setReportOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.confirmText}>Why are you reporting this listing?</Text>{REPORT_REASONS.map(([value, label]) => <Pressable key={value} onPress={() => setReportReason(value)} style={styles.reasonRow}><Text style={styles.radio}>{reportReason === value ? '●' : '○'}</Text><Text style={styles.reasonText}>{label}</Text></Pressable>)}<TextInput editable={!reportSubmitting} maxLength={500} multiline onChangeText={setReportDetails} placeholder="Additional details (optional)" placeholderTextColor="#756e7d" style={styles.reportInput} value={reportDetails} />{reportError ? <Text style={styles.reportError}>{reportError}</Text> : null}<View style={styles.confirmActions}><Pressable disabled={reportSubmitting} onPress={() => setReportOpen(false)} style={styles.cancelAction}><Text style={styles.cancelActionText}>Cancel</Text></Pressable><Pressable disabled={!reportReason || reportSubmitting} onPress={submitReport} style={[styles.confirmDeleteAction, (!reportReason || reportSubmitting) && styles.disabledReportButton]}><Text style={styles.confirmDeleteText}>{reportSubmitting ? 'Submitting…' : 'Submit report'}</Text></Pressable></View></>}</View></View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbfafc' }, content: { paddingBottom: 36 },
  messageAction: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 12, flex: 1, paddingVertical: 12 }, messageActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  backButton: { minWidth: 72, paddingVertical: 6 }, backText: { color: '#7651e8', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#19171d', flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' }, headerSpacer: { minWidth: 72 },
  detailPhoto: { backgroundColor: '#eee9f7', height: 300, width: '100%' }, gallery: { gap: 8, paddingHorizontal: 18, paddingVertical: 12 }, galleryItem: { borderRadius: 12, overflow: 'hidden' }, selectedGalleryItem: { borderColor: '#7651e8', borderWidth: 2 }, galleryPhoto: { height: 68, width: 68 },
  photoFallback: { alignItems: 'center', backgroundColor: '#eee9f7', justifyContent: 'center' }, photoFallbackText: { color: '#756e7d', fontSize: 13 },
  unavailableBanner: { backgroundColor: '#fff0e8', borderRadius: 14, marginBottom: 16, marginHorizontal: 18, padding: 14 }, unavailableTitle: { color: '#8d4525', fontSize: 14, fontWeight: '700' }, unavailableText: { color: '#9c684e', fontSize: 13, marginTop: 4 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, paddingHorizontal: 18 }, flex: { flex: 1 }, title: { color: '#19171d', fontSize: 24, fontWeight: '700' }, subtitle: { color: '#756e7d', fontSize: 13, marginTop: 6, textTransform: 'capitalize' }, price: { color: '#7651e8', fontSize: 20, fontWeight: '800' }, description: { color: '#3e3944', fontSize: 15, lineHeight: 22, paddingHorizontal: 18, paddingTop: 18 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 18 }, fact: { backgroundColor: '#f2eff6', borderRadius: 12, minWidth: '45%', padding: 12 }, factLabel: { color: '#756e7d', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }, factValue: { color: '#29242f', fontSize: 14, marginTop: 4 },
  sellerCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, marginHorizontal: 18, padding: 14 }, avatar: { alignItems: 'center', backgroundColor: '#ded4fa', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, avatarText: { color: '#5d3bbd', fontSize: 18, fontWeight: '800' }, sellerLabel: { color: '#756e7d', fontSize: 11, textTransform: 'uppercase' }, sellerName: { color: '#19171d', fontSize: 15, fontWeight: '700', marginTop: 3 }, date: { color: '#756e7d', fontSize: 12, paddingHorizontal: 18, paddingTop: 14 }, publicActions: { alignItems: 'center', flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 16 }, saveListingAction: { alignItems: 'center', borderColor: '#7651e8', borderRadius: 12, borderWidth: 1, flex: 1, paddingVertical: 12 }, savedListingAction: { backgroundColor: '#eee9fb' }, saveListingText: { color: '#5d3bbd', fontSize: 13, fontWeight: '700' }, savedListingText: { color: '#5d3bbd' }, moreWrap: { position: 'relative' }, moreButton: { alignItems: 'center', borderColor: '#e2dce9', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 52 }, moreButtonText: { color: '#5d3bbd', fontSize: 16, fontWeight: '800', letterSpacing: 2 }, moreMenu: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, bottom: 50, minWidth: 150, overflow: 'hidden', position: 'absolute', right: 0 }, moreMenuItem: { paddingHorizontal: 14, paddingVertical: 12 }, moreMenuText: { color: '#3e3944', fontSize: 13, fontWeight: '700' }, ownerTools: { marginHorizontal: 18, paddingTop: 24 }, ownerToolsTitle: { color: '#19171d', fontSize: 16, fontWeight: '700', marginBottom: 9 }, statusPicker: { alignItems: 'center', backgroundColor: '#f2eff6', borderColor: '#ded4fa', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 }, statusPickerText: { color: '#5d3bbd', fontSize: 14, fontWeight: '700' }, statusChevron: { color: '#5d3bbd', fontSize: 18 }, statusMenu: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, marginTop: 6, overflow: 'hidden' }, statusOption: { borderBottomColor: '#eee9f7', borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12 }, selectedStatusOption: { backgroundColor: '#eee9fb' }, statusOptionText: { color: '#3e3944', fontSize: 13 }, selectedStatusOptionText: { color: '#5d3bbd', fontWeight: '700' }, ownerActionRow: { flexDirection: 'row', gap: 10, paddingTop: 12 }, editAction: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 12, flex: 1, paddingVertical: 12 }, editActionText: { color: '#fff', fontSize: 13, fontWeight: '700' }, saveAction: { alignItems: 'center', backgroundColor: '#2f7d5c', borderRadius: 12, flex: 1, paddingVertical: 12 }, saveActionText: { color: '#fff', fontSize: 13, fontWeight: '700' }, deleteAction: { alignItems: 'center', backgroundColor: '#fff0e8', borderRadius: 12, flex: 1, paddingVertical: 12 }, deleteActionText: { color: '#a54824', fontSize: 13, fontWeight: '700' }, confirmBackdrop: { alignItems: 'center', backgroundColor: 'rgba(25,23,29,0.45)', flex: 1, justifyContent: 'center', padding: 24 }, confirmCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%' }, confirmTitle: { color: '#19171d', fontSize: 19, fontWeight: '800' }, confirmText: { color: '#756e7d', fontSize: 14, lineHeight: 20, marginTop: 8 }, confirmActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }, cancelAction: { borderColor: '#e2dce9', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }, cancelActionText: { color: '#756e7d', fontSize: 13, fontWeight: '700' }, confirmDeleteAction: { backgroundColor: '#b94e27', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }, confirmDeleteText: { color: '#fff', fontSize: 13, fontWeight: '700' }, reportCard: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '90%', padding: 20, width: '100%' }, reportHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, reasonRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 10 }, radio: { color: '#7651e8', fontSize: 17, width: 22 }, reasonText: { color: '#3e3944', flex: 1, fontSize: 14 }, reportInput: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', minHeight: 80, padding: 12, textAlignVertical: 'top' }, reportError: { color: '#a54824', fontSize: 12, lineHeight: 18, marginTop: 8 }, reportDoneButton: { alignItems: 'center', backgroundColor: '#7651e8', borderRadius: 12, marginTop: 20, paddingVertical: 12 }, reportDoneText: { color: '#fff', fontSize: 13, fontWeight: '700' }, disabledReportButton: { opacity: 0.45 },
})

export default ListingDetailsScreen
