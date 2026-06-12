/**
 * Backfill di CourseRegistration.customData a partire da Employee.customData.
 *
 * Strategia "replica filtrata per field-set": il profilo dipendente
 * (Employee.customData) è un blob unico condiviso fra tutte le edizioni; lo
 * copiamo su ciascuna registration filtrando SOLO le chiavi che corrispondono
 * ai campi puramente custom (cf.name, escluso standardField) del field-set
 * RISOLTO per quella edizione.
 *
 * SICUREZZA / IDEMPOTENZA (logica invariata):
 * - non sovrascrive una registration che ha già customData valorizzato (skip);
 * - dipendenti con customData ma senza registration → invariati (resta profilo);
 * - nessuna chiave estranea al field-set dell'edizione viene iniettata.
 *
 * ESECUZIONE (NESSUN ts-node richiesto): è uno script Node ESM puro che usa
 * solo @prisma/client (dependency di produzione, generata da `prisma generate`).
 * Lanciarlo MANUALMENTE dopo `prisma migrate deploy`, da un checkout del repo
 * con le dipendenze installate e il client generato:
 *
 *   npm ci                 # installa @prisma/client (+ postinstall: prisma generate)
 *   npx prisma@5 generate  # se non già generato
 *   DATABASE_URL="postgres://..." node scripts/backfill-registration-customdata.mjs
 *
 * In alternativa via npm script: `npm run backfill:registration-customdata`.
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isNonEmptyObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

/**
 * Porting fedele di getCustomFieldsForEdition (src/lib/custom-field-resolver.ts):
 * priorità edition.customFieldSetId → set default del client → legacy.
 * Ritorna l'insieme dei nomi dei campi PURAMENTE custom (escluso standardField).
 */
async function customKeysForEdition(editionId, cache) {
  const cached = cache.get(editionId);
  if (cached) return cached;

  const edition = await prisma.courseEdition.findUnique({
    where: { id: editionId },
    select: {
      clientId: true,
      customFieldSetId: true,
      customFieldSet: {
        select: {
          isActive: true,
          fields: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { name: true, standardField: true },
          },
        },
      },
    },
  });

  let fields = [];
  if (!edition) {
    fields = [];
  } else if (edition.customFieldSetId && edition.customFieldSet?.isActive) {
    fields = edition.customFieldSet.fields;
  } else {
    const defaultSet = await prisma.customFieldSet.findFirst({
      where: { clientId: edition.clientId, isDefault: true, isActive: true },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { name: true, standardField: true },
        },
      },
    });
    if (defaultSet && defaultSet.fields.length > 0) {
      fields = defaultSet.fields;
    } else {
      const client = await prisma.client.findUnique({
        where: { id: edition.clientId },
        select: { hasCustomFields: true },
      });
      if (client?.hasCustomFields) {
        fields = await prisma.clientCustomField.findMany({
          where: { clientId: edition.clientId, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { name: true, standardField: true },
        });
      }
    }
  }

  const keys = new Set(
    fields.filter((f) => !f.standardField).map((f) => f.name)
  );
  cache.set(editionId, keys);
  return keys;
}

async function main() {
  const editionCustomKeys = new Map();

  const employees = await prisma.employee.findMany({
    where: { customData: { not: Prisma.JsonNull } },
    select: { id: true, customData: true },
  });

  let employeesProcessed = 0;
  let registrationsPopulated = 0;
  let registrationsSkipped = 0;

  for (const employee of employees) {
    if (!isNonEmptyObject(employee.customData)) continue;
    const profile = employee.customData;
    employeesProcessed += 1;

    const registrations = await prisma.courseRegistration.findMany({
      where: { employeeId: employee.id },
      select: { id: true, courseEditionId: true, customData: true },
    });

    for (const reg of registrations) {
      // Idempotenza: non toccare registration già valorizzate.
      if (isNonEmptyObject(reg.customData)) {
        registrationsSkipped += 1;
        continue;
      }

      const allowedKeys = await customKeysForEdition(
        reg.courseEditionId,
        editionCustomKeys
      );
      if (allowedKeys.size === 0) {
        registrationsSkipped += 1;
        continue;
      }

      const filtered = {};
      for (const key of allowedKeys) {
        const val = profile[key];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          filtered[key] = String(val);
        }
      }

      if (Object.keys(filtered).length === 0) {
        registrationsSkipped += 1;
        continue;
      }

      await prisma.courseRegistration.update({
        where: { id: reg.id },
        data: { customData: filtered },
      });
      registrationsPopulated += 1;
    }
  }

  console.log("=== Backfill CourseRegistration.customData ===");
  console.log(`Employee con customData processati:          ${employeesProcessed}`);
  console.log(`Registration popolate:                       ${registrationsPopulated}`);
  console.log(`Registration saltate (idempotenza/no-match): ${registrationsSkipped}`);
}

main()
  .catch((error) => {
    console.error("Errore backfill registration.customData:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
