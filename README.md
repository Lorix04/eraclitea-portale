# Portale Formazione

Portale web per la gestione della formazione aziendale.

## Funzionalita

- **Admin (Ente Formazione)**
  - Gestione corsi (CRUD con stati)
  - Gestione clienti
  - Upload attestati PDF
  - Export anagrafiche CSV
  - Dashboard statistiche
  - Audit log

- **Cliente (Azienda)**
  - Visualizzazione corsi disponibili
  - Inserimento anagrafiche dipendenti (foglio Excel web)
  - Download attestati
  - Storico formazione

## Setup Sviluppo

### Prerequisiti
- Node.js 20+
- PostgreSQL 15+
- npm o yarn

### Installazione

```bash
# Clone repository
git clone https://github.com/tuo-repo/portale-formazione.git
cd portale-formazione

# Installa dipendenze
npm install

# Configura environment
cp .env.example .env
# Modifica .env con le tue configurazioni

# Setup database
npx prisma migrate dev
npx prisma db seed

# Avvia development server
npm run dev
```

### Credenziali Demo
- Admin: admin@enteformazione.it / admin123
- Cliente: mario@acme.it / cliente123

## Deploy

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker-compose up -d
```

## API Documentation

Vedi [API.md](./docs/API.md) per la documentazione completa delle API.

## License

Proprietary - All rights reserved
