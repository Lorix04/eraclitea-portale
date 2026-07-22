-- Aggiunge il tipo di notifica dedicato al caricamento di un materiale nella categoria
-- "Registro" (MATERIAL_REGISTRO_UPLOADED), così il cliente può essere avvisato SOLO per il
-- registro senza ricevere la notifica generica "Nuovo materiale" per gli altri materiali.
--
-- Migrazione additiva: aggiunge solo un valore all'enum, nessun backfill. Le notifiche
-- esistenti restano col loro tipo. Idempotente grazie a IF NOT EXISTS.
-- Nota: il nuovo valore NON viene usato in questa stessa migrazione (requisito Postgres
-- per ALTER TYPE ... ADD VALUE eseguito dentro una transazione).

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATERIAL_REGISTRO_UPLOADED';
