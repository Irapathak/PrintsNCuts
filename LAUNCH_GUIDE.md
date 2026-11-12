# PrintsNCuts: from local MVP to a public pilot

Prepared 12 November 2026. This guide matches the files in `/Users/irapathak/Documents/ChatGPT/PrintsNCuts`, not the older Desktop prototype. Account dashboards may change; links below point to the official documentation.

## 1. What is already done and what you need to supply

The app has a real Node.js backend, SQLite database, password hashing, server-side sessions, seller-owned listings, private conversations, reporting and administration. The new launch work adds Resend email integration, verification resends, expiring single-use password-reset links, session invalidation after reset, persistent rate limiting, a notification retry queue, image decoding/re-encoding into private-disk files, health checks, audit records, and database backup utilities. A Render deployment file and GitHub Actions tests are included.

Local automated tests use a mocked email provider. No real email has been sent, no Render resources have been created, and no live deployment or DNS changes have been made. Live delivery and persistence must be tested with your own accounts before publishing.

You confirmed the GitHub repository `Irapathak/PrintsNCuts`. Your domain name/provider details are still pending; you need to create Render and Resend accounts. You will personally handle sign-in, account terms, billing, and entering credentials. Keep credentials in your password manager and service environment settings, not chat or GitHub files.

## 2. The specific setup this project is prepared for

| Purpose | Service / location |
|---|---|
| Domain and DNS | Your existing domain provider / DNS provider |
| Source code | Your existing GitHub PrintsNCuts repository |
| Website and API | One paid Node web service on Render |
| Database | SQLite file on that service's persistent disk |
| Product photos | Re-encoded WebP files on the same persistent disk |
| Verification, recovery, message notifications | Resend transactional emails |
| Product videos | Seller-provided HTTPS video links; YouTube/Vimeo pages open externally |
| Backups | SQLite online backups on disk, plus private copies you keep off-server |

You do **not** need to create a MongoDB, Supabase, Firebase, or PostgreSQL account for this version. The code does not connect to those services. SQLite is created automatically when the app starts.

This is a deliberately small, single-instance architecture. Render persistent disks cannot be shared across multiple instances and disk-backed deployments have brief downtime. Migrate to managed PostgreSQL plus object storage when you need multiple application instances or heavier traffic. [Render disk documentation](https://render.com/docs/disks)

## 3. Review costs before creating hosting resources

The included `render.yaml` requests a paid Starter web service and a 1 GB disk. Review current compute, disk, bandwidth, and tax charges in your own dashboard. A free web service without persistent storage is not a substitute for this configuration.

Resend offers limited free email usage; check its current limits and upgrade when appropriate. Verification emails, resets, resends, and each message notification all consume sending capacity. You do not need a paid email plan just to write or test the code locally.

Official pricing: [Render](https://render.com/pricing), [Resend](https://resend.com/pricing).

## 4. Confirm your existing domain and repository

Write down these public details:

- Your domain, e.g. `your-domain.in`.
- Where DNS is actually managed. This can differ from where you bought the domain; check the domain's nameservers.
- Your desired website address: `https://your-domain.in` or `https://www.your-domain.in`.
- A support email address someone checks.
- The existing GitHub repository URL and its default branch.

The confirmed repository is `https://github.com/Irapathak/PrintsNCuts.git`. This replacement implementation is prepared on a review branch based on the existing history. The old frontend/server layout is replaced by a single Node app at repository root.

The GitHub CLI login works when given its required OS access. You do not need to authenticate again unless it actually expires. If needed in future, run:

```sh
gh auth login --hostname github.com
```

Choose GitHub.com and the browser sign-in flow, and complete authorization yourself. Then check:

```sh
gh auth status
```

Review and merge the production-setup pull request before connecting the release branch in Render. The new app runs at repository root. Do not configure the old `frontend` or `server` subdirectory as the hosting root.

Do not upload `data/`, `.env`, `node_modules/`, private keys, backups, or real user information. `.gitignore` already excludes the relevant local paths. Before pushing run `git status --short` and review exactly which files are staged.

## 5. Create your Resend account and verify a sending domain

1. Open [Resend](https://resend.com/) and create your account. Verify the email associated with that account.
2. Open **Domains** and choose **Add Domain**.
3. Use a sending subdomain such as `auth.your-domain.in`. Replace `your-domain.in` with the domain you own. Pick an available sending region appropriate for your project.
4. Resend will show DNS records. Keep this page open.
5. Open your DNS provider in another tab and find the DNS records for your domain.
6. Add **exactly** the required records Resend displays, with the displayed record types, host names, and values. These normally include DKIM authentication and the sending/return-path records. Do not invent values from a tutorial.
7. If a DNS form automatically appends your domain, enter only the host portion it expects. Avoid accidentally creating `auth.your-domain.in.your-domain.in`.
8. Keep records DNS-only when your DNS provider offers a proxy switch for them. Do not remove your existing website records or root mailbox MX records. Using a sending subdomain keeps these changes separate.
9. Return to Resend and click **Verify**. Wait until the sending domain is verified. DNS changes may take time.
10. For authentication emails, leave click/open tracking off so reset links remain direct. Add a DMARC policy appropriate to your existing mail configuration using your provider's guidance; avoid creating competing DMARC/SPF records.

A sending domain is required to send from your own address to real customers. Resend's test domain is not a replacement for this. [Verified domains](https://resend.com/docs/dashboard/domains/introduction)

## 6. Create the sending API key

1. In Resend, open **API Keys** and choose **Create API Key**.
2. Name it `PrintsNCuts production`.
3. Select **Sending access**, restricted to your verified sending domain where available.
4. Copy the key directly into your password manager. Resend may only reveal it once.
5. Decide the sender value, for example:

```text
PrintsNCuts <accounts@auth.your-domain.in>
```

This is `MAIL_FROM`. The domain after `@` must match the domain/subdomain you verified. Sending from this address does not create a mailbox for receiving support replies. Set up your separate support inbox with your email provider.

Do not put the key in frontend code. It is used only on the backend. [Resend API key instructions](https://resend.com/docs/dashboard/api-keys/introduction)

## 7. Optional: test real emails locally first

In Terminal:

```sh
cd /Users/irapathak/Documents/ChatGPT/PrintsNCuts
npm ci
cp .env.example .env
```

Edit `.env` in your editor. Keep:

```text
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000
HOST=127.0.0.1
DATA_DIR=./data/local
TRUST_PROXY=0
```

For real email testing set `MAIL_MODE=resend`, enter your Resend key as `RESEND_API_KEY`, set `MAIL_FROM` to your verified sender, and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to your chosen local admin details. Use a unique password of at least 12 characters. Do not use a demo password on the public site.

Run:

```sh
npm run check:config
npm start
```

Visit http://localhost:3000. Register using an email inbox you control. A real code should arrive; the app should not display a development code in Resend mode. Verify it and sign in. Test Forgot password, open the received link, save a new password, and sign in again. Reset URLs point to `APP_URL`, so local links only work while the local server is running.

If the email does not arrive, check Resend's email logs, your spam folder, the sender's verified domain, key permissions, and sending quota. An API success means the provider accepted the message, not guaranteed inbox delivery.

Do not run `npm run demo` for this test. Demo mode has known accounts and sample listings. Use it only for local demonstrations.

## 8. Create the Render account and web service

1. Open [Render](https://render.com/) and create an account. Complete account and billing steps yourself.
2. Connect your GitHub account and allow access only to the PrintsNCuts repository if possible.
3. After the code update has been merged, choose **New → Web Service**.
4. Select the updated PrintsNCuts repository and its release/default branch.
5. Enter the settings below. Names can vary slightly in the dashboard.

| Setting | Value |
|---|---|
| Service name | A unique PrintsNCuts name |
| Language / runtime | Node |
| Root directory | Empty: repository root |
| Region | Singapore is the supplied starting configuration; use an available region suitable for your users |
| Build command | `npm ci` |
| Start command | `npm start` |
| Instance plan | Paid Starter or another suitable paid plan |
| Number of instances | `1` |
| Health check path | `/api/health` |

Do not choose **Static Site**: this app needs the running backend. Do not use `npm run demo` as the start command.

Alternatively, **New → Blueprint** can use the supplied `render.yaml` to provision the same setup. Review all paid resources before applying it. The manual settings and Blueprint are alternatives; do not create duplicate services. [Node deployment](https://render.com/docs/deploy-node-express-app), [Blueprint reference](https://render.com/docs/blueprint-spec).

## 9. Create the disk: this is the database setup

Before the first production start, add a persistent disk to the web service:

| Setting | Value |
|---|---|
| Disk name | `marketplace-data` |
| Mount path | `/var/data` |
| Starting size | `1 GB` |

Set `DATA_DIR=/var/data` in the service environment. On startup the code creates:

```text
/var/data/market.db          Accounts, listings, messages, sessions, moderation records
/var/data/market.db-wal     SQLite's live write-ahead log; do not manually remove it
/var/data/market.db-shm     SQLite's coordination file; do not manually remove it
/var/data/uploads/          Uploaded product images
/var/data/backups/          Consistent database backup copies
```

You do not need SQL commands, tables in a dashboard, or a database password. Tables and additive migrations run automatically. Only default machine categories are inserted. No fake machines or demo accounts are created by `npm start`.

Only files beneath the disk mount persist. The disk is available at runtime, not during the build; this project creates the database at runtime. [Persistent disks](https://render.com/docs/disks)

## 10. Enter the production environment variables

In Render's service, open **Environment** and add these values. The initial `onrender.com` URL appears during service creation/in its dashboard. Use your actual URL, not the placeholder below. If a first deploy happens before all settings exist, it will fail safely; complete the settings and redeploy.

| Key | Value |
|---|---|
| `NODE_VERSION` | `22.x` (latest patch in the tested Node 22 major) |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATA_DIR` | `/var/data` |
| `TRUST_PROXY` | `1`, only for this trusted Render proxy setup |
| `APP_URL` | `https://YOUR-ACTUAL-SERVICE.onrender.com` initially |
| `MAIL_MODE` | `resend` |
| `MAIL_FROM` | Your verified sender, e.g. `PrintsNCuts <accounts@auth.your-domain.in>` |
| `RESEND_API_KEY` | Your sending API key |
| `ADMIN_EMAIL` | Your own admin email |
| `ADMIN_PASSWORD` | A unique password, at least 12 characters, saved in your password manager |

Let Render supply its `PORT`; do not force it to 3000. `APP_URL` must have no path, hash, or query string. It controls password-reset and chat email links and browser origin checks.

Save and deploy. Production startup rejects missing email settings, an HTTP app origin, or an unspecified data directory. Startup creates the first administrator if its email does not already exist. Use an email that has not already been registered as a buyer/seller. After verifying that you can sign in as admin, remove `ADMIN_PASSWORD` from Render and redeploy. Existing admin passwords are never reset by changing that environment variable; use Forgot password instead.

Keep `RESEND_API_KEY` set. Use Render's secret/environment configuration, not a committed `.env`. [Environment variables](https://render.com/docs/configure-environment-variables)

## 11. Verify the first deployment

- The build finishes and the service reports live.
- Open `https://YOUR-ACTUAL-SERVICE.onrender.com/api/health`: expect `{"ok":true}`.
- Open the home page: expect an empty catalog, not three demo machines.
- Register a real test seller and verify its email.
- Complete its company profile and upload a real machine photo.
- Create and publish a listing with Indian location and INR pricing.
- Open another browser profile, register a buyer, verify it and contact the seller.
- Check both inboxes and the notification email. The queue checks about every 15 seconds; failures retry with backoff.
- In admin, inspect Operations for notification status and retry failed notifications only after fixing the provider problem.
- Restart or redeploy the service. Confirm both the listing/photo and conversation still exist.

Use browsers for the POST flows: the production API intentionally requires the correct Origin and JSON content type. The health-check GET remains public.

## 12. Connect the domain you already own

1. In Render's service, open **Settings → Custom Domains** and add the exact website hostname you want.
2. Render will display the DNS records required for that hostname.
3. At your DNS provider, create/update the website DNS records exactly as displayed. These are separate from Resend's email records. Record existing values before changing them; changing website DNS switches traffic away from an existing site.
4. Return to Render and verify the domain. Wait for DNS verification and the HTTPS certificate.
5. Set `APP_URL` to your final address, e.g. `https://your-domain.in`, and redeploy.
6. Use this canonical domain for all testing and customer links. After the switch, browser writes from the old `onrender.com` hostname are intentionally rejected by origin checks.
7. Request a fresh reset email after changing `APP_URL`; older reset emails still point to the old address.

Render provisions and renews TLS for verified custom domains. [Custom domain instructions](https://render.com/docs/custom-domains)

## 13. Back up and prove recovery works

The app makes an online SQLite backup at production startup and every 24 hours while running, retaining the last seven backup files. Admin → Operations can create one immediately. These are on the SAME disk, so they do not protect against losing the entire disk or account.

In Render's Shell, create a consistent copy on demand:

```sh
npm run backup
```

The command prints the generated backup path. Check it:

```sh
npm run check:backup -- /var/data/backups/REPLACE-WITH-ACTUAL-FILENAME.db
```

Set up SSH according to Render's dashboard/docs, then use its SCP instructions to download that database backup and the `/var/data/uploads` folder to private off-server storage. Use the actual service/SSH host provided by Render. Treat the copy as sensitive: it contains account and chat records. Keep it encrypted, control access, and keep at least one known-good version. Automating an off-server copy remains an operations task; it is not configured by these local changes.

A safe restore drill:

1. Create an isolated local folder such as `data/restore-test`, not the live production directory.
2. Copy a completed backup into that folder as `market.db`; copy the corresponding `uploads` folder next to it.
3. Set `NODE_ENV=development`, `MAIL_MODE=development`, `DATA_DIR=./data/restore-test`, `APP_URL=http://localhost:3001`, `PORT=3001`, `HOST=127.0.0.1` for the restored process. Unset production admin credentials to avoid provisioning another admin in the copy.
4. Start the app with those environment settings. Check the catalog, photos and conversations without sending emails to customers.
5. Verify table counts/integrity and then sign in with a test account from that backup.
6. For a real production restore, stop application writes first, preserve the damaged files, replace the DB only while the app is stopped, and ensure no stale WAL/SHM files accompany the replacement. Restore matching uploads and then restart. Do this as a planned recovery, not by copying over a live database.

Do not rely only on whole-disk snapshots for a live database. Use database-aware backups. [Render backup considerations](https://render.com/docs/disks), [Node SQLite backup](https://nodejs.org/docs/latest-v22.x/api/sqlite.html).

## 14. Account verification and recovery: what users see

**Registration:** enter name, email and password → backend stores a password hash → sends a six-digit email code → user enters it → verified status is stored. Codes expire after 10 minutes and successful verification consumes them. Resend is available with a cooldown.

**Recovery:** select Forgot password → enter email → receive a 30-minute reset link → choose a new password → the reset token is consumed and existing login sessions are invalidated. Passwords are not emailed. Unregistered email addresses receive the same public recovery response to reduce account discovery.

**Phone numbers:** the app currently stores a public company phone but does not verify it. Resend handles email, not SMS. Email verification is ready to connect; phone verification is a separate feature. If you require it before launch, create an SMS verification-provider account, set up a verification service, enable India delivery according to the provider's current onboarding requirements, and supply server-side credentials. Code must then add send/check endpoints, attempt limits, and a `phone_verified` status bound to the exact number. Do not display a phone-verified badge before that exists. [Example: Twilio Verify workflow](https://www.twilio.com/docs/verify/api).

## 15. Before inviting public users

The code is prepared for a staged pilot, not independently security-audited. Complete these product/operational decisions:

- Set a support contact and publish reviewed privacy, terms, listing rules, and a clear account/data-deletion process. These pages/workflows are not implemented in this patch.
- Decide what contact information should be public. Company email and phone currently appear on product pages.
- Protect GitHub, Render, Resend and your DNS account with MFA. Application-admin MFA is not yet implemented; add it before a broad public launch.
- Configure independent uptime/error alerts and monitor disk use, Resend failures/bounces and sending limits. Provider-accepted email is not proof of inbox delivery; bounce webhook handling is not yet implemented.
- Keep Node 22 patches and dependencies updated, with tests before upgrades. `npm audit` passing is not a security audit.
- Set limits appropriate to your sellers. Photos are limited to ten links/uploads per listing, 2 MB per uploaded source in the UI, and 25 million decoded pixels. Uploads are re-encoded to WebP and stripped of source metadata. Each account is capped at 200 uploaded photos. A byte-based quota and automated orphan-file cleanup are not implemented; support must manage unused storage.
- Catalog/conversation pagination is not implemented. The small-pilot architecture needs this before a large catalog or long-running high-volume chat.
- Test every checklist item below on staging, including a real email delivery and an off-server restore.

## 16. Release checklist and ongoing updates

- [ ] Updated code is in GitHub with tests passing.
- [ ] No secrets, demo database, backups or private keys are committed.
- [ ] Paid service has `/var/data` persistent disk and `DATA_DIR=/var/data`.
- [ ] `npm start`, not `npm run demo`, is the production start command.
- [ ] Domain has valid HTTPS and `APP_URL` matches it exactly.
- [ ] Resend domain verified and sender matches it; real users receive code/reset emails.
- [ ] Code expiry, resend, password reset, old-password rejection and session invalidation tested.
- [ ] Real seller can create/edit/draft/sell a listing with photos.
- [ ] Buyer and seller on separate devices can chat; a third account is denied access.
- [ ] Reports can be reviewed, accounts suspended/restored and hidden listings stay hidden.
- [ ] Data and photos survive a redeploy.
- [ ] Off-server database + uploads backup created and restored successfully.
- [ ] Admin MFA, policy/deletion workflows and independent monitoring are complete before broad public release.

For subsequent changes: create a branch → run `npm ci` and `npm test` → review the PR → merge → deploy to staging → run smoke checks → deploy production → confirm health and key flows. The included GitHub Action runs tests automatically. Render can be configured to deploy only after CI checks pass. Disk-backed redeploys briefly interrupt this single instance. Keep a backup before schema changes; reverting application code does not automatically reverse database migrations. [Render deploy behavior](https://render.com/docs/deploys)

## 17. Common problems

| Symptom | Check |
|---|---|
| Production startup says mail is not configured | `MAIL_MODE=resend`, sender, API key, HTTPS `APP_URL`, and `DATA_DIR` |
| Account created but verification email failed | Check Resend logs, then use Verify email → Resend code; the account remains recoverable |
| Verification code expired | Request a new code; older codes are replaced |
| Reset email absent | Check spam, sender domain, API permissions and quota; the UI intentionally gives a generic response |
| Reset link opens localhost | Fix production `APP_URL` and request a fresh reset email |
| Invalid origin on domain | Open the exact HTTPS hostname in `APP_URL`; update the variable and redeploy after a domain switch |
| Data disappears after deployment | Disk missing, wrong mount, or `DATA_DIR` outside the mount |
| Uploaded image rejected | Use a genuine JPEG/PNG/WebP; reduce size/dimensions; a filename extension alone is insufficient |
| Failed notifications | Fix delivery service, then Admin → Operations → Retry failed notifications |
| Old admin password still works after changing env | Env provisions once; use the password-reset flow to change an existing password |
| A second instance is requested | Unsupported for this SQLite/disk setup; migrate storage before scaling horizontally |
