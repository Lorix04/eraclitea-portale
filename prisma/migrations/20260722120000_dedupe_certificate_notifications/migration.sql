-- Migrazione di DATI (non di schema): pulizia dei doppioni di notifica "Attestati disponibili".
--
-- Contesto: all'upload attestati venivano create DUE notifiche per lo stesso evento:
--   1) una riga "orfana" (userId NULL) legata all'edizione, e
--   2) una riga per ogni utente del cliente (via notifyAssignedClientUsers).
-- Con il vecchio filtro di visibilità (courseEdition.clientId senza vincolo userId) ogni
-- utente vedeva l'orfana + tutte le righe per-utente. Il codice è stato corretto: la riga
-- orfana non viene più creata e il filtro mostra a ogni utente SOLO la propria riga.
--
-- Qui rimuoviamo le righe orfane STORICHE di CERTIFICATES_AVAILABLE che duplicano una
-- versione per-utente già esistente per la stessa edizione (così sparisce la notifica extra).
-- NON tocchiamo le righe per-utente (una per utente): sono legittime e, dopo la fix del
-- filtro, ognuno vede solo la propria.
--
-- Cancelliamo l'orfana SOLO se esiste una controparte per-utente per la stessa edizione:
-- se un attestato storico avesse solo l'orfana (nessuna per-utente), resta l'unica notifica
-- e va mantenuta. Idempotente: a un secondo run non c'è più nulla da cancellare.

DELETE FROM "Notification" AS n
WHERE n."type" = 'CERTIFICATES_AVAILABLE'
  AND n."userId" IS NULL
  AND n."courseEditionId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "Notification" m
    WHERE m."type" = 'CERTIFICATES_AVAILABLE'
      AND m."userId" IS NOT NULL
      AND m."courseEditionId" = n."courseEditionId"
  );
