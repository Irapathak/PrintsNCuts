# PrintsNCuts

Machinery marketplace for the printing community in northern India: INR listings, filters, machine details and media, seller company profiles, private listing conversations, reports and administrator controls.

## Start locally

Node.js 22.16.0 was tested. Install dependencies once:

```sh
npm ci
```

For a ready-made local demo:

```sh
npm run demo
```

Open http://localhost:3000.

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@printsncuts.test | Demo-market-2026! |
| Seller | seller@printsncuts.test | Demo-market-2026! |
| Admin | admin@printsncuts.test | Demo-admin-2026! |

Demo uses `data/demo/market.db`, illustrative images/specifications, and generic sample video. Do not deploy demo mode publicly.

For an empty local marketplace, copy `.env.example` to `.env`, set your admin details, and run `npm start`. `.env` loads automatically. In `MAIL_MODE=development`, codes/reset links appear on screen and no emails are sent. In `MAIL_MODE=resend`, actual delivery requires a verified sender and API key.

## Launch setup

Follow [LAUNCH_GUIDE.md](LAUNCH_GUIDE.md) for existing GitHub/domain setup, Render hosting + persistent SQLite disk, Resend DNS verification, environment variables, HTTPS, real-user testing, backup/restore, and remaining public-launch tasks. `render.yaml` defines a PAID single-instance service and disk; review billing before applying it. No hosting resources are created by running this repository locally.

## Implemented backend

- SQLite persistence and additive versioned schema migration.
- Hashed passwords, hashed session tokens, secure production cookies, persistent throttling and same-origin JSON writes.
- Email verification/resend, one-use expiring password-reset links, and session invalidation after reset.
- Photos decoded and re-encoded to WebP by Sharp; uploads are files in `DATA_DIR/uploads`.
- Server-enforced listing ownership and private chat participants.
- Queued email notifications with retry/backoff, admin queue status and retry action.
- Admin moderation records, health check and online database backups.

## Tests and operations

```sh
npm test
npm run check:config
npm run backup
npm run check:backup -- /path/to/completed-backup.db
```

Tests use temporary databases and mock outbound email. They cover buyer/seller/admin flows, production verification and recovery, single-use tokens, session invalidation, media validation, queued delivery failure/retry, backup integrity, and request-origin restrictions. Live inbox delivery and Render persistence still require testing with your accounts.

Production creates a backup at startup and daily while running, retaining seven copies on the SAME disk. Copy completed DB backups and uploads off-server. The guide explains restore testing. Backups are sensitive and must never be committed.

## Remaining before broad public release

Real account setup and live delivery validation; app-admin MFA; reviewed policy pages and deletion process; independent monitoring/alerts; automated off-server backups; bounced-email handling; byte-based storage quotas and orphan cleanup (a 200-upload-per-account cap is enforced); pagination for larger volumes. Phone verification and native video uploads are not implemented. This is a single-instance pilot architecture, not a horizontally scalable deployment or security-audited product.
