# Portale Sapienta (Portale Formazione Aziendale)
Portale B2B per enti di formazione: area admin per gestione clienti/corsi/docenti, area cliente per anagrafiche/presenze/attestati, e area docente per lezioni/presenze/disponibilità.
- **Produzione**: https://sapienta.it
- **Repository**: GitHub Lorix04/eraclitea-portale

## Stack
- Next.js 14.2.35 (App Router) + React 18.3 + TypeScript strict
- Tailwind CSS 3.4 + shadcn/ui + lucide-react + sonner
- Prisma 5.x + PostgreSQL (IMPORTANTE: usare sempre `npx prisma@5` per evitare breaking changes di Prisma 7)
- NextAuth 4 (Credentials, sessione JWT)
- React Query 5 + Zod
- pdf-lib (generazione PDF: atto notorietà, registro presenze)
- archiver (download ZIP materiali)
- Nodemailer (SMTP), Upstash Redis rate-limit (opzionale)
- Test: Jest (unit) + Playwright (e2e)

## Architettura
- `src/app/(auth)`: login, recupero/reset password
- `src/app/(dashboard)`: area cliente autenticata
- `src/app/admin`: area admin autenticata
- `src/app/docente`: area docente autenticata
- `src/app/onboarding/docente`: completamento registrazione docente (firma documento)
- `src/app/registrazione/docente/[token]`: registrazione pubblica docente (3 step)
- `src/app/come-funziona`: pagina pubblica guida per clienti
- `src/app/api`: API route handlers (admin/client/teacher/system/cron)
- `src/components`: UI condivisa (header/sidebar/modali/banner/table)
- `src/components/admin`: componenti specifici admin
- `src/components/client`: componenti specifici client
- `src/components/teacher`: componenti specifici docente (sidebar, header, calendario, presenze, materiali)
- `src/components/ui`: componenti UI base (ActionMenu, InlineConfirm, ResponsiveTable, MobileFilterPanel, SignatureCanvas, ecc.)
- `src/components/layout`: layout condivisi (MobileSidebar, header)
- `src/lib`: auth/prisma, email, storage, encryption, rate-limit, security, utilities
- `src/hooks`: hook client (debounce, lookup dati, sync, swipe, shortcuts, fetchWithRetry)
- `prisma/`: schema, migrazioni, seed
- `public/data`: dataset statici (province-regioni.json, codici catastali)
- `storage/`: file runtime (certificati, loghi, allegati ticket, materiali, CV docenti, documenti firmati)

## Tre Portali

### Portale Admin (`/admin/*`)
Gestione completa: clienti, corsi, edizioni, lezioni, docenti, dipendenti, attestati, presenze, ticket, export, audit, SMTP, status.
- Sidebar con sezioni raggruppate: Gestione Formazione, Anagrafiche, Comunicazione, Strumenti, Sistema
- Impersonazione client e docente ("Accedi come")
- Pagina guida in-portal (`/admin/guida`) con 20 sezioni

### Portale Cliente (`/(dashboard)/*`)
Area cliente: dashboard, corsi, dipendenti, attestati, storico, notifiche, supporto (ticket), profilo, guida.
- Sidebar brandizzata con logo aziendale
- SpreadsheetEditor per compilazione anagrafiche
- Pagina guida in-portal (`/guida`) con 11 sezioni

### Portale Docente (`/docente/*`)
Area docente: dashboard con calendario, lezioni, disponibilità, documenti, profilo, notifiche, supporto (ticket).
- Sidebar con tema personalizzabile (Chiaro/Scuro/Brand/Blu/Verde)
- Calendario mensile con lezioni e indisponibilità
- Segnatura presenze con ore parziali
- Download registro presenze PDF

## Database — Modelli Principali

### Utenti e Ruoli
- `User` (ADMIN/CLIENT/TEACHER) → `clientId` opzionale, `teacherId` opzionale, `mustChangePassword`, reset token, `failedLoginAttempts`, `lockedUntil` (account lockout)
- `Client` → branding (logo), utenti, dipendenti, edizioni, ticket, categorie
- `Teacher` → ~40 campi anagrafici, status (INACTIVE/PENDING/ONBOARDING/ACTIVE/SUSPENDED), `userId`, `inviteToken`, province/region, categorie (many-to-many con Category), CV, documento identità

### Formazione
- `Course` → `CourseEdition` (per cliente), categorie e visibilità
- `CourseEdition` → lezioni, registrazioni, presenze, certificati, notifiche, materiali, `presenzaMinimaType`/`presenzaMinimaValue`
- `Lesson` → data, orario, durata, luogo, titolo, `teacherAssignments`, presenze
- `Employee` → relazione con registrazioni/presenze/certificati, codice fiscale con validazione
- `CourseRegistration` lega `Employee` a `CourseEdition`

### Docenti
- `TeacherAssignment` → collega Teacher a Lesson (many-to-many)
- `TeacherUnavailability` → date/periodi indisponibilità con motivo
- `TeacherSignedDocument` → dichiarazione atto di notorietà firmata (5 dichiarazioni checkbox, firma canvas base64, PDF generato)

### Presenze
- `Attendance` → status (PRESENT/ABSENT/ABSENT_JUSTIFIED), `hoursAttended` (Float? per ore parziali), lessonId+employeeId unique
- Calcolo basato su ore (non lezioni): utility centralizzata in `src/lib/attendance-utils.ts`
- Tre tipi presenza minima: percentage (su ore), days (su lezioni), hours (ore assolute)

### Materiali
- `EditionMaterial` → file caricati per edizione, categorie (slides/exercises/documents/regulations/templates/other), ordinamento, `uploadedByRole`, status (APPROVED/PENDING/REJECTED per workflow approvazione docente), `approvedById`/`approvedAt`/`rejectionReason`

### Comunicazione
- `Ticket`/`TicketMessage` → supporto unificato per client E docenti (`clientId` O `teacherId`)
- `Notification`/`NotificationRead` → notifiche con `readAt` per docenti
- `TeacherMessage` → (deprecato, sostituito da Ticket) messaggistica docente-admin
- `EmailLog` → log email con retry: `sensitive`, `retryable`, `retryCount`, `retryStatus`, `htmlBody`/`textBody`

### Altro
- `AuditLog` → log azioni admin (login, impersonazione, CRUD)
- `Category` → aree corsi, relazione many-to-many con Teacher e Course

## Autenticazione & Ruoli
- Login via NextAuth Credentials (`src/lib/auth.ts`), password hash `bcryptjs` (salt 12)
- JWT/session include: `id`, `role`, `clientId`, `teacherId`, `teacherStatus`, `mustChangePassword`
- **Account lockout**: 5 tentativi falliti → blocco 15 minuti
- **Password policy**: min 8 caratteri + maiuscola + numero + carattere speciale (condivisa via `PASSWORD_REGEX` in `src/lib/security.ts`)
- Ruoli: `ADMIN`, `CLIENT`, `TEACHER`

### Middleware (`src/middleware.ts`)
- Accesso route per ruolo (ADMIN→`/admin/*`, CLIENT→`/(dashboard)/*`, TEACHER→`/docente/*`)
- Route docente: `/docente/*` solo TEACHER ACTIVE, `/onboarding/docente/*` per ONBOARDING
- Route pubbliche: `/registrazione/docente/[token]`
- CSRF check su API mutate via `Origin/Referer`
- Rate limiting tiered: admin (200 req/10s), authenticated (60 req/10s), login (10 req/min), public (60 req/min)
- IP validation con `TRUSTED_PROXY_HOPS` (protezione X-Forwarded-For spoofing)
- Impersonazione admin→client e admin→teacher via cookie
- Blocco navigazione finché `mustChangePassword=true`
- Redirect post-login per ruolo: ADMIN→`/admin`, CLIENT→`/(dashboard)`, TEACHER→`/docente`

## Impersonazione
- Admin può impersonare client E docenti ("Accedi come")
- Cookie separati per impersonazione client e teacher
- Banner giallo "Stai visualizzando come [Nome]" con "Torna all'admin"
- Read-only mode durante impersonazione (API mutate bloccate)
- `getEffectiveTeacherContext()` in `src/lib/impersonate.ts` → ritorna teacherId/userId corretto durante impersonazione
- Tutte le API teacher usano `getEffectiveTeacherContext()` per supportare impersonazione

## Flusso Registrazione Docente
1. Admin crea docente con email → status INACTIVE
2. Admin clicca "Invia invito" → email con link registrazione (token 7 giorni) → status PENDING
3. Docente apre link → pagina 3 step:
   - Step 1: Dati anagrafici (residenza obbligatoria)
   - Step 2: Firma Dichiarazione Atto di Notorietà (canvas firma, 5 checkbox, PDF generato con pdf-lib)
   - Step 3: Creazione password
4. Token invalidato dopo completamento (single-use)
5. Auto-login dopo registrazione completata
6. Se documento firmato → status ACTIVE, altrimenti → ONBOARDING (redirect a `/onboarding/docente`)

## Sistema Email
- Servizio: `src/lib/email-service.ts` (sendAutoEmail)
- Classificazione: sensibili (WELCOME, PASSWORD_RESET) vs non sensibili (notifiche, reminder)
- Coda retry: `src/lib/email-queue.ts` — 1 email ogni 3 secondi, rate limited per Hostinger
- Auto-retry cron: `GET /api/cron/email-retry` (max 3 tentativi, 15 min intervallo)
- Rigenerazione credenziali per email sensibili fallite (non replay vecchio contenuto)
- UI admin: `/admin/smtp/log` con filtri, retry massivo, barra progresso, checkbox selezione

## Materiale Didattico
- Upload per edizione: admin e client caricano (status APPROVED), docente propone (status PENDING)
- Categorie: Slide, Esercitazioni, Documenti, Normativa, Modelli, Altro
- Ordinamento drag-and-drop (o frecce ↑↓)
- Anteprima inline: PDF (iframe), immagini (img tag) — modale quasi full-screen
- Download ZIP di tutti i materiali organizzati per categoria
- Notifiche automatiche al docente quando nuovo materiale caricato
- Workflow approvazione: admin approva/rifiuta materiale proposto dal docente
- Storage: `storage/materials/[editionId]/`

## Sicurezza (Audit completato)
- Account lockout (5 tentativi → 15 min)
- Content-Security-Policy header
- Timing-safe comparison per CRON API key (`src/lib/security.ts`)
- Magic bytes validation per upload file (`validateFileContent()`)
- Password forte obbligatoria anche nel reset password
- Rate limit token docente: tier "login" (10 req/min)
- IP validation con trusted proxy hops
- Transazione atomica per password reset (race condition fix)
- Email sensibili: body non salvato nei log
- `docker-compose.yml`: password PostgreSQL obbligatoria (`${POSTGRES_PASSWORD:?required}`)

## Mobile Optimization (Completata)
- **Sidebar**: hamburger menu con overlay slide-in su mobile (< 768px)
- **Header**: compatta con hamburger + titolo + notifiche + avatar
- **Tabelle**: card view su mobile via `ResponsiveTable` component
- **Form**: stack verticale, input full-width su mobile
- **Modali**: full-screen su mobile, pulsanti footer impilati (primario sopra)
- **Tab**: scroll orizzontale su mobile
- **Filtri**: pannello collassabile (`MobileFilterPanel`) — solo barra ricerca visibile di default
- **Dashboard**: stats grid 2 colonne, sezioni impilate
- **Toolbar azioni**: pulsanti compatti, secondari solo-icona su mobile

## Azioni UI (ActionMenu)
- Pattern: azione primaria visibile + menu dropdown (⋯) per secondarie
- Conferma inline per azioni distruttive (non modale)
- Shortcut tastiera quando dropdown aperto (E=modifica, D=duplica, Delete=elimina)
- Swipe actions su mobile (sinistra=elimina, destra=primaria)
- Colori per tipo: info (blu), success (verde), warning (arancione), danger (rosso)

## File Chiave

### Librerie e Utility
- `src/lib/auth.ts` — configurazione NextAuth, callbacks JWT/session, account lockout
- `src/lib/prisma.ts` — istanza PrismaClient singleton
- `src/lib/security.ts` — PASSWORD_REGEX, safeCompare, validateFileContent, maskEmail
- `src/lib/impersonate.ts` — getEffectiveTeacherContext, cookie impersonazione
- `src/lib/attendance-utils.ts` — getEffectiveHours, calculateAttendanceStats
- `src/lib/fiscal-code-utils.ts` — decodeFiscalCode, validateFiscalCodeAgainstData
- `src/lib/email-service.ts` — sendAutoEmail con logging
- `src/lib/email-queue.ts` — coda email con rate limiting
- `src/lib/email-retry-policy.ts` — classificazione email sensibili/ritentabili
- `src/lib/rate-limit.ts` — rate limiter tiered (admin/authenticated/login/public), sliding window
- `src/lib/teacher-document-pdf.ts` — generazione PDF atto di notorietà (pdf-lib)
- `src/lib/teacher-attendance-pdf.ts` — generazione PDF registro presenze (pdf-lib)
- `src/lib/teacher-cv-storage.ts` — storage CV docenti
- `src/lib/material-storage.ts` — storage materiali edizione
- `src/lib/teacher-notifications.ts` — createTeacherNotification helper
- `src/lib/api-response.ts` — normalizzazione risposte API (guard Array.isArray)

### Componenti UI Chiave
- `src/components/ui/ActionMenu.tsx` — azione primaria + dropdown + inline confirm + shortcuts
- `src/components/ui/InlineConfirm.tsx` — barra conferma inline con auto-dismiss
- `src/components/ui/ResponsiveTable.tsx` — tabella desktop + card view mobile
- `src/components/ui/MobileFilterPanel.tsx` — filtri collassabili su mobile
- `src/components/ui/ClientLogo.tsx` — logo aziendale con aspect ratio detection
- `src/components/ui/TableSkeleton.tsx` — skeleton loading per tabelle
- `src/components/ui/ErrorMessage.tsx` — messaggio errore con pulsante retry
- `src/components/SignatureCanvas.tsx` — canvas firma HTML5 (mouse + touch)
- `src/components/MaterialPreviewModal.tsx` — anteprima materiali (PDF iframe, immagini)
- `src/components/MaterialUploadModal.tsx` — upload materiale con drag & drop
- `src/components/layout/MobileSidebar.tsx` — sidebar hamburger (supporta ADMIN/CLIENT/TEACHER)

### Sidebar
- `src/components/Sidebar.tsx` — sidebar admin (sezioni raggruppate)
- `src/components/ClientSidebar.tsx` — sidebar client (con logo aziendale)
- `src/components/teacher/TeacherSidebar.tsx` — sidebar docente (tema personalizzabile)

### Hook
- `src/hooks/useSwipeActions.ts` — swipe touch per azioni mobile
- `src/hooks/useActionShortcuts.ts` — shortcut tastiera quando dropdown aperto
- `src/hooks/useFetchWithRetry.ts` — fetch con auto-retry su 429 + skeleton loading

## Deploy
- Target: VPS Hostinger con Docker Compose
- Servizi: `app` (Next.js standalone) + `db` (PostgreSQL 16)
- Volumi: `postgres_data` (DB), `app_storage` (upload/storage)
- `docker compose` (con SPAZIO, NON `docker-compose` con trattino)
- IMPORTANTE: `npx prisma@5` per migrazioni (non `npx prisma` che scarica v7)

### Flusso deploy
```bash
ssh root@srv1302407
cd /root/eraclitea-portale
git pull
docker compose up -d --build
docker compose exec app npx prisma@5 migrate deploy
docker compose logs -f app
```

### VPS Info
- Provider: Hostinger
- Hostname: srv1302407
- OS: Ubuntu 24.04.3 LTS
- Path progetto: `/root/eraclitea-portale`
- Reverse proxy: Nginx (porta 80/443) → Docker app (porta 3000)
- SSL: Let's Encrypt (`sapienta.it` + `www.sapienta.it`)

### Comandi VPS frequenti
- SSH: `ssh root@srv1302407`
- Restart app: `docker compose up -d --build`
- Restart veloce: `docker compose restart app`
- Logs: `docker compose logs -f app`
- Stato: `docker compose ps`
- Config Nginx: `nano /etc/nginx/sites-available/default`
- Rinnovo SSL: `certbot renew`

## Variabili d'Ambiente
### Core
- `DATABASE_URL` (required): connessione Postgres
- `NODE_ENV`: production/development
### Auth
- `NEXTAUTH_URL` (required in prod): URL base
- `NEXTAUTH_SECRET` (required): secret JWT
### Email
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
### Security
- `ENCRYPTION_KEY` (required): cifratura credenziali SMTP
- `CRON_API_KEY` (required): endpoint cron
- `TRUSTED_PROXY_HOPS` (default: 1): validazione IP proxy
### Storage
- `FILE_STORAGE_PATH`, `STORAGE_PATH`
### Docker
- `POSTGRES_USER`, `POSTGRES_PASSWORD` (required), `POSTGRES_DB`

## Gotchas
- `npx prisma@5` SEMPRE — `npx prisma` scarica v7 con breaking changes
- `docker compose` con SPAZIO — non `docker-compose` con trattino
- `output: 'standalone'` obbligatorio nel next.config.mjs per Docker
- Warning `version` obsoleto in docker-compose.yml: ignorare
- Impersonazione teacher: usare `getEffectiveTeacherContext()` in tutte le API teacher
- `useFetchWithRetry` hook: la funzione `transform` deve essere stabile (usa `useRef` internamente)
- Build ~5-10 minuti su VPS — è normale per la dimensione del progetto
- Migrazioni VPS: se la colonna esiste già, usare `prisma migrate resolve --applied [nome]`