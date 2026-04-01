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
Gestione completa: clienti, corsi, edizioni, lezioni, docenti, dipendenti, attestati, presenze, ticket, export, audit, SMTP, status, ruoli e permessi (RBAC), integrazioni AI.

### Portale Cliente (`/(dashboard)/*`)
Area cliente: dashboard, corsi, dipendenti (con SpreadsheetEditor e campi custom), attestati, storico, notifiche, supporto (ticket), profilo.

### Portale Docente (`/docente/*`)
Area docente: dashboard con calendario, lezioni, disponibilita, documenti, profilo (con CV strutturato a 8 sezioni), notifiche, supporto (ticket).

## Funzionalita Principali

- **RBAC Admin**: 19 aree permessi, 4 template ruoli predefiniti, enforcement API + UI
- **Impersonazione**: admin puo operare come client o docente ("Accedi come")
- **Anagrafiche personalizzate**: campi custom per cliente, import/export Excel/CSV, SpreadsheetEditor dinamico
- **Presenze**: matrice presenze con ore parziali, calcolo su ore (percentage/days/hours), export PDF
- **Materiale didattico**: libreria corso + materiali edizione, upload/approvazione, anteprima, download ZIP
- **CV Docente**: 8 sezioni strutturate, import AI da PDF (OpenRouter), download CV Europass
- **Registrazione docente**: flusso 4 step con firma digitale atto di notorieta
- **Sistema email**: coda con retry, classificazione sensibili/non sensibili, log con UI admin
- **Sicurezza**: account lockout, CSP, rate limiting tiered, CSRF check, IP validation, magic bytes upload

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

## Gotchas

- `npm run build` SEMPRE — MAI `npx next build` direttamente
- `npx prisma@5` SEMPRE — `npx prisma` scarica v7 con breaking changes
- `docker compose` con SPAZIO — non `docker-compose` con trattino
- Nessun `window.confirm/alert/prompt` — usare `useConfirmDialog()`
- Employee.nome/cognome/codiceFiscale sono nullable (per custom fields mode)
- Impersonazione teacher: usare `getEffectiveTeacherContext()` in tutte le API teacher

## Test

```bash
npm test                # Unit test (Jest)
npm run test:e2e        # E2E test (Playwright)
npm run test:all        # Tutti i test
```

## License

Proprietary - All rights reserved
