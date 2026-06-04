# Book Club Scheduler

A simple availability poll — Morning / Afternoon / Evening slots, color-coded per person, shareable links with no sign-up required for respondents.

## Deploy to Railway (5 min)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "initial"
   gh repo create bookclub-scheduler --public --push
   ```

2. **Create Railway project**
   - Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   - Select `bookclub-scheduler`

3. **Add Postgres**
   - In your Railway project → New → Database → PostgreSQL
   - Railway auto-sets `DATABASE_URL` in your service's environment

4. **Set environment variables**
   - In your service → Variables → add:
     ```
     NODE_ENV=production
     ADMIN_PASSCODE=pick-a-secret
     ```
   - `ADMIN_PASSCODE` is the passcode you enter to reach the **My polls** dashboard
     (create/delete polls). Respondents never need it — they just open the link you send.

5. **Deploy** — Railway picks up the `Procfile` and runs `node server.js`.  
   The DB tables are created automatically on first boot.

6. **Get your URL** — Railway gives you a `.railway.app` domain.  
   That's your shareable base URL — poll links look like:  
   `https://your-app.railway.app/?poll=abc12345`

## Local dev

```bash
cp .env.example .env
# fill in your local Postgres connection string
npm install
npm run dev
```

## How it works

| Role | What they do |
|------|-------------|
| Organizer | Picks days + Morning/Afternoon/Evening slots, gets a shareable link |
| Friends | Open link, enter name, tap available slots, submit |
| Results | Color-coded overlap bar shows who's free when; best slot auto-highlighted |

Each person is assigned a color automatically. Re-submitting with the same name updates your response.

## Running multiple polls

Visit the app's root URL and enter your `ADMIN_PASSCODE` to reach the **My polls** dashboard.
From there you can:

- Create up to **5 polls** — one per group or calendar (the cap is enforced server-side).
- See each poll's response count at a glance.
- **Copy link** to send to that poll's group, **Open** to view/edit, or **Delete** it.

Everything lives in Postgres, so the list survives across devices and browser wipes — the
passcode is the only thing cached locally (purely for convenience). Each poll's responses are
fully independent: the same person can be in several polls and is tracked separately in each
(enforced by a `UNIQUE(poll_id, voter_name)` constraint), so sending links to overlapping
groups never mixes anyone's availability.
