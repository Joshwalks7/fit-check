# AGENTS.md

## Project overview

This is an Expo React Native app for managing a personal clothing closet, documenting outfits, tracking wear frequency, and sharing looks with a community. It runs on Android, iOS, and the web.

The backend is Supabase. Authentication, database access, and storage access should go through the existing Supabase client and service modules.

## Architecture

- `src/App.jsx` owns the authenticated session, profile loading, top-level screen routing, and bottom navigation.
- `src/components/` contains screens and reusable UI components.
- `src/services/` contains Supabase-facing business logic. Keep database queries and storage operations out of presentational components when practical.
- `src/lib/supabase.js` is the shared Supabase client. Do not create additional clients without a clear architectural reason.
- `supabase/` contains database-related SQL and documentation.
- `App.jsx` at the repository root is the Expo entry-point re-export and should remain minimal.

## Development conventions

- Use existing React Native and Expo patterns already present in the repository.
- Prefer small, focused changes over broad rewrites.
- Reuse existing components, styles, service functions, and data shapes before creating new abstractions.
- Preserve the current visual language: light backgrounds, purple accent color, rounded cards, and compact mobile-first layouts.
- Keep user-facing errors understandable and provide a recovery action where appropriate.
- Preserve existing behavior unless the requested feature requires changing it.
- Do not add a dependency when the current Expo or React Native APIs can solve the problem cleanly.

## Supabase and data safety

- Never expose secrets, service-role keys, or private credentials in source files, logs, commits, or client-visible code.
- Client code may use only the intended public Supabase environment variables.
- Do not weaken Row Level Security, storage policies, or authorization checks to make a feature work.
- Treat database schema changes as deliberate migrations. Inspect existing tables and relationships before writing SQL.
- Do not delete, rename, or backfill production data without explicit approval.
- Use the authenticated user from Supabase rather than trusting a user ID supplied by the UI.
- Keep user-owned data scoped to the authenticated user unless the feature explicitly requires public access.
- For public profiles and community content, expose only the fields required by the product behavior.

## AI feature boundaries

AI outfit analysis is advisory, not authoritative.

- The AI may suggest clothing items, attributes, or confidence levels.
- The AI must not directly create outfit records, increment wear counts, or modify closet items without user confirmation.
- Suggestions must be validated against the user’s actual closet items before they are shown as selectable matches.
- Users must be able to confirm, remove, or manually add items.
- AI failures, uncertain matches, unavailable images, and partial results must have a usable fallback path.
- AI API keys and privileged model calls belong on a trusted server-side boundary such as a Supabase Edge Function, never in the mobile client.
- Avoid sending more personal image or profile data to an AI service than the feature requires.
- Design the data model so confirmed user corrections are retained as the source of truth.

## Feature workflow

For a requested feature:

1. Inspect the relevant screens, services, schema assumptions, and existing data flow.
2. State the affected files and implementation approach before making a substantial change.
3. Prefer a vertical slice that works end to end over disconnected UI-only work.
4. Keep database, storage, authentication, and privacy implications in scope.
5. Implement the smallest complete version that satisfies the acceptance criteria.
6. Run the relevant checks and inspect the diff.
7. Report what changed, what was verified, and any remaining external setup required.

## Approval boundaries

Proceed independently with read-only inspection, local code changes, linting, and safe local verification.

Ask for approval before:

- Applying destructive or irreversible database changes.
- Changing production data, authentication settings, RLS policies, or storage policies.
- Deploying Edge Functions or other production infrastructure.
- Adding paid external services or AI API usage.
- Removing existing features or making a broad architectural rewrite.
- Sending user data, images, or messages to an external service beyond the explicitly requested feature.

## Verification

Use these commands from the repository root:

```bash
npm install
npm run lint
npm run dev
```

When changing a user flow, verify at minimum:

- Signed-out and signed-in behavior.
- Loading, empty, success, cancellation, and error states.
- Ownership and authorization boundaries.
- Mobile layout and touch targets.
- Refresh/reload behavior after writes.
- That unrelated navigation and existing features still work.

The current lint command is `npm run lint`. Fix warnings introduced by the requested change when practical, but do not perform unrelated cleanup unless it is necessary for correctness.

## Completion standard

A feature is complete only when the requested behavior is implemented, affected states are handled, relevant checks pass, and any required Supabase configuration or migration steps are clearly identified.
