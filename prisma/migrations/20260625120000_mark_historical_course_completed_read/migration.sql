-- Migrazione di DATI (non di schema): marca come GIÀ LETTE, lato client, le notifiche
-- COURSE_COMPLETED STORICHE.
--
-- Contesto: COURSE_COMPLETED è stato aggiunto all'allow-list delle notifiche client, il che
-- rende visibili le COURSE_COMPLETED create a ogni chiusura passata (20+ edizioni). Senza
-- questo intervento il contatore "non letti" dei clienti esploderebbe al deploy.
--
-- Lo stato "letto" del client NON è Notification."readAt" ma l'esistenza di una riga
-- NotificationRead con chiave [notificationId, clientId] (l'unread del client = reads NONE
-- per il suo clientId; isRead = reads.length > 0). Quindi marchiamo "letto" inserendo una
-- NotificationRead per ogni (notifica COURSE_COMPLETED storica, clientId dell'edizione).
--
-- Solo COURSE_COMPLETED: EDITION_CANCELLED e ogni altro tipo NON vengono toccati.
-- Non viene modificato alcun contenuto: solo lo stato letto/non letto (via NotificationRead).
--
-- Gira UNA volta in produzione (prisma migrate deploy). Idempotente: ON CONFLICT sul vincolo
-- unique [notificationId, clientId] non reinserisce nulla a un secondo run. I nuovi
-- completamenti (post-deploy) nascono dopo e restano NON letti (nessuna NotificationRead).
--
-- Ogni COURSE_COMPLETED storica ha sempre un courseEditionId verso un'edizione esistente:
-- quando un'edizione viene eliminata, le sue notifiche vengono cancellate (deleteMany per
-- courseEditionId), quindi il JOIN su CourseEdition copre tutte le righe superstiti.

INSERT INTO "NotificationRead" ("id", "notificationId", "clientId", "readAt")
SELECT
  gen_random_uuid()::text,
  n."id",
  ce."clientId",
  NOW()
FROM "Notification" n
JOIN "CourseEdition" ce ON ce."id" = n."courseEditionId"
WHERE n."type" = 'COURSE_COMPLETED'
ON CONFLICT ("notificationId", "clientId") DO NOTHING;
