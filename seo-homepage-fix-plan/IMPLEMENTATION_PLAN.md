# SEO Fix Plan: Only Homepage Should Participate In Search

## Goal

Bring the project to a state where only the homepage `/` is intended to participate in SEO/indexation.

Target result:

- `/` stays indexable and remains in `sitemap.xml`.
- `dashboard`, `admin`, auth, billing, account, payment, legal, and 404 pages do not participate in SEO.
- Current route structure, auth flow, feature-based folders, and backend APIs stay unchanged.

## Important Answer First: Will This Break Site Structure?

Short answer: **no, if implemented in the safe order below**.

The safe part of the fix does **not** require:

- changing route URLs;
- moving components between feature folders;
- replacing `BrowserRouter`;
- changing auth logic;
- changing backend endpoints;
- converting the app to SSR.

The safe part only changes:

- head/meta management;
- sitemap generation;
- robots rules;
- crawl/indexation hints for non-home routes.

The **only** part that can affect build/runtime structure is the optional prerender step for `/`. That step should be treated as a separate phase and separate commit.

## Scope

### In scope

- Homepage SEO cleanup and hardening.
- Removal of non-home routes from sitemap.
- Explicit noindex handling for non-home pages.
- Safer default `index.html` so non-home routes stop inheriting homepage SEO tags.
- Crawl-noise reduction via `robots.txt`.
- Small homepage SEO hygiene improvements that do not change architecture.

### Out of scope

- Full SSR migration.
- Router rewrite.
- Backend refactor.
- Content rewrite of the whole landing.
- Test creation.

## Current State Snapshot

### 1. `sitemap.xml` currently includes non-home routes

Current files:

- `frontend/public/sitemap.xml`
- `frontend/generate-sitemap.js`

Current problem:

- `sitemap.xml` includes `/register`, `/login`, `/terms-and-privacy`.
- This directly conflicts with the target: only `/` should participate.

### 2. `robots.txt` currently allows everything

Current file:

- `frontend/public/robots.txt`

Current problem:

- No crawl restrictions for `/admin`, `/dashboard`, `/account`, `/billing`, `/create-model`, `/payment`, `/login`, `/register`, `/terms-and-privacy`.

### 3. Raw HTML is homepage-specific for every route

Current file:

- `frontend/public/index.html`

Current problem:

- Static `<title>`, `<meta name="description">`, canonical, Open Graph, and Twitter tags are homepage-specific.
- Because this is a CRA SPA and the same HTML shell is served for many routes, `/admin`, `/dashboard`, `/login`, `/register`, `/terms-and-privacy` initially inherit homepage metadata.

This is the single biggest structural SEO issue in the current implementation.

### 4. The SEO component already supports `noindex`, but it is not used as a route policy

Current file:

- `frontend/src/components/SEO.jsx`

Current note:

- `SEO` already accepts `noindex = false`.
- The project is partially prepared for route-level SEO, but the policy is incomplete.

### 5. Many non-home pages either expose SEO tags or inherit homepage tags

Relevant files:

- `frontend/src/pages/LoginPage.js`
- `frontend/src/pages/RegisterPage.js`
- `frontend/src/pages/TermsAndPrivacyPage.js`
- `frontend/src/pages/DashboardPage.js`
- `frontend/src/pages/CreateModelPage.js`
- `frontend/src/pages/AccountPage.js`
- `frontend/src/pages/BillingPage.js`
- `frontend/src/pages/PaymentSuccessPage.js`
- `frontend/src/pages/PaymentCancelPage.js`
- `frontend/src/pages/AdminPage.js`
- `frontend/src/App.js` for 404 handling

Current problem:

- Some non-home pages use SEO but are not marked `noindex`.
- Some pages have no SEO component at all, so homepage static tags remain the fallback.

### 6. Homepage content still depends on client-side rendering

Relevant files:

- `frontend/src/pages/HomePage.js`
- `frontend/src/components/home/Faq.jsx`

Current note:

- Homepage meta/schema is applied through React after JS execution.
- This is acceptable as a short-term fix path, but still weaker than prerendered HTML for SEO.

## Route Policy Matrix

The next model should implement this route policy and not improvise beyond it.

### Indexable

- `/`

### Noindex + not in sitemap + should not be publicly promoted for SEO

- `/admin`
- `/dashboard`
- `/create-model`
- `/account`
- `/billing`
- `/payment/success`
- `/payment/cancel`
- `/login`
- `/register`
- `/terms-and-privacy`
- unknown routes / 404

## Recommended Implementation Order

This order is important because it avoids breaking behavior while cleaning SEO.

### Phase 1. Make the HTML shell neutral

Files:

- `frontend/public/index.html`

Actions:

1. Remove homepage-specific SEO tags from the static HTML shell:
   - homepage title;
   - homepage description;
   - homepage canonical;
   - homepage OG tags;
   - homepage Twitter tags;
   - homepage keywords.
2. Keep only neutral/global tags:
   - charset;
   - viewport;
   - theme-color;
   - favicon/app icons;
   - manifest;
   - fonts;
   - analytics scripts.
3. Replace the static title with a neutral brand-level fallback, for example:
   - `MyPhotoAI`

Why this phase comes first:

- Right now non-home routes inherit homepage metadata before React runs.
- Neutral shell metadata immediately removes the worst duplicate-signal problem without touching routing.

Structure risk:

- None if limited to head cleanup.

### Phase 2. Turn `SEO.jsx` into the single route-level source of truth

Files:

- `frontend/src/components/SEO.jsx`

Actions:

1. Keep the current Helmet-based approach.
2. Make sure the component supports these cases cleanly:
   - full homepage SEO;
   - `noindex` pages;
   - optional canonical suppression if needed.
3. Do **not** force all noindex pages to canonical `/`.

Important note for the next model:

- For non-home pages, prefer `noindex, nofollow`.
- Do not use "canonical to homepage for everything" as the main strategy. That is not the clean fix here.

Why:

- Current stack already uses `HelmetProvider` and route-level `SEO`.
- Context7 check confirms Helmet-based per-page head overrides are the right pattern here.

Structure risk:

- None.

### Phase 3. Keep full SEO only on the homepage

Files:

- `frontend/src/pages/HomePage.js`
- optionally `frontend/src/components/home/Hero.jsx`

Actions:

1. Keep homepage canonical to `/`.
2. Keep homepage description and schema.
3. Keep homepage OG/Twitter tags.
4. Make sure homepage remains the only route with indexable SEO tags.
5. Recommended text improvement:
   - align `H1` more closely with the homepage target query.

Current mismatch:

- Title is about AI digital twin / photorealistic images.
- Hero `H1` is more generic: "Visualize Your Dreams with AI".

Safe improvement:

- Keep design and section structure.
- Only improve keyword alignment in copy.

Structure risk:

- None.

### Phase 4. Add explicit noindex SEO to every non-home route

Files to update:

- `frontend/src/pages/LoginPage.js`
- `frontend/src/pages/RegisterPage.js`
- `frontend/src/pages/TermsAndPrivacyPage.js`
- `frontend/src/pages/DashboardPage.js`
- `frontend/src/pages/CreateModelPage.js`
- `frontend/src/pages/AccountPage.js`
- `frontend/src/pages/BillingPage.js`
- `frontend/src/pages/PaymentSuccessPage.js`
- `frontend/src/pages/PaymentCancelPage.js`
- `frontend/src/pages/AdminPage.js`
- `frontend/src/App.js` for 404

Actions:

1. Add route-level `SEO` to every page above.
2. For all non-home pages, set:
   - `noindex={true}`
3. For 404:
   - add a minimal `SEO` block with `noindex={true}` in the inline `NotFound` component or move 404 into a dedicated page file if needed.
4. For `AdminPage`:
   - add `SEO noindex` directly in the page because it is rendered outside `Layout`.
5. For protected pages:
   - `DashboardPage`
   - `CreateModelPage`
   - `AccountPage`
   - `BillingPage`

Why this is still necessary even with `ProtectedRoute`:

- When authenticated users open those routes, they should not expose indexable metadata.
- The rule is "only homepage participates", not "only anonymous pages participate".

Structure risk:

- None if done page-by-page.

### Phase 5. Clean sitemap to homepage-only

Files:

- `frontend/generate-sitemap.js`
- `frontend/public/sitemap.xml`

Actions:

1. Change the `links` array to contain only:
   - `/`
2. Regenerate `frontend/public/sitemap.xml`.
3. Keep sitemap generation wired into `npm run build`.

Context7 note:

- Current `sitemap` package usage is valid.
- The fix is simply to omit non-home URLs from the source array.

Structure risk:

- None.

### Phase 6. Reduce crawl noise via `robots.txt`

Files:

- `frontend/public/robots.txt`

Actions:

1. Keep the sitemap pointer.
2. Add explicit disallow rules for non-home sections:
   - `/admin`
   - `/dashboard`
   - `/create-model`
   - `/account`
   - `/billing`
   - `/payment/`
   - `/login`
   - `/register`
   - `/terms-and-privacy`
3. Keep `/` crawlable.

Important note:

- `robots.txt` alone does not replace `noindex`.
- It is a supporting signal to reduce crawl noise.

Structure risk:

- None.

### Phase 7. Optional cleanup of public internal links

Files to review:

- `frontend/src/components/Navbar.js`
- `frontend/src/components/Footer.js`

Actions:

1. Review public navigation links that expose non-home routes to crawlers.
2. Strong candidate:
   - the unauthenticated "Buy Points" link to `/billing`
3. Decide one of two safe options:
   - remove it from anonymous navigation;
   - keep it, but rely on `noindex` + `robots.txt`.

Recommendation:

- If the product goal is homepage-only SEO, removing the anonymous `/billing` entry point is cleaner.

Structure risk:

- Low, but this changes UX/navigation.
- Treat as a product decision, not a pure technical SEO decision.

### Phase 8. Homepage performance and media hygiene

Files to review:

- `frontend/src/components/home/LivePhoto.jsx`
- `frontend/src/components/home/ModelGeneration.jsx`
- `frontend/src/components/home/PhotoEditing.jsx`
- `frontend/src/components/home/Capabilities.jsx`

Actions:

1. Change video loading strategy:
   - current `preload="auto"` on multiple videos is too aggressive;
   - use a lighter option such as `metadata` unless UX breaks.
2. Improve image `alt` text:
   - replace generic values like "Generated photo 1" with descriptive, intent-relevant text.
3. Keep homepage sections functional if API-driven preset loading fails.
4. Avoid changing section order or component structure unless necessary.

Why this phase is not first:

- It is useful, but secondary to indexation control.

Structure risk:

- Low if limited to attributes and loading behavior.

### Phase 9. Optional stronger fix: prerender the homepage only

This phase is the only one that can affect project build structure.

Why it exists:

- Even after all safe fixes above, the app remains a client-rendered SPA.
- Search bots can still see thinner initial HTML than ideal.
- If the team wants the homepage SEO to be materially stronger, the homepage should be prerendered.

Important rule:

- Do **not** convert the whole app to SSR as part of this SEO task.
- Do **not** refactor routing structure for this task.

Safe strategy:

1. Treat homepage prerender as a separate implementation phase.
2. Treat homepage prerender as a separate commit.
3. Keep route URLs and page/component locations unchanged.
4. Verify that only `/` receives prerendered SEO value.

If this phase causes build instability:

- stop;
- keep Phases 1-8 only;
- ship the safe SEO cleanup first.

## Exact File Checklist For The Next Model

### Must change

- `frontend/public/index.html`
- `frontend/src/components/SEO.jsx`
- `frontend/src/pages/HomePage.js`
- `frontend/src/pages/LoginPage.js`
- `frontend/src/pages/RegisterPage.js`
- `frontend/src/pages/TermsAndPrivacyPage.js`
- `frontend/src/pages/DashboardPage.js`
- `frontend/src/pages/CreateModelPage.js`
- `frontend/src/pages/AccountPage.js`
- `frontend/src/pages/BillingPage.js`
- `frontend/src/pages/PaymentSuccessPage.js`
- `frontend/src/pages/PaymentCancelPage.js`
- `frontend/src/pages/AdminPage.js`
- `frontend/src/App.js`
- `frontend/generate-sitemap.js`
- `frontend/public/sitemap.xml`
- `frontend/public/robots.txt`

### Review, change only if needed

- `frontend/src/components/Navbar.js`
- `frontend/src/components/Footer.js`
- `frontend/src/components/home/Hero.jsx`
- `frontend/src/components/home/LivePhoto.jsx`
- `frontend/src/components/home/ModelGeneration.jsx`
- `frontend/src/components/home/PhotoEditing.jsx`
- `frontend/src/components/home/Capabilities.jsx`

## Definition Of Done

The fix is complete when all items below are true.

### Indexation rules

- Only `/` is present in `sitemap.xml`.
- `robots.txt` disallows the non-home routes listed above.
- All non-home routes render `noindex`.
- 404 renders `noindex`.

### Homepage SEO

- Homepage has its own title, description, canonical, OG, Twitter, and schema.
- Homepage remains the only route intended for indexation.

### HTML shell behavior

- Static `index.html` no longer contains homepage-only SEO metadata that leaks onto all routes.

### Structure safety

- Route URLs are unchanged.
- `BrowserRouter` remains.
- Auth flow remains.
- Feature-based folder structure remains.
- No backend API contract is changed.

## Verification Checklist

Run after implementation.

### Local checks

1. In `frontend`:
   - `npm run build`
2. Inspect generated files:
   - `build/index.html`
   - generated `public/sitemap.xml`
   - `public/robots.txt`
3. Manually open app routes and inspect `<head>` in browser for:
   - `/`
   - `/login`
   - `/register`
   - `/terms-and-privacy`
   - `/admin`
   - `/dashboard`
   - unknown route

### Expected result per route

- `/`:
  - indexable metadata
  - canonical `/`
- all others:
  - `noindex, nofollow`

### Production-style smoke checks

Use HTTP checks after deployment:

1. `GET /robots.txt`
2. `GET /sitemap.xml`
3. `GET /`
4. `GET /login`
5. `GET /admin`
6. `GET /dashboard`

Verify:

- sitemap contains only `/`
- robots contains disallow rules
- non-home routes no longer advertise homepage SEO as their intended metadata

## Recommended Commit Strategy

To avoid breakage, the next model should not do everything in one unreviewed lump.

Suggested order:

1. Commit 1:
   - neutral `index.html`
   - route-level `noindex`
2. Commit 2:
   - sitemap + robots
3. Commit 3:
   - homepage content/performance polish
4. Commit 4, optional:
   - homepage prerender

## Final Guidance For The Next Model

If there is time for only one safe pass, implement **Phases 1-6** first.

That gives the highest SEO value with the lowest structural risk.

If the task requires "full technical SEO strength for the homepage", add **Phase 9** only after the safe pass is stable.
