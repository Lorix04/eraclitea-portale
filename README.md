# Portale Sapienta

Portale B2B per enti di formazione: area admin per gestione clienti/corsi/docenti, area cliente per anagrafiche/presenze/attestati, e area docente per lezioni/presenze/disponibilita.

- **Produzione**: https://sapienta.it
- **Repository**: GitHub Lorix04/eraclitea-portale

## Stack

- Next.js 14.2 (App Router) + React 18 + TypeScript strict
- Tailwind CSS 3.4 + shadcn/ui + lucide-react + sonner
- Prisma 5.x + PostgreSQL 16
- NextAuth 4 (Credentials, sessione JWT)
- React Query 5 + Zod
- Handsontable (SpreadsheetEditor per anagrafiche)
- pdf-lib / pdfkit (generazione PDF: atto notorieta, registro presenze, CV Europass)
- xlsx (import/export Excel) + csv-stringify (export CSV)
- Nodemailer (SMTP) + Upstash Redis rate-limit

## Tre Portali

### Portale Admin (`/admin/*`)
Gestione completa: clienti, corsi, edizioni, lezioni, docenti, dipendenti, attestati, presenze, ticket, export, audit, SMTP, status, ruoli e permessi (RBAC), integrazioni AI, server monitor, amministratori.
- Template campi personalizzati multi-set per client (editor con drag & drop, upload file, duplica)
- Preferenze notifiche admin (11 tipi admin-specifici)
- Policy notifiche per edizione (REFERENT_ONLY / REFERENT_PLUS / ALL)
- Riepilogo giornaliero email (panoramica operativa ore 7:00)
- Azioni su amministratori client (impersona, reset password, trasferisci proprieta)
- Esporta anagrafiche filtrate per edizione con colonne dal template
- Rifiuto anagrafiche con motivo e notifica al client

### Portale Cliente (`/(dashboard)/*`)
Area cliente: dashboard, corsi, dipendenti (con SpreadsheetEditor e template personalizzati), attestati, storico, notifiche, supporto (ticket), profilo, amministratori.
- Preferenze notifiche (toggle in-app/email per 28+ tipi)
- Gestione amministratori (inviti, revoca, reinvio, trasferimento proprieta)
- Esporta anagrafiche per edizione
- Riepilogo settimanale email (lunedi 8:00)

### Portale Docente (`/docente/*`)
Area docente: dashboard con calendario, lezioni, disponibilita, documenti, profilo (con CV strutturato a 8 sezioni), CV DPR 445, notifiche, supporto (ticket).
- Preferenze notifiche (9 tipi docente configurabili)
- 5 temi personalizzabili sidebar (Chiaro, Scuro, Brand, Blu, Verde)

## Funzionalita Principali

- **RBAC Admin**: 19 aree permessi, 4 template ruoli predefiniti, enforcement API + UI
- **Impersonazione**: admin puo operare come client o docente ("Accedi come")
- **Template anagrafiche multi-set**: ogni client puo avere multipli template di campi personalizzati (standard + custom in ordine misto). Ogni edizione punta a un template specifico. Editor con drag & drop, upload CSV/Excel per auto-rilevamento colonne, duplica template, anteprima colonne
- **Sistema notifiche completo**: 42+ tipi di notifica (in-app + email) per Client, Admin e Docente. Preferenze per utente con toggle separati in-app/email. Notifiche sicurezza non disattivabili
- **Policy notifiche per edizione**: REFERENT_ONLY / REFERENT_PLUS / ALL — controlla chi riceve le notifiche relative a un'edizione. Default configurabile a livello client
- **Multi-utente client**: piu amministratori per client con invito via email, password temporanea auto-generata, mustChangePassword, trasferimento proprieta, reset password
- **Presenze**: matrice presenze con ore parziali, calcolo su ore (percentage/days/hours), export PDF
- **Materiale didattico**: libreria corso + materiali edizione, upload/approvazione, anteprima, download ZIP
- **CV Docente**: 8 sezioni strutturate, import AI da PDF (OpenRouter), download CV Europass
- **CV DPR 445/2000**: richiesta singola/massiva, form digitale, upload PDF, workflow approvazione, reminder automatici
- **Registrazione docente**: flusso 4 step con firma digitale atto di notorieta
- **Password requirements**: checklist real-time (8+ char, maiuscola, numero, speciale), barra forza, indicatore corrispondenza. Integrato in cambio password, primo accesso, reset
- **Sistema email**: coda con retry, 42+ template notifica, classificazione sensibili/non sensibili, log con UI admin, preferenze per utente, cron giornaliero e settimanale
- **Riepilogo automatici**: email giornaliera admin (7:00) con panoramica operativa + email settimanale client (lunedi 8:00) con corsi, deadline, attestati
- **Sicurezza**: account lockout, CSP, rate limiting tiered, CSRF check, IP validation, magic bytes upload, password requirements real-time, mustChangePassword al primo accesso, notifiche account bloccato

## Setup Sviluppo

### Prerequisiti
- Node.js 20+
- PostgreSQL 16+
- npm

### Installazione

```bash
# Clone repository
git clone https://github.com/Lorix04/eraclitea-portale.git
cd eraclitea-portale

# Installa dipendenze
npm install

# Configura environment
cp .env.example .env
# Modifica .env con le tue configurazioni

# Setup database (IMPORTANTE: usare sempre prisma@5)
npx prisma@5 migrate dev
npx prisma@5 db seed

# Avvia development server
npm run dev
```

### Variabili d'Ambiente Principali
- `DATABASE_URL` — connessione PostgreSQL
- `NEXTAUTH_URL` + `NEXTAUTH_SECRET` — autenticazione
- `ENCRYPTION_KEY` — cifratura credenziali SMTP e API keys AI
- `CRON_API_KEY` — endpoint cron
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — email

## Build & Deploy

### Build
```bash
# SEMPRE usare npm run build (include prisma generate)
npm run build
```

> **IMPORTANTE**: MAI usare `npx next build` direttamente. Lo script build include `prisma generate` che e obbligatorio prima della compilazione.

### Deploy Docker (VPS Hostinger)
```bash
ssh root@srv1302407
cd /root/eraclitea-portale
git pull
docker compose up -d --build
docker compose exec app npx prisma@5 migrate deploy
docker compose logs -f app
```

> **IMPORTANTE**: `docker compose` con SPAZIO, MAI `docker-compose` con trattino.

### Comandi Utili
```bash
docker compose ps              # Stato servizi
docker compose restart app     # Restart veloce
docker compose logs -f app     # Logs
```

## Cron Jobs

- `email-retry` — retry email fallite (ogni 5 minuti, max 3 tentativi)
- `weekly-summary` — riepilogo settimanale client (lunedi 8:00)
- `admin-daily-summary` — riepilogo giornaliero admin (7:00)
- `cv-dpr445-reminder` — reminder docenti con CV in scadenza (giornaliero)
- `integrity-check` — rileva e corregge inconsistenze docenti (giornaliero)

Tutti protetti con `CRON_API_KEY` e timing-safe comparison.

## Gotchas

- `npm run build` SEMPRE — MAI `npx next build` direttamente
- `npx prisma@5` SEMPRE — `npx prisma` scarica v7 con breaking changes
- `docker compose` con SPAZIO — non `docker-compose` con trattino
- Nessun `window.confirm/alert/prompt` — usare `useConfirmDialog()`
- Employee.nome/cognome/codiceFiscale sono nullable (per custom fields mode)
- Impersonazione teacher: usare `getEffectiveTeacherContext()` in tutte le API teacher
- Impersonazione client: usare `getEffectiveClientContext()` in tutte le API client
- Notifiche edizione: usare `notifyEditionUsers()` (rispetta la policy) non `notifyAllClientUsers()`
- Template custom fields: usare `getCustomFieldsForEdition()` non query diretta `ClientCustomField`
- `ClientCustomField.customFieldSetId` e obbligatorio — campi orfani non permessi

## Test

```bash
npm test                # Unit test (Jest)
npm run test:e2e        # E2E test (Playwright)
npm run test:all        # Tutti i test
```

## License

Proprietary - All rights reserved
