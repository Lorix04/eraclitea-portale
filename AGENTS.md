# Portale Sapienta (Portale Clienti Ente Formazione)
Portale B2B per enti di formazione: area admin per gestione clienti/corsi e area cliente per anagrafiche, presenze, attestati e ticket di supporto.
- **Produzione**: https://sapienta.it
## Stack
- Next.js 14.2.5 (App Router) + React 18.3 + TypeScript strict
- Tailwind CSS 3.4 + lucide-react + sonner
- Prisma 5.x + PostgreSQL
- NextAuth 4 (Credentials, sessione JWT)
- React Query 5 + Zod
- Nodemailer (SMTP), Sentry (opzionale), Upstash Redis rate-limit (opzionale)
- Test: Jest (unit) + Playwright (e2e)
## Architettura
- `src/app/(auth)`: login, recupero/reset password
- `src/app/(dashboard)`: area cliente autenticata
- `src/app/admin`: area admin autenticata
- `src/app/api`: API route handlers (admin/client/system)
- `src/components`: UI condivisa (header/sidebar/modali/banner/table)
- `src/lib`: auth/prisma, email, storage, encryption, rate-limit
- `src/hooks`: hook client (debounce, lookup dati, sync)
- `prisma/`: schema, migrazioni, seed
- `public/data`: dataset statici usati da autocomplete/import
- `storage/`: file runtime (certificati, loghi, allegati ticket)
- `scripts/`: pre/post deploy e utilità operative
## Comandi
- Dev: `npm run dev`
- Build prod: `npm run build`
- Start prod: `npm run start`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Unit test: `npm run test`
- E2E test: `npm run test:e2e`
- Prisma migrate dev: `npm run db:migrate`
- Prisma migrate prod: `npm run db:migrate:prod`
- Seed: `npm run db:seed`
- Studio: `npm run db:studio`
- Docker up: `docker-compose up -d --build`
- Docker logs app: `docker-compose logs -f app`
- Docker migrate prod: `docker-compose exec app npx prisma migrate deploy`
## Database
- `User` (ADMIN/CLIENT) -> opzionale `clientId`, `mustChangePassword`, reset token
- `Client` -> branding, utenti, dipendenti, edizioni, registrazioni, certificati
- `Course` -> `CourseEdition` (per cliente), categorie e visibilità
- `CourseEdition` -> lezioni, registrazioni, presenze, certificati, notifiche
- `Employee` -> relazione con registrazioni/presenze/certificati
- `CourseRegistration` lega `Employee` a `CourseEdition` (univoca per edizione+dipendente)
- `Ticket`/`TicketMessage` per supporto; `Notification`/`NotificationRead`; `AuditLog`
- Migrazioni in `prisma/migrations` (storia completa versionata)
## Autenticazione & Ruoli
- Login via NextAuth Credentials (`src/lib/auth.ts`), password hash `bcryptjs`
- JWT/session include: `id`, `role`, `clientId`, `mustChangePassword`
- Middleware (`src/middleware.ts`) gestisce:
  - accesso route per ruolo
  - redirect auth routes (`/login`, `/recupera-password`, `/reset-password/*`)
  - CSRF check su API mutate via `Origin/Referer` (escluso `/api/auth/*`)
  - rate limit API
  - impersonazione admin->cliente via cookie
  - blocco navigazione finché `mustChangePassword=true`
- Ruoli applicativi: `ADMIN`, `CLIENT`
## Deploy
- Target corrente: VPS con Docker (compose)
- Servizi: `app` (Next standalone) + `db` (Postgres 16)
- Volumi: `postgres_data` (DB), `app_storage` (upload)
- Flusso consigliato:
  1. impostare `.env` produzione
  2. `docker-compose up -d --build`
  3. `docker-compose exec app npx prisma migrate deploy`
  4. (opzionale) `docker-compose exec app npm run db:seed`
  5. verifica `GET /api/health`
- Script utili: `scripts/pre-deploy.sh`, `scripts/post-deploy.sh`
### VPS Info
- Provider: Hostinger
- Hostname: srv1302407
- OS: Ubuntu 24.04.3 LTS
- Path progetto: `/root/eraclitea-portale`
- Reverse proxy: Nginx (sistema, porta 80/443) -> Docker app (porta 3000)
- SSL: Let's Encrypt (`sapienta.it` + `www.sapienta.it`) - rinnovo: `certbot renew`
- Process manager: Docker (`docker-compose`)
### Comandi VPS frequenti
- SSH: `ssh root@srv1302407`
- Vai al progetto: `cd /root/eraclitea-portale`
- Restart app: `docker-compose up -d --build`
- Restart veloce (no rebuild): `docker-compose restart app`
- Logs app: `docker-compose logs -f app`
- Logs DB: `docker-compose logs -f db`
- Stato servizi: `docker-compose ps`
- Config Nginx: `nano /etc/nginx/sites-available/default` (o `sites-enabled/`)
- Test Nginx: `nginx -t && systemctl reload nginx`
- Rinnovo SSL: `certbot renew`
- Spazio disco: `df -h`
## Code Style
- Alias import: `@/*` -> `src/*`
- Componenti con hook browser devono avere `'use client'`
- API route: validazione input con Zod dove previsto, risposta JSON coerente
- Per cambi label UI evitare rinomina campi DB/API senza necessità
## Gotchas
- `next.config.mjs` ha workaround webpack per `app/(dashboard)/page_client-reference-manifest.js`; non rimuoverlo senza validare build.
- `output: 'standalone'` è obbligatorio per Docker runner (`server.js`).
- Impersonazione: admin con cookie attivi trattato come client; API mutate bloccate in read-only tranne stop/status.
- `mustChangePassword=true` forza redirect a `/profilo/cambia-password` e blocca API non consentite.
- Coesistono route admin `area-corsi` e `categorie`: verificare prima di cambiare sidebar/routing.
- Seed demo crea utenti test; non usare in ambienti condivisi senza override credenziali.
## Variabili d'Ambiente
### Core
- `DATABASE_URL` (required): connessione Postgres Prisma
- `NODE_ENV`: comportamento runtime
### Auth
- `NEXTAUTH_URL` (required in prod): URL base assoluta
- `NEXTAUTH_SECRET` (required): secret JWT/session
### Email / SMTP
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Usate da invio notifiche e import account SMTP da env
### Security / Crypto
- `ENCRYPTION_KEY` (required): cifratura credenziali SMTP in DB
- `CRON_API_KEY` (required): endpoint cron protetti
### Storage
- `FILE_STORAGE_PATH` (raccomandata)
- `STORAGE_PATH` (fallback in alcuni moduli ticket)
### Rate limiting (opzionale ma consigliato in prod multi-instance)
- `UPSTASH_REDIS_URL`
- `UPSTASH_REDIS_TOKEN`
### Monitoring (opzionale)
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
### Docker compose helper vars
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
## Seed / Demo
- Admin demo: `admin@enteformazione.it / admin123`
- Cliente demo: `mario@acme.it / cliente123`
- Seed command: `npm run db:seed`
