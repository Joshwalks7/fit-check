import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../lib/supabase.js'
import { fetchMessages, markConversationRead, sendMessage } from '../services/chat.js'

function ChatScreen({ conversationId, conversation, onBack }) {
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  const loadMessages = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await fetchMessages(conversationId)
      setMessages(data)
      await markConversationRead(conversationId)
    } catch (loadError) {
      setError(loadError?.message || 'Messages could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchMessages(conversationId), markConversationRead(conversationId)])
      .then(([data]) => { if (!cancelled) setMessages(data) })
      .catch((loadError) => { if (!cancelled) setError(loadError?.message || 'Messages could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [conversationId])

  const send = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const message = await sendMessage(conversationId, body)
      setMessages((current) => [...current, message])
      setBody('')
    } catch (sendError) {
      setError(sendError?.message || 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.backText}>‹ Messages</Text></Pressable><View style={styles.headerCenter}><Text numberOfLines={1} style={styles.title}>{conversation?.otherParticipant?.full_name || 'Conversation'}</Text><Text numberOfLines={1} style={styles.context}>{conversation?.context?.listing_title_snapshot || 'FitCheck chat'}</Text></View><View style={styles.spacer} /></View>
      {conversation?.context ? <View style={styles.listingContext}><Text style={styles.listingContextLabel}>LISTING</Text><Text numberOfLines={1} style={styles.listingContextTitle}>{conversation.context.listing_title_snapshot}</Text><Text style={styles.listingContextPrice}>{Number(conversation.context.listing_price_snapshot) === 0 ? 'Free' : `$${Number(conversation.context.listing_price_snapshot).toFixed(2)}`}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.messageList} refreshControl={<RefreshControl onRefresh={() => loadMessages({ refresh: true })} refreshing={refreshing} tintColor="#7651e8" />}>
        {loading ? <Text style={styles.emptyText}>Loading conversation…</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !messages.length ? <Text style={styles.emptyText}>No messages yet.</Text> : null}
        {messages.map((message) => <View key={message.message_id} style={[styles.messageBubble, message.sender_id !== currentUserId && styles.incomingBubble]}><Text style={[styles.messageBody, message.sender_id !== currentUserId && styles.incomingMessageBody]}>{message.deleted_at ? 'Message deleted' : message.body}</Text></View>)}
      </ScrollView>
      <View style={styles.composer}><TextInput editable={!sending} onChangeText={setBody} onSubmitEditing={send} placeholder="Write a message…" placeholderTextColor="#756e7d" style={styles.composerInput} value={body} /><Pressable disabled={!body.trim() || sending} onPress={send} style={[styles.sendButton, (!body.trim() || sending) && styles.disabledSend]}><Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text></Pressable></View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', padding: 18, paddingBottom: 12 }, backText: { color: '#7651e8', fontSize: 14, fontWeight: '700', minWidth: 90 }, headerCenter: { flex: 1 }, title: { color: '#19171d', fontSize: 17, fontWeight: '700', textAlign: 'center' }, context: { color: '#756e7d', fontSize: 11, marginTop: 3, textAlign: 'center' }, spacer: { minWidth: 90 }, listingContext: { backgroundColor: '#eee9fb', borderRadius: 13, marginHorizontal: 18, padding: 12 }, listingContextLabel: { color: '#7651e8', fontSize: 10, fontWeight: '800' }, listingContextTitle: { color: '#3e3944', fontSize: 14, fontWeight: '700', marginTop: 3 }, listingContextPrice: { color: '#5d3bbd', fontSize: 12, marginTop: 3 }, messageList: { flexGrow: 1, gap: 8, padding: 18 }, emptyText: { color: '#756e7d', fontSize: 13, marginTop: 18, textAlign: 'center' }, errorText: { color: '#a54824', fontSize: 13, textAlign: 'center' }, messageBubble: { alignSelf: 'flex-end', backgroundColor: '#7651e8', borderRadius: 16, maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 10 }, incomingBubble: { alignSelf: 'flex-start', backgroundColor: '#eee9f7' }, messageBody: { color: '#fff', fontSize: 14, lineHeight: 20 }, incomingMessageBody: { color: '#3e3944' }, composer: { alignItems: 'center', backgroundColor: '#fff', borderTopColor: '#e7e2eb', borderTopWidth: 1, flexDirection: 'row', gap: 8, padding: 12 }, composerInput: { backgroundColor: '#f2eff6', borderRadius: 12, color: '#19171d', flex: 1, fontSize: 14, paddingHorizontal: 13, paddingVertical: 11 }, sendButton: { backgroundColor: '#7651e8', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 }, disabledSend: { opacity: 0.45 }, sendText: { color: '#fff', fontSize: 12, fontWeight: '800' },
})

export default ChatScreen
