# FitCheck Marketplace Plan

## Purpose

This document records the planned marketplace data model, migration order, security rules, and application work. It is intended to prevent the marketplace from becoming a collection of UI-specific tables with weak ownership and lifecycle rules.

The marketplace is local and does not support shipping in the initial version. Listings may be free (`price = 0`) or paid. Users may create a listing from an existing closet item through autofill, or create a standalone listing without adding the item to their closet.

## Decisions already made

- Marketplace listings are local/in-person; shipping is out of scope for the initial version.
- Free listings are allowed.
- Currency is omitted for now; price uses the marketplace's default currency.
- Reservations are planned.
- Users can manage their own listings from a marketplace subpage.
- Withdrawing a listing hides it from public marketplace results without deleting the record.
- A closet item may have only one open listing at a time (`draft`, `active`, or `reserved`).
- Listing fields are copied snapshots. A listing must not change automatically when its source closet item changes.
- A listing may be created without a source closet item.
- Chat should be site-wide, with marketplace listings as one possible conversation reference.
- Marketplace listings require authentication to view.
- Listing owners may delete listings in any status; the UI must require a confirmation prompt before deletion.

## Confirmed database snapshot

This snapshot was supplied from the Supabase `information_schema` and constraint queries on 2026-11-18. Treat it as the current known schema until a newer inspection replaces it.

### `marketplace_listings`

| Column | Type | Nullable | Default / relationship |
| --- | --- | --- | --- |
| `listing_id` | `uuid` | no | `gen_random_uuid()`, primary key |
| `seller_id` | `uuid` | no | foreign key to `profiles.id` |
| `source_clothing_item_id` | `uuid` | no | foreign key to `clothing_items.id` |
| `price` | `numeric` | no | constrained by `marketplace_listings_price_check` |
| `condition` | `text` | no | constrained by `marketplace_listings_condition_check` |
| `description` | `text` | yes | — |
| `location_label` | `text` | no | — |
| `status` | `text` | no | `'draft'::text`, constrained by `marketplace_listings_status_check` |
| `created_at` | `timestamptz` | no | `now()` |
| `updated_at` | `timestamptz` | no | `now()` |
| `sold_at` | `timestamptz` | yes | — |
| `title` | `text` | no | — |
| `category` | `text` | no | — |
| `brand` | `text` | yes | — |
| `size` | `text` | yes | — |
| `color` | `text` | yes | — |
| `published_at` | `timestamptz` | yes | — |

Known constraints:

- Primary key: `marketplace_listings_pkey` on `listing_id`.
- Foreign key: `marketplace_listings_seller_id_fkey` to `profiles.id`.
- Foreign key: `marketplace_listings_source_clothing_item_id_fkey` to `clothing_items.id`.
- Existing checks: `marketplace_listings_price_check`, `marketplace_listings_condition_check`, and `marketplace_listings_status_check`.
- Supabase-generated not-null checks also exist. Their generated names should not be hard-coded into future migrations unless necessary.

Important mismatch with the approved design: `source_clothing_item_id` is currently required, but standalone listings must be allowed, so it needs to become nullable. `location_label` is also currently required; it should become nullable unless the product requires every listing to expose a broad location.

### `clothing_items`

| Column | Type | Nullable | Default / relationship |
| --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()`, primary key |
| `user_id` | `uuid` | no | foreign key to the authenticated user relationship |
| `created_at` | `timestamptz` | no | `now()` |
| `name` | `text` | no | constrained by `clothing_items_name_check` |
| `category` | `text` | no | constrained by `clothing_items_category_check` |
| `description` | `text` | yes | — |
| `color` | `text` | yes | — |
| `brand` | `text` | yes | — |
| `size` | `text` | yes | — |
| `seasons` | `text[]` | no | `'{}'::text[]`, constrained by `clothing_items_seasons_check` |
| `styles` | `text[]` | no | `'{}'::text[]`, constrained by `clothing_items_styles_check` |

Known constraints:

- Primary key: `clothing_items_pkey` on `id`.
- Foreign key: `clothing_items_user_id_fkey` on `user_id`.
- Existing checks constrain name, category, seasons, and styles.

### `profiles`

| Column | Type | Nullable | Default / relationship |
| --- | --- | --- | --- |
| `id` | `uuid` | no | primary key; also the target of the listing seller foreign key |
| `email` | `text` | yes | — |
| `full_name` | `text` | yes | — |
| `updated_at` | `timestamptz` | yes | — |
| `avatar_url` | `text` | yes | — |

Known constraints:

- Primary key: `profiles_pkey` on `id`.
- Foreign key: `profiles_id_fkey`; the referenced table was not included in the supplied output.

### Inspection limitations

The supplied constraint query did not expose the referenced table for some foreign keys because it joined `constraint_column_usage` by constraint name. The next inspection should use `pg_constraint` and `pg_class` if exact referenced tables and delete actions are needed. RLS policies, indexes, triggers, and storage policies were not included in this snapshot and remain part of Phase 1.

### Confirmed storage-policy snapshot

The supplied storage-policy output confirms that the existing `Clothing_item_pics` bucket is owner-private:

- authenticated users may view only objects whose first path segment is their own user ID
- authenticated users may upload, update, and delete only objects in their own user folder
- there are no marketplace-specific storage policies

This means marketplace buyers must not be given direct access to closet-image paths. Marketplace images should use a separate private bucket, such as `marketplace-listing-images`, with policies tied to `marketplace_listing_images` and the listing's public status. The existing closet-image policies should remain owner-only.

Phase 3 storage-policy status:

- marketplace Storage policies have been created for view, upload, update, and delete
- all policies are restricted to authenticated users
- uploads, updates, and deletes require the authenticated user's folder and ownership of the referenced listing
- viewing is allowed for active listings or the listing owner
- runtime upload, signed-URL, status-change, and cleanup testing remains outstanding

#### Runtime image and storage verification checklist

Run these tests after the marketplace service and UI can upload images:

1. Sign in as a seller and upload an image using the path format `seller_id/listing_id/file-name.ext`.
2. Insert the matching path into `marketplace_listing_images`.
3. Generate a signed URL and display the image in the marketplace listing detail view.
4. Sign in as a different user and confirm the image is viewable while the listing is `active`.
5. Change the listing to `draft`, `reserved`, `sold`, and `withdrawn`; confirm the other user cannot view the image in non-active states.
6. Confirm the seller can still view and manage the image in each listing state.
7. Attempt to upload using another seller's user-folder or listing ID; confirm Storage rejects it.
8. Attempt to insert an image row for another seller's listing; confirm table RLS rejects it.
9. Delete an image and confirm both the database row and Storage object are removed.
10. Delete a listing and confirm image rows cascade; confirm the application also removes the associated Storage objects.
11. Simulate a database-insert failure after upload and confirm the application cleans up the orphaned Storage object.

The SQL Editor may bypass RLS, so ownership and visibility tests must use real authenticated app sessions.

### Confirmed RLS-policy snapshot

The supplied public-schema policy output confirms:

- `clothing_items`: authenticated users can insert and view only their own items.
- `marketplace_listings`: authenticated users can select only rows where `status = 'active'`.
- `marketplace_listings`: no insert, update, or delete policies currently exist.
- `profiles`: authenticated users can view profiles; users can insert and update their own profile. There are duplicate-looking public/authenticated update and select policies that should be reviewed, but they are not required to design the marketplace listing table.

Marketplace consequence: the current client cannot create or manage listings through RLS. The marketplace migration must add seller-scoped insert, select, update, and delete/withdraw behavior. Insert and update policies must also verify that an optional `source_clothing_item_id` belongs to the authenticated seller.

Final Phase 2 policy decisions:

- No anonymous marketplace browsing; authenticated users only.
- Users may view active listings and all of their own listings.
- Users may delete their own listings in any status. The client must show an “Are you sure you want to delete this listing?” confirmation before issuing the delete.
- Future conversation references must account for listing deletion, likely by preserving a listing snapshot or using `on delete set null` on the reference table.

### Confirmed constraint snapshot

The current constraints confirm:

- `profiles.id` references `auth.users(id)` with `on delete cascade`.
- `clothing_items.user_id` references `auth.users(id)` with `on delete cascade`.
- `marketplace_listings.seller_id` references `profiles.id` with the default restrictive delete behavior.
- `marketplace_listings.source_clothing_item_id` already references `clothing_items.id` with `on delete set null`.
- Marketplace price already enforces `price >= 0`.
- Marketplace condition already allows `new`, `like_new`, `good`, `fair`, and `poor`.
- Marketplace status already allows `draft`, `active`, `reserved`, `sold`, and `withdrawn`.
- Closet categories, seasons, styles, and nonblank names are already constrained.

Migration consequence: do not drop and recreate the existing marketplace condition, status, price, or source-item foreign-key constraints unless a later requirement changes them. The remaining required schema changes are primarily making `source_clothing_item_id` and probably `location_label` nullable, adding the open-listing uniqueness index, and adding the missing RLS policies.

### Confirmed index snapshot

The current indexes include:

- primary-key indexes on `clothing_items.id`, `marketplace_listings.listing_id`, and `profiles.id`
- marketplace indexes on `category`, descending `created_at`, `seller_id`, and `status`
- `marketplace_one_open_listing_per_item_idx`, a partial unique index that already prevents more than one `draft`, `active`, or `reserved` listing for the same non-null closet item

Migration consequence: the open-listing uniqueness index already satisfies the approved design and should not be recreated. No additional marketplace listing index is required for the current MVP schema.

## Proposed implementation sequence

### Phase 1: Confirm the existing database

Before applying migrations:

1. Inspect the current `marketplace_listings` columns, data types, constraints, and foreign keys.
2. Confirm that `profiles.id` is the same UUID as `auth.users.id`.
3. Confirm the actual `clothing_items` primary key and ownership column.
4. Run preflight queries for null or invalid values in existing marketplace rows.
5. Back up or export existing marketplace data before changing constraints.

### Phase 2: Migrate `marketplace_listings`

Update the existing table to support:

- seller ownership
- optional closet-item origin
- standalone listings
- listing-specific title and copied attributes
- zero or positive numeric prices
- constrained condition values
- constrained lifecycle status
- broad public location labels
- publication and sale timestamps
- one open listing per closet item
- automatic `updated_at` maintenance

The table should contain the public listing snapshot. It should not contain payment data, message text, image paths, favorites, or reviews.

Initial status values:

- `draft`
- `active`
- `reserved`
- `sold`
- `withdrawn`

Automatic reservation expiry will require a future `reserved_until` column. Until that is implemented, reservations must be manually released.

#### Current status

Phase 1 inspection is complete. The following Phase 2 changes have been applied in Supabase:

- `source_clothing_item_id` is nullable, allowing standalone listings.
- `location_label` is nullable, allowing listings without a public location.

The existing marketplace checks, foreign keys, indexes, open-listing uniqueness rule, and `updated_at` trigger were inspected and retained. Phase 2 is not complete until marketplace RLS policies are added and verified.

Phase 2 is now verified:

- authenticated-only listing access is enforced
- users can view active listings and their own listings
- users can create listings only as themselves
- optional source closet items must belong to the seller
- users can update and delete only their own listings
- existing marketplace indexes are present and sufficient for the MVP

The client must still show a deletion confirmation before deleting a listing. That confirmation is a UI safeguard; ownership enforcement remains in RLS.

### Phase 3: Add listing images

Create `marketplace_listing_images` with:

- a listing foreign key
- a private storage path
- display order
- cascade deletion when a listing is deleted

Use a separate marketplace storage bucket or a clearly separated folder structure. Do not expose private closet images directly through public URLs.

### Phase 4: Add saved listings

Create `saved_listings` as a join table between users and listings.

The primary key should be `(user_id, listing_id)` so a user cannot save the same listing twice.

Saved listings should not prevent a listing from being withdrawn or sold. They should remain visible in the user's saved-items area with its current status.

### Phase 5: Add listing reports and moderation support

Create `listing_reports` so users can report scams, prohibited items, harassment, inaccurate listings, or other problems.

Reports need their own status lifecycle and must not be deleted automatically when a listing is withdrawn. Moderation history is valuable.

### Phase 6: Add generic site-wide chat

Create:

- `conversations`
- `conversation_participants`
- `messages`
- `conversation_listings`

The marketplace should not have a special marketplace-only message table. A listing inquiry should create or reuse a normal conversation, attach the listing as context, and insert a normal message such as “Hi, is this available?”

Chat must support:

- unread state per participant
- message ordering
- edited and deleted messages
- listing context even after the listing is sold or withdrawn
- prevention of self-messaging
- ownership checks for conversation membership

### Phase 7: Add Row Level Security

RLS should enforce these rules in the database, not only in React Native:

- anyone may view `active` listings
- sellers may view and manage their own listings
- only sellers may update or withdraw their listings
- users may save or report listings as themselves
- only conversation participants may view messages
- only participants may send messages
- a user cannot add another user to a conversation arbitrarily
- listing references must point to real listings
- source closet items may only be autofilled by their owner

### Phase 8: Implement services

Keep Supabase access in service modules rather than putting database queries directly in screens.

Current status: database tables and initial RLS policies for marketplace listings, listing images, saved listings, reports, and chat have been created. Runtime authorization, Storage, realtime, deletion, cleanup, and two-account chat tests are still pending. These tests should be run while implementing the services, before relying on the polished UI.

Planned services:

- `marketplace.js`
- `marketplaceImages.js`
- `messages.js` or `chat.js`

The marketplace service should handle listing creation, closet autofill, publishing, withdrawal, reservation, sale marking, saved listings, and reports.

### Phase 9: Implement the marketplace UI

Build the vertical slice in this order:

1. Public active-listing feed
2. Listing detail view
3. Create listing form
4. Optional closet-item autofill
5. Seller's “My Listings” view
6. Withdraw, reactivate, reserve, release, and mark-sold actions
7. Listing image upload
8. Save/favorite behavior
9. Report flow
10. “Message seller” action

The create-listing form must work in both modes:

- start from a closet item and autofill editable fields
- start from scratch without creating a closet item

#### Page and component plan

The current app uses state-based screen switching in `src/App.jsx`, so the first implementation should fit that architecture rather than introducing a new navigation dependency.

Implementation status: the first feed/detail slice is implemented in `src/components/MarketplaceScreen.jsx`, `src/components/ListingDetailsScreen.jsx`, `src/services/marketplace.js`, and `src/services/marketplaceImages.js`. Prototype-only card previews were removed after visual review.

UI update: the create-listing action is now a floating plus button in the lower-right of the Marketplace content area, positioned above the shared bottom navigation. `My listings` remains in the header. This placement should still be checked on small screens to ensure it does not obscure cards or touch the bottom navigation.

The create-listing slice is also implemented in `src/components/CreateListingScreen.jsx`, `src/services/marketplace.js`, `src/services/marketplaceImages.js`, and `src/App.jsx`. It supports standalone listings, closet autofill, drafts, publishing, multiple images, seller-scoped writes, and partial-failure cleanup. Runtime device, Storage, and RLS verification remains pending.

1. `MarketplaceScreen`
   - active listing feed
   - search/filter controls
   - refresh, loading, empty, and error states
   - entry points for create listing, saved listings, and messages

2. `ListingCard`
   - primary image
   - title, price, condition, category, and location label
   - saved state
   - seller summary

3. `ListingDetailsScreen` or modal
   - image gallery
   - full listing details
   - seller profile summary
   - save/unsave
   - report listing
   - message seller
   - status handling for sold, reserved, withdrawn, or deleted listings

4. `CreateListingScreen`
   - choose an existing closet item for autofill or start standalone
   - editable title, description, category, brand, size, color, condition, price, and location
   - multiple image selection
   - draft and publish actions
   - upload/database cleanup on failure

5. `MyListingsScreen`
   - seller-owned listings grouped by status
   - edit, publish, withdraw, reserve, release, mark sold, and delete actions
   - deletion confirmation prompt

Implementation status: the seller-owned listings view now opens each listing as a full-screen detail view. It supports metadata editing, publish/reactivate, reserve, release, mark sold, withdraw, relisting a sold item, status selection from a dropdown, and confirmed deletion. Status changes are held locally until the user presses `Save listing`; relisting clears `sold_at` and sets a new publication timestamp. Existing images are preserved during metadata edits; image add/remove/reordering remains a follow-up.

6. `SavedListingsScreen`
   - user's saved listings
   - unavailable-listing state for sold or withdrawn listings

Implementation status: Saved is now a top tab inside the My marketplace hub. Public listing cards and detail views support save/unsave, and unavailable saved listings remain represented as placeholders when access to the original listing is no longer available.

Product note: users generally should not be able to save their own listings. The current behavior is useful for development and testing, but production UI should hide or disable the save control for listings owned by the current user.

7. `ReportListingModal`
   - constrained reason selection
   - optional details
   - success and duplicate-report states

8. `ConversationsScreen`
   - inbox ordered by `last_message_at`
   - listing preview when a conversation has marketplace context
   - unread indicators

9. `ChatScreen`
   - listing context header
   - message history
   - composer
   - edit/delete own message behavior
   - read-state updates

#### Recommended vertical-slice order

Do not build all pages simultaneously. Implement and test these slices in order:

1. Marketplace feed and listing detail with real listing images.
2. Create standalone listing and publish it.
3. Create a listing through closet autofill.
4. My Listings lifecycle actions.
5. Saved listings.
6. Listing reports.
7. Conversations and listing-context chat.

Chat should initially be reachable from listing details and a messages control in the marketplace header. A permanent bottom-navigation tab can be considered later; adding a sixth tab now would make the existing compact navigation harder to use.

### Phase 10: Implement chat UI and realtime updates

Add:

- conversation list
- message thread
- unread counts
- listing preview attached to marketplace conversations
- canned initial message such as “Is this available?”
- realtime message subscription

The message composer should still allow ordinary conversation after the initial listing inquiry.

### Phase 11: Verify the complete flow

Test at minimum:

- signed-out access to active listings
- signed-in listing creation
- free listing creation
- paid listing creation
- standalone listing creation
- closet autofill
- seller-only editing and withdrawal
- one open listing per closet item
- listing image upload failure cleanup
- reservation and release behavior
- sold and withdrawn listings disappearing from the public feed
- saved listings
- report submission
- buyer-to-seller chat
- unauthorized message and listing access
- deleted or withdrawn listing referenced from an existing conversation

## Planned tables

### Existing table to update

#### `marketplace_listings`

The public listing snapshot and its lifecycle. It references a closet item optionally, but does not depend on the closet item for its public fields.

### New marketplace tables

#### `marketplace_listing_images`

Stores ordered image paths for listings.

#### `saved_listings`

Stores user bookmarks for listings.

#### `listing_reports`

Stores user-submitted moderation reports.

Implementation status: created with constrained report reasons and statuses, reporter-scoped RLS, duplicate prevention per reporter/listing, and `on delete set null` for listing references. Reports retain a listing title snapshot so deleting a listing does not erase the report context.

Submission-flow status: implemented from active listing details through an overflow menu and report modal. Users choose a constrained reason, may add details, receive a success state, and receive a duplicate-report error when applicable. Owners cannot report their own listings, and moderator tooling remains deferred.

### New chat tables

#### `conversations`

Represents a generic site-wide conversation.

#### `conversation_participants`

Joins users to conversations and stores per-user read state.

#### `messages`

Stores message content and message lifecycle fields.

#### `conversation_listings`

Attaches a marketplace listing as context without making chat marketplace-specific.

Implementation status: chat tables, participant/message/listing-context RLS, conversation timestamp triggers, and message ordering metadata have been created. Runtime authorization and messaging tests remain outstanding.

Chat foundation status: added the secure `create_listing_conversation` database function and `src/services/chat.js` for conversation creation, inbox loading, message loading, sending, and read-state updates. The function has been applied by the user. The first UI slice is now implemented: active listing details can start an inquiry with a default “Is this available?” message, My Marketplace contains a third Messages tab alongside My listings and Saved, and inbox rows open a listing-context chat screen. Realtime delivery and two-account authorization tests remain outstanding; the current chat view supports manual pull-to-refresh.

#### Chat verification checklist

Use two real authenticated test accounts: a buyer and a seller.

1. Create a conversation as the buyer.
2. Add the intended buyer and seller as participants.
3. Confirm both participants can view the conversation and membership rows.
4. Confirm an unrelated third user cannot view the conversation.
5. Attach an active marketplace listing as conversation context.
6. Confirm both participants can view the listing title and price snapshot.
7. Send a message as the buyer and confirm the seller can read it.
8. Confirm an unrelated user cannot read or send messages in that conversation.
9. Attempt to send a message with a different `sender_id`; confirm RLS rejects it.
10. Edit a user's own message and confirm another user's message cannot be edited.
11. Update `last_read_at` for each participant and confirm read state is user-specific.
12. Confirm `last_message_at` and `updated_at` change after a new message.
13. Delete or withdraw the referenced listing and confirm the conversation remains available.
14. Permanently delete the listing and confirm the conversation remains while `listing_id` becomes null.
15. Test realtime delivery with two app sessions if realtime subscriptions are enabled.

The SQL Editor may bypass RLS. Ownership and visibility tests must use the app or Supabase client with real user sessions.

#### Deferred chat hardening

Recommended future improvements:

- replace multi-step conversation creation with a secure database function that atomically validates the buyer, seller, listing, participants, listing snapshot, and initial message
- prevent arbitrary participant additions and duplicate direct conversations
- add message idempotency keys for retry-safe sends
- add blocking/reporting for users and messages
- decide final soft-delete behavior and whether deleted messages retain their body
- add attachments only after text chat is stable

## Deliberately deferred

These are not part of the first implementation:

- shipping
- payment processing
- offers and counteroffers
- seller ratings and buyer ratings
- transaction escrow
- delivery tracking
- exact meetup address storage
- automatic reservation expiration
- multiple currencies
- listing view analytics

## Open questions

1. What location label should users choose from: city, campus, neighborhood, or a free-form label?
2. Should reservation be manual only initially, or should it automatically expire after a selected duration?
3. Should sellers be allowed to delete listings, or should all deletions be represented by `withdrawn`?
4. What categories and condition labels should the marketplace expose to users?
5. Should users be allowed to message anyone on the site, or only users connected through a listing or community interaction?
