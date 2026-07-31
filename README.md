# Smiletomorrow

A dental hospital directory ranked by patients — Home, Listings (with filters),
a "List your Hospital" submission form, a personal Dashboard, and an Admin
review queue. Plain HTML/CSS/JS, no build step, backed by a real Supabase
(Postgres) database so submissions persist for every visitor.

## 1. Create your database (5 minutes)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
2. Once it's created, open **SQL Editor** → **New query**.
3. Paste in the entire contents of `supabase-schema.sql` (in this folder) and click **Run**.
   This creates the `hospitals` table, security rules, and a handful of sample
   listings so the site isn't empty on first load. Delete the seed section
   from the SQL file first if you don't want the sample data.
4. Go to **Project Settings → API**. You'll need two values:
   - **Project URL**
   - **anon public** key

## 2. Connect the app to your database

Open `config.js` and replace the placeholders:

```js
window.SMILETOMORROW_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  ADMIN_PASSCODE: "pick-something-only-you-know",
};
```

Save the file. That's it — no npm install, no build step.

## 3. Try it locally

Just open `index.html` in a browser, or serve the folder with any static
server, e.g.:

```bash
npx serve .
```

## 4. Deploy it

Any static host works since this is plain HTML/CSS/JS. Easiest options:

**Netlify (drag and drop)**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag this whole folder in. Done — you get a live URL immediately.

**Vercel**
1. `npm i -g vercel` then run `vercel` inside this folder, or
2. Push this folder to a GitHub repo and import it at [vercel.com/new](https://vercel.com/new)
   (framework preset: "Other" / static — no build command needed).

**GitHub Pages**
1. Push this folder to a repo.
2. Repo → Settings → Pages → set source to the branch/root.

## How it works

- **Home / Listings / List your Hospital / Dashboard** are all one HTML page
  (`index.html`) with a tiny hash-based router in `app.js` (`#/`, `#/listings`,
  `#/list-hospital`, `#/dashboard`).
- Data lives in the `hospitals` table in your Supabase project and is read/written
  directly from the browser using the Supabase JS client (loaded via CDN in
  `index.html` — no backend server to run).
- Every new submission starts as `pending` (enforced by a database trigger, so
  it can't be bypassed from the browser). It only appears on the public
  Listings/Home pages once an admin approves it.
- **"Your Hospitals"** on the Dashboard is matched to a random ID generated
  once and stored in your browser's `localStorage` — so it's per-browser, not
  a real login. If you want real accounts (so people can see their listings
  from any device), add Supabase Auth — see below.
- **Admin** lives at `#/admin` (not in the bottom nav — visit it by typing
  `yoursite.com/#/admin`). It's protected by the passcode in `config.js`.

## Hardening the admin screen

The passcode gate is a convenience, not real security — anyone who views
`config.js` can read it, and the database's `update` policy is currently open
to anyone holding the public anon key. This is a normal, low-risk trade-off for
a small directory site, but if you want real security:

1. Enable **Supabase Auth** and create yourself an admin user.
2. Change the `"public update"` policy in `supabase-schema.sql` to check
   `auth.uid()` against an admin table, instead of `using (true)`.
3. Add a login form to the Admin screen using `sb.auth.signInWithPassword(...)`.

Happy to build that upgrade if you want it — just ask.
