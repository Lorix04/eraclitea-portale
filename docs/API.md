# API Reference

## Authentication

Tutte le API richiedono autenticazione via session cookie (NextAuth).

## Endpoints

### Corsi

| Method | Endpoint | Descrizione | Ruolo |
|--------|----------|-------------|-------|
| GET | /api/corsi | Lista corsi (admin) | ADMIN |
| GET | /api/corsi/cliente | Lista corsi (cliente) | CLIENT |
| POST | /api/corsi | Crea corso | ADMIN |
| GET | /api/corsi/:id | Dettaglio corso | ALL |
| PUT | /api/corsi/:id | Modifica corso | ADMIN |
| POST | /api/corsi/:id/pubblica | Pubblica corso | ADMIN |
| POST | /api/corsi/:id/invia-anagrafiche | Invia anagrafiche | CLIENT |

### Anagrafiche

| Method | Endpoint | Descrizione | Ruolo |
|--------|----------|-------------|-------|
| GET | /api/anagrafiche?courseId=X | Lista dipendenti iscritti | ALL |
| POST | /api/anagrafiche | Salva anagrafiche | CLIENT |

### Attestati

| Method | Endpoint | Descrizione | Ruolo |
|--------|----------|-------------|-------|
| GET | /api/attestati/cliente | Lista attestati cliente | CLIENT |
| POST | /api/attestati/upload | Upload attestati | ADMIN |
| GET | /api/attestati/:id/download | Download PDF | ALL |
| POST | /api/attestati/download-zip | Download multiplo | CLIENT |

### Export

| Method | Endpoint | Descrizione | Ruolo |
|--------|----------|-------------|-------|
| GET | /api/export/csv | Export anagrafiche CSV | ADMIN |

### Notifiche

| Method | Endpoint | Descrizione | Ruolo |
|--------|----------|-------------|-------|
| GET | /api/notifiche | Lista notifiche | ALL |
| GET | /api/notifiche/count | Conteggio non lette | ALL |
| POST | /api/notifiche/:id/read | Segna come letta | ALL |
| POST | /api/notifiche/read-all | Segna tutte lette | ALL |

## Error Responses

```json
{
  "error": "Error message",
  "errors": [
    { "path": ["field"], "message": "Validation error" }
  ]
}
```

## Rate Limits

- API generiche: 100 req/minuto
- Login: 5 tentativi/minuto
