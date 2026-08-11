# Denton-West 80th — Backend API

A small Express + SQLite API that stores submissions from the celebration
website: Hackathon registrations, RSVPs, Gala RSVPs, book orders and tributes.
No external database service required — data lives in a single SQLite file.

## 1. What you need

- A place to run Node.js 18+ continuously. Any of these work well and have
  free tiers: **Render**, **Railway**, **Fly.io**, or a small VPS (e.g.
  DigitalOcean, Hetzner). A VPS keeps the SQLite file simplest since it has a
  persistent disk by default — some serverless platforms wipe the filesystem
  on redeploy, so if you use one of those, attach a persistent volume/disk to
  the path in `DB_PATH`.
- A domain or subdomain for the API is optional but recommended,
  e.g. `api.dentonwest80.com`.

## 2. Local setup (test before deploying)

```bash
cd server
npm install
cp .env.example .env
# edit .env: set ADMIN_KEY to a long random string, and CORS_ORIGIN to your site's URL
npm start
```

The API will be running at `http://localhost:4000`. Check it with:

```bash
curl http://localhost:4000/api/health
```

You should see `{"ok":true,"service":"denton-west-80th-api"}`.

## 3. Environment variables

| Variable      | Description                                                                 |
|---------------|-------------------------------------------------------------------------------|
| `PORT`        | Port the server listens on (most hosts set this for you automatically)       |
| `CORS_ORIGIN` | Comma-separated list of allowed website origins, e.g. your live site's URL   |
| `ADMIN_KEY`   | Secret the Committee Dashboard sends to read/export data. Make it long & random |
| `DB_PATH`     | Where the SQLite file is stored. Default: `./data/celebration.db`            |

Generate a strong `ADMIN_KEY` with:
```bash
openssl rand -hex 24
```

## 4. Deploying (Render — easiest free option)

1. Push the `server/` folder to a GitHub repository.
2. On [render.com](https://render.com), create a **New Web Service**, point it
   at the repo.
3. Build command: `npm install`  ·  Start command: `npm start`
4. Add a **Persistent Disk** (Render → your service → Disks) mounted at
   `/opt/render/project/src/data` (or wherever `DB_PATH` resolves to) so the
   SQLite file survives restarts and redeploys.
5. Add the environment variables from the table above under Render's
   "Environment" tab.
6. Deploy. Render gives you a URL like `https://denton-west-80th-api.onrender.com`.

The same steps work on Railway and Fly.io — the only difference is how each
platform names/attaches persistent volumes.

### Deploying to a VPS instead

```bash
# on the server
git clone <your-repo> && cd server
npm install --production
cp .env.example .env   # then edit it
npm install -g pm2
pm2 start server.js --name denton-west-api
pm2 save
pm2 startup   # follow the printed instructions so it restarts on reboot
```
Put Nginx or Caddy in front of it for HTTPS and to map your subdomain to
`localhost:4000`.

## 5. Point the website at your API

In `denton-west-80th-birthday.html`, find this line near the top of the
`<script>` block:

```js
const API_BASE = "https://YOUR-API-DOMAIN-HERE";
```

Replace it with your deployed API's URL (no trailing slash), e.g.:

```js
const API_BASE = "https://denton-west-80th-api.onrender.com";
```

Do the same in `admin.html`.

## 6. Using the Committee Dashboard (`admin.html`)

Open `admin.html` in a browser, enter the `ADMIN_KEY` you set in `.env` when
prompted, and it will pull live data from the API — with search and CSV
export for each category (Hackathon, RSVP, Gala, Book Orders, Tributes).

The dashboard sends your key as a header on every request; it is never
stored anywhere except your browser's session for that tab. Don't share
`admin.html` or the key outside the planning committee.

## 7. API reference

All request/response bodies are JSON unless noted.

| Method | Endpoint                    | Auth        | Purpose                          |
|--------|------------------------------|-------------|-----------------------------------|
| GET    | `/api/health`                | none        | Health check                      |
| POST   | `/api/hackathon`              | none        | Submit a Hackathon registration   |
| GET    | `/api/hackathon`              | admin key   | List all registrations            |
| GET    | `/api/hackathon/export.csv`   | admin key   | Download registrations as CSV     |
| POST   | `/api/rsvp`                   | none        | Submit the main RSVP form         |
| GET    | `/api/rsvp`                   | admin key   | List all RSVPs                    |
| GET    | `/api/rsvp/export.csv`        | admin key   | Download RSVPs as CSV             |
| POST   | `/api/gala-rsvp`              | none        | Submit a Gala RSVP                |
| GET    | `/api/gala-rsvp`              | admin key   | List all Gala RSVPs               |
| GET    | `/api/gala-rsvp/export.csv`   | admin key   | Download Gala RSVPs as CSV        |
| POST   | `/api/book-orders`            | none        | Submit a book order               |
| GET    | `/api/book-orders`            | admin key   | List all book orders              |
| GET    | `/api/book-orders/export.csv` | admin key   | Download book orders as CSV       |
| POST   | `/api/tributes`               | none        | Submit a tribute                  |
| GET    | `/api/tributes`               | none        | Latest 50 tributes (Tribute Wall) |
| GET    | `/api/tributes/export.csv`    | admin key   | Download all tributes as CSV      |
| GET    | `/api/stats`                  | admin key   | Submission counts per category    |

Admin routes expect the header: `x-admin-key: <your ADMIN_KEY>`

## 8. Backing up data

The entire database is one file (`data/celebration.db`, plus `-wal`/`-shm`
files). To back it up, copy those files off the server periodically — a
simple cron job with `scp` or `rsync` is enough for an event of this size.

## 9. Rate limiting & abuse protection

Form submissions are limited to 30 per IP per 15 minutes across all forms.
Adjust `submitLimiter` in `server.js` if you expect a bigger surge (e.g. right
when registration opens).

## 10. Deploying the website (frontend) to Netlify

The API server described above cannot run on Netlify (it's a static host — no
persistent Node process, no file-based database). Deploy the **website**
(`index.html`, `admin.html`, `images/`) to Netlify, and this **API** to
Render/Railway/a VPS as described in section 4. See the separate
`denton-west-80th-site-netlify.zip` package for the frontend files.

### Fastest way — drag and drop

1. Go to https://app.netlify.com and sign up / log in (free).
2. On your dashboard, find the **"Deploys"** box that says *"Drag and drop
   your site output folder here."*
3. Unzip `denton-west-80th-site-netlify.zip` on your computer — you should
   have a folder containing `index.html`, `admin.html`, and an `images`
   folder.
4. Drag that unzipped folder onto the Netlify drop zone.
5. Netlify uploads it and gives you a live URL in seconds, like
   `https://random-name-123.netlify.app`.
6. (Optional) Under **Site settings → Domain management**, you can rename
   the subdomain (e.g. `dentonwest80.netlify.app`) or connect a custom
   domain you own (e.g. `dentonwest80.com`).

### Updating the site later

Whenever you edit `index.html` or `admin.html`, just re-zip the folder and
drag it onto the same Netlify site's "Deploys" tab (or drag the updated
folder onto the same drop zone) — it replaces the live version instantly.

### Before it goes live, do these two things

1. In `index.html` and `admin.html`, replace
   `const API_BASE = "https://YOUR-API-DOMAIN-HERE";` with your deployed
   API's real URL from Render/Railway (section 4).
2. Once you know your Netlify URL, set `CORS_ORIGIN` in the API's `.env` (or
   your host's environment variables) to that exact URL, e.g.
   `CORS_ORIGIN=https://dentonwest80.netlify.app` — otherwise the API will
   block requests from your live site.
