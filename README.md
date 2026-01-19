# Portale Formazione

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Table + AG Grid + React Query + RHF + Zod + NextAuth v5 + Prisma/PostgreSQL + S3/MinIO + Nodemailer.

## Setup rapido

1. Copia .env.example in .env e aggiorna i valori se necessario.
2. Avvia i servizi: `docker compose up -d`
3. Installa dipendenze: `npm install`
4. Genera Prisma client: `npm run prisma:generate`
5. Esegui migrazioni: `npm run prisma:migrate -- --name init`
6. Seed dati: `npm run seed`
7. Avvia app: `npm run dev`

Mailhog UI: http://localhost:8025  •  MinIO console: http://localhost:9001

Credenziali di test: admin1@example.com / password123

## Note
- Middleware protegge l’area dashboard e filtra ADMIN vs CLIENT.
- Gli endpoint API sono da completare secondo la specifica.
- Lo SpreadsheetEditor supporta 500+ righe; su mobile implementare vista alternativa a schede.