# Denton-West 80th — Simple Backend

A small Express + SQLite API. No separate database to set up — everything
lives in one file. No user accounts — just one shared password for the
Committee Dashboard.

## What it stores
Hackathon registrations, RSVPs (including Gala attendance), book orders,
and tributes (which need approval before they show on the public Tribute
Wall).

## Environment variables (only 4)

| Variable      | What it is                                                    |
|---------------|-----------------------------------------------------------------|
| `PORT`        | Set automatically by most hosts — you usually don't need to touch this |
| `CORS_ORIGIN` | Your live website's URL, e.g. `https://denton-west-80th.netlify.app` |
| `ADMIN_KEY`   | The password for the Committee Dashboard — make it long and random |
| `DB_PATH`     | Where the database file lives. Default: `./data/celebration.db` |

## Deploying on Render (recommended — free)

1. Push this folder to a GitHub repository — make sure `package.json` sits
   at the very top level of the repo, not nested inside another folder.
2. On render.com: **New +** → **Web Service** → connect your repo.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add a **Disk** (Render → your service → Disks tab): mount path
   `/opt/render/project/src/data`, size 1 GB — this keeps your data safe
   across restarts.
6. Under Environment, add the 4 variables from the table above.
7. Create the service. When it says "Live," your API address is at the
   top of the page (e.g. `https://your-app.onrender.com`).

## Committee Dashboard

Open `admin.html`, enter the `ADMIN_KEY` you set above, and you're in —
view, search and export every submission, and approve tributes so they
appear on the public Tribute Wall.

## API reference

| Method | Endpoint                                    | Auth      | Purpose                        |
|--------|----------------------------------------------|-----------|----------------------------------|
| GET    | `/api/health`                                 | none      | Health check                    |
| POST   | `/api/hackathon/registrations`                | none      | Submit a Hackathon registration |
| GET    | `/api/admin/hackathon/registrations`          | admin key | List all registrations          |
| GET    | `/api/admin/hackathon/registrations/export.csv` | admin key | Download as CSV               |
| POST   | `/api/rsvps`                                  | none      | Submit RSVP or Gala RSVP        |
| GET    | `/api/admin/rsvps`                            | admin key | List all RSVPs                  |
| GET    | `/api/admin/rsvps/export.csv`                 | admin key | Download as CSV                 |
| POST   | `/api/book-orders`                            | none      | Submit a book order              |
| GET    | `/api/admin/book-orders`                      | admin key | List all orders                  |
| GET    | `/api/admin/book-orders/export.csv`           | admin key | Download as CSV                 |
| POST   | `/api/tributes`                               | none      | Submit a tribute (needs approval)|
| GET    | `/api/tributes`                               | none      | Approved tributes (Tribute Wall) |
| GET    | `/api/admin/tributes`                         | admin key | All tributes, approved or not    |
| PATCH  | `/api/admin/tributes/:id/approve`             | admin key | Approve a tribute                |
| GET    | `/api/admin/tributes/export.csv`              | admin key | Download all tributes as CSV     |

Admin routes expect the header: `x-admin-key: <your ADMIN_KEY>`

## Backing up

The whole database is one file: `data/celebration.db` (plus `-wal`/`-shm`
files sitting next to it). Copy those off the server now and then.

## Visitor Photo Uploads

Visitors can upload their own photos from the website. Like tributes, every
photo needs your approval before it appears publicly.

- Photos are saved to a folder called `uploads/`, sitting right next to your
  database file — so if you already have a persistent disk set up for the
  database (see the Deploying section above), photos are automatically
  covered by the same disk. No extra setup needed.
- Only image files are accepted — anything else (including videos) is
  rejected automatically, both in the browser and on the server.
- Each photo is capped at 12MB.
- Approve or remove photos from the **Visitor Photos** tab in the Committee
  Dashboard (`admin.html`).

### Storage warning at 800MB

The dashboard shows a live storage meter for visitor photos, and displays a
clear warning banner once total uploads pass 800MB, so you know when it's
time to review and clear out older photos (or move to paid storage). This
check happens every time you open the dashboard — there's no email or SMS
alert, since this simple backend doesn't send outbound notifications.

### New API endpoints

| Method | Endpoint                              | Auth      | Purpose                          |
|--------|----------------------------------------|-----------|-----------------------------------|
| POST   | `/api/visitor-photos`                  | none      | Upload a photo (multipart form, field name `photo`) |
| GET    | `/api/visitor-photos`                  | none      | Approved photos only (for the public gallery) |
| GET    | `/api/admin/visitor-photos`            | admin key | All photos, approved or pending   |
| PATCH  | `/api/admin/visitor-photos/:id/approve`| admin key | Approve a photo                   |
| DELETE | `/api/admin/visitor-photos/:id`        | admin key | Remove a photo permanently        |
| GET    | `/api/admin/storage-status`            | admin key | Current storage usage vs 800MB    |
