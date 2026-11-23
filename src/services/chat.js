import { supabase } from '../lib/supabase.js'

async function requireUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Please sign in to use messages.')
  return user
}

export async function startListingConversation(listingId, initialMessage = 'Is this available?') {
  await requireUser()

  const { data, error } = await supabase.rpc('create_listing_conversation', {
    p_listing_id: listingId,
    p_initial_message: initialMessage,
  })

  if (error) throw error
  return data
}

export async function fetchConversations() {
  const user = await requireUser()
  const { data: memberships, error: membershipError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)

  if (membershipError) throw membershipError
  const conversationIds = (memberships || []).map((membership) => membership.conversation_id)
  if (!conversationIds.length) return []

  const [{ data: conversations, error: conversationError }, { data: participants, error: participantError }, { data: contexts, error: contextError }, { data: messages, error: messageError }] = await Promise.all([
    supabase.from('conversations').select('conversation_id, created_at, updated_at, last_message_at').in('conversation_id', conversationIds),
    supabase.from('conversation_participants').select('conversation_id, user_id, last_read_at, profiles(id, full_name, avatar_url)').in('conversation_id', conversationIds),
    supabase.from('conversation_listings').select('conversation_id, listing_id, listing_title_snapshot, listing_price_snapshot').in('conversation_id', conversationIds),
    supabase.from('messages').select('conversation_id, body, sender_id, created_at').in('conversation_id', conversationIds).order('created_at', { ascending: false }),
  ])

  if (conversationError) throw conversationError
  if (participantError) throw participantError
  if (contextError) throw contextError
  if (messageError) throw messageError

  const membershipByConversation = Object.fromEntries((memberships || []).map((membership) => [membership.conversation_id, membership]))
  const contextByConversation = Object.fromEntries((contexts || []).map((context) => [context.conversation_id, context]))
  const latestMessageByConversation = {}
  for (const message of messages || []) {
    if (!latestMessageByConversation[message.conversation_id]) latestMessageByConversation[message.conversation_id] = message
  }

  const participantGroups = {}
  for (const participant of participants || []) {
    participantGroups[participant.conversation_id] = participantGroups[participant.conversation_id] || []
    participantGroups[participant.conversation_id].push(participant)
  }

  return (conversations || [])
    .map((conversation) => {
      const latestMessage = latestMessageByConversation[conversation.conversation_id] || null
      const otherParticipant = (participantGroups[conversation.conversation_id] || []).find((participant) => participant.user_id !== user.id)
      const membership = membershipByConversation[conversation.conversation_id]
      return {
        ...conversation,
        context: contextByConversation[conversation.conversation_id] || null,
        otherParticipant: otherParticipant?.profiles || null,
        latestMessage,
        unread: Boolean(latestMessage && latestMessage.sender_id !== user.id && (!membership?.last_read_at || new Date(latestMessage.created_at) > new Date(membership.last_read_at))),
      }
    })
    .sort((left, right) => new Date(right.last_message_at || right.updated_at) - new Date(left.last_message_at || left.updated_at))
}

export async function fetchMessages(conversationId) {
  await requireUser()
  const { data, error } = await supabase
    .from('messages')
    .select('message_id, conversation_id, sender_id, body, created_at, edited_at, deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function sendMessage(conversationId, body) {
  const user = await requireUser()
  const text = body.trim()
  if (!text) throw new Error('Message cannot be empty.')

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select('message_id, conversation_id, sender_id, body, created_at, edited_at, deleted_at')
    .single()

  if (error) throw error
  return data
}

export async function markConversationRead(conversationId) {
  const user = await requireUser()
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  if (error) throw error
}
