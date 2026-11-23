-- Securely create or reuse a buyer/seller conversation for an active listing.
-- The client should call this function instead of inserting chat rows separately.

create or replace function public.create_listing_conversation(
  p_listing_id uuid,
  p_initial_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_seller_id uuid;
  v_conversation_id uuid;
  v_listing_title text;
  v_listing_price numeric(10,2);
begin
  if v_buyer_id is null then
    raise exception 'You must be signed in to start a conversation.';
  end if;

  -- Serialize requests for the same buyer/listing pair to avoid duplicate chats.
  perform pg_advisory_xact_lock(
    hashtextextended(p_listing_id::text || ':' || v_buyer_id::text, 0)
  );

  select seller_id, title, price
  into v_seller_id, v_listing_title, v_listing_price
  from public.marketplace_listings
  where listing_id = p_listing_id
    and status = 'active';

  if not found then
    raise exception 'This listing is no longer available.';
  end if;

  if v_seller_id = v_buyer_id then
    raise exception 'You cannot message yourself about your own listing.';
  end if;

  select c.conversation_id
  into v_conversation_id
  from public.conversations c
  join public.conversation_listings cl
    on cl.conversation_id = c.conversation_id
  join public.conversation_participants buyer_participant
    on buyer_participant.conversation_id = c.conversation_id
   and buyer_participant.user_id = v_buyer_id
  join public.conversation_participants seller_participant
    on seller_participant.conversation_id = c.conversation_id
   and seller_participant.user_id = v_seller_id
  where cl.listing_id = p_listing_id
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (created_by)
    values (v_buyer_id)
    returning conversation_id into v_conversation_id;

    insert into public.conversation_participants (conversation_id, user_id)
    values
      (v_conversation_id, v_buyer_id),
      (v_conversation_id, v_seller_id);

    insert into public.conversation_listings (
      conversation_id,
      listing_id,
      listing_title_snapshot,
      listing_price_snapshot
    )
    values (
      v_conversation_id,
      p_listing_id,
      v_listing_title,
      v_listing_price
    );

    if nullif(trim(p_initial_message), '') is not null then
      insert into public.messages (conversation_id, sender_id, body)
      values (v_conversation_id, v_buyer_id, trim(p_initial_message));
    end if;
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_listing_conversation(uuid, text) from public;
grant execute on function public.create_listing_conversation(uuid, text) to authenticated;
