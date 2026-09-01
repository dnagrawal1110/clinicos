# Repositories

This directory is the one place Supabase queries are allowed to live
(section 8). Nothing outside `src/repositories/*` and `src/lib/supabase/*`
should import `@supabase/supabase-js` directly.

Every function here follows the same shape:

```
UI component
  -> (future) a hook, e.g. useClients()
    -> a repository function, e.g. listClients()
      -> INTEGRATION_MODE=mock: reads src/lib/mock/*, returns synchronously-shaped data
      -> INTEGRATION_MODE=live: queries Supabase, returns the same shape
```

## Current status — read this before adding a new one

The existing dashboard (`src/lib/scope-selectors.ts` and everything built on
it) reads mock data **synchronously** — a component calls
`getScopedLocations(scope)` inline during render and gets an array back
immediately. Real Supabase queries are asynchronous. Rewiring the entire
dashboard to consume async data (loading states, Suspense/`use()`, or a
client cache like React Query) is its own project — the migration plan
(spec section 68) calls it out as a separate phase ("Phase 4: Replace
dashboard reads") for exactly this reason.

So, as of this pass:

- **`reviewRequests.ts`** (the tokenized `/r/:token` ReviewFlow surface) is
  fully live-capable *today* — it's a new, isolated route that was built
  async-first (loading state, `useEffect`), so there was nothing to retrofit.
- **`clients.ts` / `locations.ts` / `tasks.ts`** in this directory are real,
  working dual-mode repositories — call them from a Server Component, a
  route handler, or a new hook and INTEGRATION_MODE=live will genuinely hit
  Supabase. They are **not yet wired into `scope-selectors.ts`** — doing
  that safely means converting its consumers to async, which is Phase 4,
  not a side effect of adding a repository file.

When Phase 4 happens, the mechanical move is: replace the mock-array logic
inside `scope-selectors.ts`'s functions with calls into these repositories
behind a data-fetching hook, one domain at a time, verifying each against
the acceptance test before moving to the next.
