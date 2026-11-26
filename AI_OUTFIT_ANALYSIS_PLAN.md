# AI Outfit Analysis Implementation Plan

This plan adds an advisory AI step to outfit documentation. A user selects an outfit photo, the server analyzes it against the user’s actual closet, and the app preselects possible matches. The user must review and approve the selections before the existing outfit-save flow writes anything to Supabase.

The first version should optimize for a safe, testable vertical slice rather than perfect clothing recognition.

## Success criteria

- A selected outfit photo can be uploaded to private temporary storage.
- A trusted server-side function can analyze the photo without exposing an AI API key.
- The analysis returns structured closet-item suggestions, not free-form text.
- Suggestions are limited to clothing items owned by the authenticated user.
- The user can add, remove, or change every suggested item.
- No outfit, outfit item, wear count, or closet record changes before confirmation.
- The existing manual outfit flow still works when AI is unavailable, uncertain, cancelled, or rejected.
- Temporary analysis files are deleted after success, failure, cancellation, or expiration.

## Current code to reuse

- `src/components/DocumentOutfitScreen.jsx` — photo selection, item selection, confirmation, and save flow.
- `src/services/outfits.js` — closet-item loading and outfit creation.
- `src/services/closet.js` — wear-stat calculations.
- `src/services/clothingImages.js` — signed closet-image URLs and storage helpers.
- `src/lib/supabase.js` — authenticated client used by the mobile app.
- `supabase/outfits.sql` — existing outfit and outfit-item schema.

Do not create a second Supabase client in the mobile app. The AI provider key must never be placed in an `EXPO_PUBLIC_` variable or shipped to the client.

## Proposed architecture

```text
DocumentOutfitScreen
  ├─ selects photo
  ├─ uploads temporary analysis image
  ├─ calls aiOutfitAnalysis service
  ├─ displays editable suggestions
  └─ calls existing createOutfit only after approval

Supabase Edge Function: analyze-outfit
  ├─ authenticates the caller
  ├─ verifies temporary-file ownership
  ├─ loads the caller’s closet
  ├─ creates signed URLs or downloads private images
  ├─ calls the vision model with a strict response schema
  ├─ validates returned clothing-item IDs
  └─ returns suggestions without writing an outfit
```

Use a separate private bucket such as `outfit-analysis-temp` rather than mixing temporary files with permanent outfit photos. Storage bucket creation and policies are deliberate Supabase changes and require review before applying them.

## Phase 0: Confirm the provider and local prerequisites

- [ ] Choose the vision-model provider. The initial implementation can use a provider with image inputs and structured JSON output.
- [ ] Create the provider account/API key outside the repository.
- [ ] Decide the initial model and maximum analysis image size.
- [ ] Confirm that sending user outfit photos to the provider is acceptable for the project.
- [ ] Confirm whether production Edge Function deployment and paid API usage are approved.

Useful references:

- [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)

## Phase 1: Add temporary storage

- [ ] Add a migration or documented SQL change creating the private temporary bucket.
- [ ] Allow only the image types the app can process: JPEG, PNG, and WebP.
- [ ] Use paths containing the authenticated user ID and a random session ID:

  ```text
  {user_id}/{analysis_session_id}.jpg
  ```

- [ ] Add policies allowing a signed-in user to insert, read, and delete only files under their own folder.
- [ ] Add an expiration strategy. Do not rely only on the mobile app to clean up files because the app may crash or lose connectivity.

Recommended future metadata:

```text
outfit_analysis_sessions
- id
- user_id
- storage_path
- status
- created_at
- expires_at
```

For the first prototype, the session can remain client-side, but production cleanup should have a server-side record or a scheduled cleanup mechanism.

## Phase 2: Upload and normalize the image

- [ ] Keep the original selected asset in local state for the current outfit flow.
- [ ] Create a resized analysis copy with a reasonable maximum dimension, such as 1600–2048 pixels.
- [ ] Normalize unsupported phone formats such as HEIC to JPEG or WebP.
- [ ] Upload only the analysis copy to the temporary bucket.
- [ ] Generate a random path; never use a predictable filename.
- [ ] Store the temporary path and session ID in the screen state.

Important: a larger original should be preserved only if needed for the final outfit image. The AI analysis copy should be smaller to reduce upload time, latency, and cost.

## Phase 3: Create the Edge Function

Create:

```text
supabase/functions/analyze-outfit/index.ts
```

The function should:

- [ ] Require a valid Supabase user session.
- [ ] Reject missing or malformed storage paths.
- [ ] Verify the path begins with the authenticated user’s ID.
- [ ] Read the provider key from Edge Function secrets.
- [ ] Load the user’s closet using the authenticated user context.
- [ ] Use signed URLs or server-side downloads for private closet images.
- [ ] Call the vision model.
- [ ] Validate the model result before returning it.
- [ ] Never insert into `outfits`, `outfit_items`, `clothing_items`, or wear-count data.

Never use a service-role key unless the function genuinely needs an admin operation. If one is used, keep the operation narrowly scoped and perform ownership checks first.

## Phase 4: Define the analysis response

Use structured output rather than asking the model for prose. A first response shape can be:

```json
{
  "matches": [
    {
      "clothing_item_id": "uuid-from-the-user-closet",
      "role": "top",
      "confidence": 0.86,
      "reason": "The visible black graphic shirt matches this closet item."
    }
  ],
  "unmatched_garments": [
    {
      "role": "shoes",
      "reason": "The shoes are not visible clearly enough."
    }
  ]
}
```

The function must validate that every returned `clothing_item_id` belongs to the authenticated user. The model may return a syntactically valid UUID that is not a valid user-owned item.

Treat confidence as a review hint, not a guarantee. The UI should use labels such as “Likely match” or “Needs review” rather than claiming mathematical certainty.

## Phase 5: Build the editable confirmation UI

Add a focused component, for example:

```text
src/components/OutfitAnalysisSuggestions.jsx
```

The component should:

- [ ] Show the analyzed outfit photo.
- [ ] Show suggested closet items with their photos and names.
- [ ] Preselect suggested matches.
- [ ] Allow the user to unselect an incorrect match.
- [ ] Allow the user to manually add another closet item.
- [ ] Show a retry button.
- [ ] Show a “Skip AI” or manual-selection path.
- [ ] Prevent saving until at least one item is selected, matching current behavior.
- [ ] Make clear that the AI suggestions are not final until the user confirms.

Suggested states:

- `idle` — photo selected, analysis not started.
- `uploading` — temporary image upload in progress.
- `analyzing` — Edge Function/model request in progress.
- `suggested` — editable suggestions displayed.
- `confirmed` — user accepted selections and normal save can continue.
- `failed` — helpful error with retry and manual fallback.
- `cancelled` — temporary file cleanup attempted.

## Phase 6: Connect confirmation to the existing save flow

- [ ] Keep AI suggestions in local component state only.
- [ ] Update `selectedIds` in `DocumentOutfitScreen` from the user’s final selections.
- [ ] Do not call `createOutfit()` during analysis.
- [ ] Call the existing save function only after the user confirms.
- [ ] Preserve the existing optional “share to community” behavior.
- [ ] Treat the confirmed selection as the source of truth.

For the first version, store confirmed `outfit_items` using the existing manual-save path. The user approved the final list, so the AI should not be treated as authoritative provenance.

## Phase 7: Cleanup lifecycle

Attempt cleanup in every path:

- [ ] Analysis succeeds.
- [ ] Analysis fails.
- [ ] User cancels.
- [ ] User leaves the screen.
- [ ] Outfit save succeeds.
- [ ] Outfit save fails.
- [ ] The app is reopened after an interrupted session.

Cleanup should be best-effort and should not hide the primary user-facing error. A failed delete should be logged safely and handled by scheduled cleanup later.

Do not log:

- API keys.
- Full signed URLs.
- Base64 image content.
- Private user profile data.

## Phase 8: Manual fallback and error handling

The feature must remain usable when:

- The user denies photo permission.
- Upload fails.
- The AI provider times out.
- The provider refuses or returns incomplete output.
- No closet items match.
- Closet photos cannot be loaded.
- The user is offline.
- Temporary cleanup fails.

Every AI failure should offer a clear action such as “Try again” or “Choose items manually.” The existing manual outfit workflow is the fallback and should not depend on AI availability.

## Phase 9: Testing checklist

Test with:

- [ ] A clear full-body outfit photo.
- [ ] A mirror photo with partial occlusion.
- [ ] A blurry or dark photo.
- [ ] Multiple similar closet items.
- [ ] An item not present in the closet.
- [ ] A photo with accessories or shoes that are hard to see.
- [ ] An outfit with layers.
- [ ] A large iPhone photo.
- [ ] An unsupported or unusual image format.
- [ ] No internet connection.
- [ ] A user who has no closet items.
- [ ] A user who cancels during analysis.
- [ ] App termination during upload or analysis.

Verify after every test that:

- No unconfirmed outfit was saved.
- No wear count changed prematurely.
- Returned item IDs belong to the current user.
- Temporary files are removed or become eligible for cleanup.
- Manual selection still works.
- Community sharing still works after confirmation.

## Recommended first work session

1. Create the temporary storage design and policies, but do not apply production changes yet.
2. Add image normalization/resizing locally.
3. Create the `analyze-outfit` Edge Function shell with authentication and a mocked response.
4. Add the confirmation UI using mocked suggestions.
5. Connect the confirmed IDs to the existing `createOutfit()` path.
6. Test the complete flow without a real AI provider.
7. Add the provider call only after the client/server contract works.

This order isolates the difficult parts. If the AI provider is unavailable, the rest of the user experience can still be completed and tested.

## Definition of done for the MVP

- The user can analyze a photo from the outfit screen.
- Suggestions come only from the authenticated user’s closet.
- The user must approve the final selection.
- Existing outfit and community-post behavior remains intact.
- Manual fallback is always available.
- Temporary images are cleaned up immediately when possible and covered by a backup cleanup process.
- No secrets or private image data are exposed in client code or logs.
- Relevant lint, build, and end-to-end checks pass.
