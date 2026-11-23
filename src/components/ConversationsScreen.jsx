import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { fetchConversations } from '../services/chat.js'

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `$${Number(price || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

function ConversationsScreen({ onBack, onOpenConversation, embedded = false }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadConversations = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      setConversations(await fetchConversations())
    } catch (loadError) {
      setError(loadError?.message || 'Messages could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchConversations()
      .then((data) => { if (!cancelled) setConversations(data) })
      .catch((loadError) => { if (!cancelled) setError(loadError?.message || 'Messages could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => loadConversations({ refresh: true })} refreshing={refreshing} tintColor="#7651e8" />}>
        {!embedded ? <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.backText}>‹ My marketplace</Text></Pressable><Text style={styles.title}>Messages</Text><View style={styles.spacer} /></View> : null}
        <Text style={styles.subtitle}>Your conversations and marketplace inquiries.</Text>
        {loading ? <Text style={styles.message}>Loading messages…</Text> : null}
        {error ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Messages unavailable</Text><Text style={styles.message}>{error}</Text></View> : null}
        {!loading && !error && !conversations.length ? <View style={styles.statusCard}><Text style={styles.statusTitle}>No conversations yet</Text><Text style={styles.message}>Message a seller from an active listing to start a conversation.</Text></View> : null}
        {!loading && !error ? conversations.map((conversation) => {
          const title = conversation.context?.listing_title_snapshot || 'Conversation'
          const participant = conversation.otherParticipant?.full_name || 'FitCheck user'
          const latest = conversation.latestMessage?.body || 'No messages yet'
          return <Pressable key={conversation.conversation_id} onPress={() => onOpenConversation(conversation.conversation_id, conversation)} style={styles.conversationRow}><View style={styles.avatar}><Text style={styles.avatarText}>{participant.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowContent}><View style={styles.rowHeader}><Text numberOfLines={1} style={[styles.participant, conversation.unread && styles.unreadText]}>{participant}</Text><Text style={styles.date}>{formatDate(conversation.last_message_at || conversation.updated_at)}</Text></View><Text numberOfLines={1} style={styles.listingTitle}>{title}{conversation.context ? ` · ${formatPrice(conversation.context.listing_price_snapshot)}` : ''}</Text><Text numberOfLines={1} style={[styles.preview, conversation.unread && styles.unreadText]}>{latest}</Text></View>{conversation.unread ? <View style={styles.unreadDot} /> : null}</Pressable>
        }) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, content: { padding: 18, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 12 }, backText: { color: '#7651e8', fontSize: 14, fontWeight: '700', minWidth: 110 }, title: { color: '#19171d', flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' }, spacer: { minWidth: 110 }, subtitle: { color: '#756e7d', fontSize: 13, lineHeight: 19 }, conversationRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, padding: 12 }, avatar: { alignItems: 'center', backgroundColor: '#ded4fa', borderRadius: 23, height: 46, justifyContent: 'center', width: 46 }, avatarText: { color: '#5d3bbd', fontSize: 18, fontWeight: '800' }, rowContent: { flex: 1 }, rowHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 }, participant: { color: '#19171d', flex: 1, fontSize: 14, fontWeight: '700' }, date: { color: '#756e7d', fontSize: 10 }, listingTitle: { color: '#5d3bbd', fontSize: 12, marginTop: 5 }, preview: { color: '#756e7d', fontSize: 12, marginTop: 5 }, unreadText: { color: '#19171d', fontWeight: '800' }, unreadDot: { backgroundColor: '#7651e8', borderRadius: 5, height: 10, width: 10 }, statusCard: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 15, borderWidth: 1, marginTop: 18, padding: 16 }, statusTitle: { color: '#19171d', fontSize: 16, fontWeight: '700' }, message: { color: '#756e7d', fontSize: 13, lineHeight: 20, marginTop: 8 },
})

export default ConversationsScreen
