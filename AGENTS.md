# Portale Sapienta (Portale Formazione Aziendale)
Portale B2B per enti di formazione: area admin per gestione clienti/corsi/docenti, area cliente per anagrafiche/presenze/attestati, e area docente per lezioni/presenze/disponibilita.
- **Produzione**: https://sapienta.it
- **Repository**: GitHub Lorix04/eraclitea-portale

## Stack
- Next.js 14.2.35 (App Router) + React 18.3 + TypeScript strict
- Tailwind CSS 3.4 + shadcn/ui + lucide-react + sonner
- Prisma 5.x + PostgreSQL (IMPORTANTE: usare sempre `npx prisma@5` per evitare breaking changes di Prisma 7)
- NextAuth 4 (Credentials, sessione JWT)
- React Query 5 + Zod
- Handsontable (SpreadsheetEditor per anagrafiche)
- pdf-lib (generazione PDF: atto notorieta, registro presenze, CV Europass)
- pdf-parse (estrazione testo da PDF per import CV)
- archiver (download ZIP materiali)
- xlsx (import/export Excel, generazione template)
- csv-stringify (export CSV con BOM UTF-8)
- pdfkit (export presenze PDF)
- Nodemailer (SMTP), Upstash Redis rate-limit (opzionale)
- Test: Jest (unit) + Playwright (e2e)

## Architettura
- `src/app/(auth)`: login, recupero/reset password
- `src/app/(dashboard)`: area cliente autenticata
- `src/app/admin`: area admin autenticata
- `src/app/docente`: area docente autenticata
- `src/app/onboarding/docente`: completamento registrazione docente (firma documento)
- `src/app/registrazione/docente/[token]`: registrazione pubblica docente (4 step)
- `src/app/registrazione/admin/[token]`: registrazione pubblica admin invitato
- `src/app/come-funziona`: pagina pubblica guida per clienti
- `src/app/api`: API route handlers (admin/client/teacher/system/cron)
- `src/components`: UI condivisa (header/sidebar/modali/banner/table)
- `src/components/admin`: componenti specifici admin
- `src/components/client`: componenti specifici client
- `src/components/teacher`: componenti specifici docente (sidebar, header, calendario, presenze, materiali)
- `src/components/teacher/cv`: componenti CV docente (CvSection, CvEntryCard, CvEntryModal, TeacherCvEditor, ImportCvModal)
- `src/components/ui`: componenti UI base (ActionMenu, ConfirmDialog, InlineConfirm, ResponsiveTable, MobileFilterPanel, SignatureCanvas, ecc.)
- `src/components/layout`: layout condivisi (MobileSidebar, header)
- `src/lib`: auth/prisma, email, storage, encryption, rate-limit, security, permissions, utilities
- `src/hooks`: hook client (debounce, lookup dati, sync, swipe, shortcuts, fetchWithRetry, usePermissions)
- `prisma/`: schema, migrazioni, seed
- `public/data`: dataset statici (province-regioni.json, codici catastali)
- `storage/`: file runtime (certificati, loghi, allegati ticket, materiali, CV docenti, documenti firmati)

## Tre Portali

### Portale Admin (`/admin/*`)
Gestione completa: clienti, corsi, edizioni, lezioni, docenti, dipendenti, attestati, presenze, ticket, export, audit, SMTP, status, ruoli e permessi, integrazioni AI.
- Sidebar fissa con sezioni raggruppate: Gestione Formazione, Anagrafiche, Comunicazione, Strumenti, Sistema
- Impersonazione client e docente ("Accedi come")
- Sistema ruoli e permessi con enforcement API e sidebar condizionale
- Pagina guida in-portal (`/admin/guida`) con 29 sezioni

### Portale Cliente (`/(dashboard)/*`)
Area cliente: dashboard, corsi, dipendenti, attestati, storico, notifiche, supporto (ticket), profilo, guida.
- Sidebar fissa brandizzata con logo aziendale
- SpreadsheetEditor per compilazione anagrafiche (con colonne custom dinamiche)
- Pagina guida in-portal (`/guida`) con 12 sezioni

### Portale Docente (`/docente/*`)
Area docente: dashboard con calendario, lezioni, disponibilita, documenti, profilo (con CV strutturato), notifiche, supporto (ticket), guida.
- Sidebar fissa con tema personalizzabile (Chiaro/Scuro/Brand/Blu/Verde)
- Calendario mensile con lezioni e indisponibilita
- Segnatura presenze con ore parziali
- Download registro presenze PDF
- CV strutturato a 8 sezioni con import AI da PDF e download Europass
- Pagina guida in-portal (`/docente/guida`) con 10 sezioni

## Database — Modelli Principali

### Utenti e Ruoli
- `User` (ADMIN/CLIENT/TEACHER) — `clientId` opzionale, `teacherId` opzionale, `mustChangePassword`, reset token, `failedLoginAttempts`, `lockedUntil`, `adminRoleId`, `adminInviteToken`/`adminInviteStatus`
- `AdminRole` — `name`, `description`, `isSystem` (Super Admin non modificabile), `isDefault`, `permissions` (JSON con mappa area->azioni)
- `Client` — branding (logo), utenti, dipendenti, edizioni, ticket, categorie, `hasCustomFields`, `customFields`
- `ClientCustomField` — campi personalizzati per cliente: name, label, type (text/number/date/select/email), required, options, sortOrder, `standardField` (mappa a colonna Employee), `columnHeader`
- `Teacher` — ~40 campi anagrafici, status (INACTIVE/PENDING/ONBOARDING/ACTIVE/SUSPENDED), `userId`, `inviteToken`, province/region, categorie (many-to-many), CV strutturato (8 relazioni)

### Formazione
- `Course` — `CourseEdition` (per cliente), categorie e visibilita, `CourseMaterial[]`
- `CourseEdition` — lezioni, registrazioni, presenze, certificati, notifiche, materiali, `presenzaMinimaType`/`presenzaMinimaValue`, `referents` (EditionReferent[])
- `CourseMaterial` — materiali a livello di corso (libreria standard), importabili nelle edizioni
- `Lesson` — data, orario, durata, luogo, titolo, `teacherAssignments`, presenze
- `Employee` — `nome?`, `cognome?`, `codiceFiscale?` (tutti nullable per custom fields), relazione con registrazioni/presenze/certificati, `customData` (JSON per campi personalizzati)
- `CourseRegistration` lega `Employee` a `CourseEdition`

### Referenti Edizione
- `EditionReferent` — lega User (admin) a CourseEdition, con `assignedAt`, `notes`
- Permessi: `view-all` (vede tutte le edizioni) vs `view-own` (vede solo le sue + senza referenti)
- Filtro "Le mie edizioni" + filtro dropdown per referente nella lista edizioni
- Dashboard personalizzata per referente (solo sue edizioni)

### Docenti
- `TeacherAssignment` — collega Teacher a Lesson (many-to-many)
- `TeacherUnavailability` — date/periodi indisponibilita con motivo
- `TeacherSignedDocument` — dichiarazione atto di notorieta firmata (5 dichiarazioni checkbox, firma canvas base64, PDF generato)

### CV Docente (8 modelli)
- `TeacherWorkExperience` — esperienze lavorative (obbligatoria in registrazione)
- `TeacherEducation` — formazione e istruzione (obbligatoria in registrazione)
- `TeacherLanguage` — competenze linguistiche con livelli A1-C2
- `TeacherCertification` — certificazioni e abilitazioni con scadenza
- `TeacherSkill` — competenze tecniche con livello (base/intermedio/avanzato/esperto)
- `TeacherTrainingCourse` — corsi di formazione frequentati
- `TeacherTeachingExperience` — esperienza come docente, `isFromPortal` per auto-generazione, `courseEditionId` per sync
- `TeacherPublication` — pubblicazioni
- API CRUD unificata: `GET/POST /api/teacher/cv/[section]`, `PUT/DELETE /api/teacher/cv/[section]/[id]`
- Import AI da PDF: `POST /api/teacher/cv/import-pdf` (usa OpenRouter da DB)
- Download CV Europass: `GET /api/teacher/cv/download-pdf`
- Sync portale: `POST /api/teacher/cv/sync-portal-experience` (auto-genera esperienze dalle lezioni)

### Presenze
- `Attendance` — status (PRESENT/ABSENT/ABSENT_JUSTIFIED), `hoursAttended` (Float? per ore parziali), lessonId+employeeId unique
- Calcolo basato su ore (non lezioni): utility centralizzata in `src/lib/attendance-utils.ts`
- Tre tipi presenza minima: percentage (su ore), days (su lezioni), hours (ore assolute)

### Materiali
- `EditionMaterial` — file caricati per edizione, categorie, ordinamento, `uploadedByRole`, status workflow, `sourceCourseMediaId` (se importato dal corso)
- `CourseMaterial` — libreria materiali a livello di corso, importabili nelle edizioni come copie indipendenti

### Comunicazione
- `Ticket`/`TicketMessage` — supporto unificato per client E docenti (`clientId` O `teacherId`)
- `Notification`/`NotificationRead` — notifiche con `readAt` per docenti
- `EmailLog` — log email con retry: `sensitive`, `retryable`, `retryCount`, `retryStatus`

### Integrazioni AI
- `AiConfig` — configurazione singleton OpenRouter: `apiKey` (crittografata), `model`, `isEnabled`
- `AiCallLog` — log chiamate AI: action, model, status, tokens, durata
- Pagina admin: `/admin/integrazioni-ai` con config, test connessione, selezione modello, log
- Nessuna variabile env necessaria — configurazione da UI admin

### Altro
- `AuditLog` — log azioni admin (login, impersonazione, CRUD)
- `Category` — aree corsi, relazione many-to-many con Teacher e Course

## Autenticazione & Ruoli
- Login via NextAuth Credentials (`src/lib/auth.ts`), password hash `bcryptjs` (salt 12)
- JWT/session include: `id`, `role`, `clientId`, `teacherId`, `teacherStatus`, `mustChangePassword`, `adminRoleId`, `adminRoleName`, `permissions`, `isSuperAdmin`
- **Account lockout**: 5 tentativi falliti → blocco 15 minuti
- **Password policy**: min 8 caratteri + maiuscola + numero + carattere speciale (condivisa via `PASSWORD_REGEX` in `src/lib/security.ts`)
- Ruoli utente: `ADMIN`, `CLIENT`, `TEACHER`

### Sistema Ruoli Admin (RBAC)
- `AdminRole` con permissions JSON: `{ "corsi": ["view","create","edit","delete"], ... }`
- 4 template predefiniti: Super Admin (isSystem, non modificabile), Segreteria, Solo Lettura, Gestione Formazione
- 19 aree permessi: dashboard, corsi, edizioni, area-corsi, clienti, dipendenti, docenti, attestati, presenze, materiali, ticket, notifiche, export, audit, smtp, status, integrazioni-ai, ruoli, guida
- Azioni per area: view, view-all, view-own, create, edit, delete, duplicate, impersonate, reset-password, invite, suspend, upload, approve, reply, close, send, export, retry, import, assign
- `src/lib/permissions.ts`: hasPermission, canAccessArea, hasViewAll, hasOnlyViewOwn, editionVisibilityFilter, checkApiPermission, requirePermission
- `src/hooks/usePermissions.ts`: hook client per check permessi
- Enforcement: ogni API admin verifica permesso specifico; sidebar nasconde voci senza permesso; pagine mostrano "Accesso non consentito"
- JWT auto-refresh: legacy token senza campi ruolo vengono aggiornati automaticamente alla prima richiesta
- Invito admin: `POST /api/admin/roles/[id]/invite-user` → email con link registrazione → pagina `/registrazione/admin/[token]`

### Middleware (`src/middleware.ts`)
- Accesso route per ruolo (ADMIN→`/admin/*`, CLIENT→`/(dashboard)/*`, TEACHER→`/docente/*`)
- Route docente: `/docente/*` solo TEACHER ACTIVE, `/onboarding/docente/*` per ONBOARDING
- Route pubbliche: `/registrazione/docente/[token]`, `/registrazione/admin/[token]`, `/api/admin-registration/*`, `/api/ai-status`
- NextAuth routes (`/api/auth/*`) escluse dal rate limiting
- CSRF check su API mutate via `Origin/Referer`
- Rate limiting tiered: admin (200 req/10s), authenticated (60 req/10s), login (10 req/min), public (60 req/min)
- IP validation con `TRUSTED_PROXY_HOPS` (protezione X-Forwarded-For spoofing)
- Impersonazione admin→client e admin→teacher via cookie
- Blocco navigazione finche `mustChangePassword=true`
- Redirect post-login per ruolo: ADMIN→`/admin`, CLIENT→`/(dashboard)`, TEACHER→`/docente`

## Impersonazione
- Admin puo impersonare client E docenti ("Accedi come")
- Cookie separati per impersonazione client e teacher
- Banner giallo "Stai visualizzando come [Nome]" con "Torna all'admin"
- L'admin impersonante puo eseguire tutte le operazioni (nessuna restrizione read-only)
- `getEffectiveTeacherContext()` in `src/lib/impersonate.ts` → ritorna teacherId/userId corretto durante impersonazione
- Tutte le API teacher usano `getEffectiveTeacherContext()` per supportare impersonazione
- Cookie di impersonazione puliti al logout

## Flusso Registrazione Docente
1. Admin crea docente con email → status INACTIVE
2. Admin clicca "Invia invito" → email con link registrazione (token 7 giorni) → status PENDING
3. Docente apre link → pagina 4 step:
   - Step 1: Dati anagrafici (residenza obbligatoria)
   - Step 2: Competenze e CV (8 sezioni, minimo 1 esperienza + 1 formazione, con import AI da PDF)
   - Step 3: Firma Dichiarazione Atto di Notorieta (canvas firma, 5 checkbox, PDF generato con pdf-lib)
   - Step 4: Creazione password
4. Token invalidato dopo completamento (single-use)
5. Auto-login dopo registrazione completata
6. Se documento firmato → status ACTIVE, altrimenti → ONBOARDING (redirect a `/onboarding/docente`)

## Anagrafiche Personalizzate (Custom Fields)
- Admin configura campi custom per cliente: `/admin/clienti/[id]` sezione "Campi Personalizzati"
- Toggle attivazione con dialog di conferma
- Tipi supportati: text, number, date, select (con opzioni), email
- Ogni campo puo mappare un campo standard Employee (`standardField`) o essere puramente custom
- Dati custom salvati in `Employee.customData` (JSON), campi standard-mapped nei campi Employee diretti
- **Import da template**: upload Excel del cliente → auto-riconoscimento colonne standard e custom → creazione campi
- **SpreadsheetEditor** (ExcelSheet.tsx): con custom fields attivi mostra solo CF + Nome + Cognome + campi custom + Altro; senza custom fields mostra tutte le 11 colonne standard
- **Import dipendenti** (2 step): step 0 scelta formato (standard/personalizzato) → step 1 upload → step 2 column mapping con auto-detect → import
  - `importMode=standard`: validazione 11 campi obbligatori classici
  - `importMode=custom`: validazione solo campi con `required=true` nella config custom (nessun campo fisso obbligatorio)
  - Preview API: `POST /api/dipendenti/import/preview` con auto-mapping headers
  - Column mapping UI: tabella con dropdown per ogni colonna, campi obbligatori evidenziati
- **Export dipendenti**: scelta formato file (Excel .xlsx / CSV .csv) + scelta formato dati:
  - "Formato standard": 21 colonne fisse del sistema
  - "Formato cliente": SOLO le colonne dei campi personalizzati configurati
  - Admin: dropdown con tutte le combinazioni; Client: export diretto con custom fields
  - BOM UTF-8 su tutti i CSV per compatibilita Excel con accenti
- **Template download**: `GET /api/custom-fields/template?clientId=` genera Excel con colonne personalizzate; `GET /api/dipendenti/import/template` genera CSV standard
- **Dettaglio dipendente**: componente `EmployeeCustomFields` mostra i campi custom con sfondo ambra
- Validazione: `src/lib/custom-fields-validation.ts`
- API: `GET/POST /api/admin/clienti/[id]/custom-fields`, `PUT/DELETE .../[fieldId]`, toggle, reorder, import-from-template
- Client API: `GET /api/custom-fields?clientId=` (supporta admin con param, client con sessione)
- `src/lib/standard-fields.ts`: STANDARD_EMPLOYEE_FIELDS con mapping per campo standard → label

## Sistema Email
- Servizio: `src/lib/email-service.ts` (sendAutoEmail)
- Classificazione: sensibili (WELCOME, PASSWORD_RESET) vs non sensibili (notifiche, reminder)
- Tipi email: TEACHER_INVITE, ADMIN_INVITE, LESSON_ASSIGNED, LESSON_REMOVED, LESSON_UPDATED, WELCOME, PASSWORD_RESET, ecc.
- Coda retry: `src/lib/email-queue.ts` — 1 email ogni 3 secondi, rate limited per Hostinger
- Auto-retry cron: `GET /api/cron/email-retry` (max 3 tentativi, 15 min intervallo)
- Rigenerazione credenziali per email sensibili fallite (non replay vecchio contenuto)
- UI admin: `/admin/smtp/log` con filtri, retry massivo, barra progresso, checkbox selezione
- Email automatiche docente: assegnazione/rimozione/modifica lezione (batch singola email per operazioni multiple)

## Materiale Didattico
- **Livello corso**: libreria standard (`CourseMaterial`), tab "Materiali" nel dettaglio corso
- **Livello edizione**: `EditionMaterial`, tab "Materiali" nel dettaglio edizione
- **Importazione**: "Importa dal corso" copia materiali come file indipendenti con `sourceCourseMediaId`
- Upload per edizione: admin e client caricano (status APPROVED), docente propone (status PENDING)
- Categorie: Slide, Esercitazioni, Documenti, Normativa, Modelli, Altro
- Ordinamento frecce su/giu
- Anteprima inline: PDF (iframe), immagini (img tag) — modale quasi full-screen
- Download ZIP di tutti i materiali organizzati per categoria
- Drag & drop upload con zona drop visiva
- Workflow approvazione: admin approva/rifiuta materiale proposto dal docente
- Storage: `storage/materials/[editionId]/` e `storage/materials/courses/[courseId]/`

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
- Unicita email: check cross-ruolo alla creazione utente (admin/client/docente)
- `docker-compose.yml`: password PostgreSQL obbligatoria (`${POSTGRES_PASSWORD:?required}`)

## Mobile Optimization (Completata)
- **Sidebar**: fissa a sinistra su desktop (`fixed inset-y-0 left-0 z-30 w-64`), hamburger overlay su mobile
- **Header**: compatta con hamburger + titolo + notifiche + avatar
- **Tabelle**: card view su mobile via `ResponsiveTable`; colonna Azioni sticky a destra su desktop (`sticky right-0 z-10 bg-white border-l`)
- **Form**: stack verticale, input full-width su mobile
- **Modali**: full-screen su mobile, pulsanti footer impilati (primario sopra)
- **Dialog conferma**: `ConfirmDialogProvider` custom (nessun `window.confirm/alert/prompt` nativo)
- **Tab**: scroll orizzontale su mobile
- **Filtri**: pannello collassabile (`MobileFilterPanel`) — solo barra ricerca visibile di default
- **Dashboard**: stats grid 2 colonne, sezioni impilate
- **Toolbar azioni**: pulsanti compatti, secondari solo-icona su mobile
- Scrollbar sottile nelle sidebar (`.side-panel` con `scrollbar-width: thin`)

## Azioni UI (ActionMenu)
- Pattern: azione primaria visibile + menu dropdown per secondarie
- Conferma: `useConfirmDialog()` hook — dialog custom con variant default/danger, supporta confirm/alert/prompt
- Provider: `ConfirmDialogProvider` in `src/app/providers.tsx`
- Shortcut tastiera quando dropdown aperto (E=modifica, D=duplica, Delete=elimina)
- Swipe actions su mobile (sinistra=elimina, destra=primaria)
- Colori per tipo: info (blu), success (verde), warning (arancione), danger (rosso)

## Design System — Colori Light Mode
- `--background`: `hsl(32 36% 97%)` — beige chiarissimo (#F9F7F4)
- `--foreground`: `hsl(222 25% 12%)` — blu scuro quasi nero
- `--card`: `hsl(0 0% 100%)` — bianco
- `--primary`: `hsl(46 88% 58%)` — oro/ambra (#EAB308), pulsanti e brand
- `--accent`: `hsl(28 88% 56%)` — arancione (#E88B1A), hover
- `--muted`: `hsl(30 24% 94%)` — grigio caldo (#F0EDE8)
- `--muted-foreground`: `hsl(215 16% 40%)` — grigio medio (#586171), testo secondario
- `--destructive`: `hsl(0 74% 52%)` — rosso (#D93025), errori/eliminazione
- `--border`: `hsl(24 16% 86%)` — grigio caldo chiaro (#DDD8D1)
- Sfondo body: gradiente radiale con tocchi azzurro/arancione su base beige
- Celle sticky tabelle: `bg-white` (normale), `bg-gray-50` (header/even/hover) — sempre opaco, mai trasparente

## File Chiave

### Librerie e Utility
- `src/lib/auth.ts` — configurazione NextAuth, callbacks JWT/session, account lockout, auto-refresh admin role per legacy token
- `src/lib/prisma.ts` — istanza PrismaClient singleton
- `src/lib/permissions.ts` — PERMISSION_AREAS, hasPermission, canAccessArea, hasViewAll, hasOnlyViewOwn, editionVisibilityFilter, checkApiPermission, requirePermission
- `src/lib/security.ts` — PASSWORD_REGEX, safeCompare, validateFileContent, maskEmail
- `src/lib/impersonate.ts` — getEffectiveTeacherContext, getEffectiveClientContext, cookie impersonazione
- `src/lib/encryption.ts` — AES-256-GCM encrypt/decrypt (per SMTP e API keys AI)
- `src/lib/attendance-utils.ts` — getEffectiveHours, calculateAttendanceStats
- `src/lib/fiscal-code-utils.ts` — decodeFiscalCode, validateFiscalCodeAgainstData
- `src/lib/email-service.ts` — sendAutoEmail con logging
- `src/lib/email-queue.ts` — coda email con rate limiting
- `src/lib/email-retry-policy.ts` — classificazione email sensibili/ritentabili
- `src/lib/rate-limit.ts` — rate limiter tiered (admin/authenticated/login/public), sliding window
- `src/lib/teacher-document-pdf.ts` — generazione PDF atto di notorieta (pdf-lib)
- `src/lib/teacher-attendance-pdf.ts` — generazione PDF registro presenze (pdf-lib)
- `src/lib/teacher-cv-pdf.ts` — generazione CV Europass PDF (pdf-lib)
- `src/lib/teacher-cv-storage.ts` — storage CV docenti
- `src/lib/material-storage.ts` — storage materiali edizione e corso
- `src/lib/teacher-notifications.ts` — createTeacherNotification helper
- `src/lib/api-response.ts` — normalizzazione risposte API (guard Array.isArray)
- `src/lib/ai-errors.ts` — parseOpenRouterError: messaggi errore italiani per OpenRouter
- `src/lib/custom-fields-validation.ts` — validazione dati campi personalizzati
- `src/lib/standard-fields.ts` — STANDARD_EMPLOYEE_FIELDS, mapping campo standard → label
- `src/lib/cv-schemas.ts` — schemi Zod per validazione sezioni CV
- `src/lib/logout.ts` — handleLogout con pulizia cookie impersonazione

### Componenti UI Chiave
- `src/components/ui/ActionMenu.tsx` — azione primaria + dropdown + inline confirm + shortcuts
- `src/components/ui/ConfirmDialog.tsx` — dialog custom confirm/alert/prompt (sostituisce nativi browser)
- `src/components/ui/InlineConfirm.tsx` — barra conferma inline con auto-dismiss
- `src/components/ui/ResponsiveTable.tsx` — tabella desktop (con colonna Azioni sticky) + card view mobile
- `src/components/ui/MobileFilterPanel.tsx` — filtri collassabili su mobile
- `src/components/ui/ClientLogo.tsx` — logo aziendale con aspect ratio detection
- `src/components/ui/TableSkeleton.tsx` — skeleton loading per tabelle
- `src/components/ui/ErrorMessage.tsx` — messaggio errore con pulsante retry
- `src/components/SignatureCanvas.tsx` — canvas firma HTML5 (mouse + touch)
- `src/components/MaterialPreviewModal.tsx` — anteprima materiali (PDF iframe, immagini)
- `src/components/MaterialUploadModal.tsx` — upload materiale con drag & drop
- `src/components/ImportEmployeesModal.tsx` — import dipendenti 2 step con scelta formato + column mapping
- `src/components/EmployeeCustomFields.tsx` — visualizzazione campi custom nel dettaglio dipendente
- `src/components/layout/MobileSidebar.tsx` — sidebar hamburger (supporta ADMIN/CLIENT/TEACHER)
- `src/components/ExcelSheet.tsx` — SpreadsheetEditor Handsontable con colonne custom dinamiche
- `src/components/NotificationBell.tsx` — campanella notifiche (admin/client/teacher con endpoint differenziati)
- `src/components/GuidePageClient.tsx` — componente guida condiviso (CLIENT/ADMIN/TEACHER)

### Sidebar
- `src/components/Sidebar.tsx` — sidebar admin (sezioni raggruppate, permessi condizionali)
- `src/components/ClientSidebar.tsx` — sidebar client (con logo aziendale)
- `src/components/teacher/TeacherSidebar.tsx` — sidebar docente (tema personalizzabile)
- Tutte e 3: `fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto` + `md:ml-64` sul contenuto

### Componenti Admin
- `src/components/admin/RoleModal.tsx` — creazione/modifica ruolo con editor permessi
- `src/components/admin/AssignRoleModal.tsx` — assegnazione utenti a ruolo
- `src/components/admin/InviteAdminModal.tsx` — invito nuovo admin con ruolo
- `src/components/admin/EditionReferentsSection.tsx` — gestione referenti edizione
- `src/components/admin/AddReferentModal.tsx` — aggiunta referente
- `src/components/admin/CourseMaterialsTab.tsx` — tab materiali corso
- `src/components/admin/ImportCourseMaterialsModal.tsx` — importa materiali corso in edizione
- `src/components/admin/TeacherCvTab.tsx` — vista CV docente readonly per admin
- `src/components/admin/ClientCustomFieldsConfig.tsx` — configurazione campi personalizzati cliente (con import da template)
- `src/components/admin/CustomFieldModal.tsx` — modale creazione/modifica campo custom (standard o personalizzato)

### Hook
- `src/hooks/usePermissions.ts` — can(area, action), canAccess(area), isSuperAdmin, roleName
- `src/hooks/useEmployee.ts` — fetch dettaglio dipendente con customData
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
- `ENCRYPTION_KEY` (required): cifratura credenziali SMTP e API keys AI
- `CRON_API_KEY` (required): endpoint cron
- `TRUSTED_PROXY_HOPS` (default: 1): validazione IP proxy
### Storage
- `FILE_STORAGE_PATH`, `STORAGE_PATH`
### Docker
- `POSTGRES_USER`, `POSTGRES_PASSWORD` (required), `POSTGRES_DB`
### AI (opzionale)
- Nessuna variabile env — la configurazione OpenRouter e salvata nel DB (tabella AiConfig, crittografata) e gestita dalla pagina admin `/admin/integrazioni-ai`

## Gotchas
- `npm run build` SEMPRE — MAI usare `npx next build` direttamente. Lo script build include `prisma generate` che e obbligatorio prima della compilazione. Saltarlo causa errori di tipo Prisma
- `npx prisma@5` SEMPRE — `npx prisma` scarica v7 con breaking changes
- `docker compose` con SPAZIO — non `docker-compose` con trattino
- `output: 'standalone'` obbligatorio nel next.config.mjs per Docker
- Warning `version` obsoleto in docker-compose.yml: ignorare
- Impersonazione teacher: usare `getEffectiveTeacherContext()` in tutte le API teacher
- `useFetchWithRetry` hook: la funzione `transform` deve essere stabile (usa `useRef` internamente)
- Build ~5-10 minuti su VPS — e normale per la dimensione del progetto
- Migrazioni VPS: se la colonna esiste gia, usare `prisma migrate resolve --applied [nome]`
- Sidebar fisse: tutte e 3 usano `fixed inset-y-0 left-0 z-30 w-64` — il contenuto ha `md:ml-64`
- Nessun `window.confirm/alert/prompt` — usare `useConfirmDialog()` da `src/components/ui/ConfirmDialog.tsx`
- Permessi admin: se `isSuperAdmin=true` → accesso completo; se `permissions` vuoto e `isSuperAdmin=false` → accesso negato
- JWT admin role auto-refresh: token legacy senza campi ruolo vengono aggiornati al primo request (query DB una tantum)
- API `/api/auth/*` escluse dal rate limiting (chiamate interne NextAuth)
- Colonne custom anagrafiche: prefisso `custom_` nel SpreadsheetEditor, campi standard-mapped usano la chiave Employee diretta
- Employee.nome/cognome/codiceFiscale sono nullable (per custom fields mode che non li richiede)
- Export CSV: BOM UTF-8 (`\uFEFF`) preposto a tutti i file CSV per compatibilita Excel con accenti italiani
- Export dipendenti: supporta xlsx e csv, formato standard (21 colonne fisse) o formato cliente (solo colonne custom)
- Import dipendenti con custom fields: `importMode=custom` nel FormData attiva validazione solo sui campi custom required
- ResponsiveTable: colonna Azioni sticky right con `min-w-[130px]`, sfondo opaco (`bg-white`/`bg-gray-50`), bordo `border-l border-gray-200`; tabella con `minWidth` dinamico = `colonne * 120px`
