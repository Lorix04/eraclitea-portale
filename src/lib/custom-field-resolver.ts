import { prisma } from "@/lib/prisma";

export type ResolvedCustomField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  options: string | null;
  defaultValue: string | null;
  sortOrder: number;
  columnHeader: string | null;
  standardField: string | null;
};

/**
 * Resolve custom fields for an edition.
 * Priority: edition.customFieldSetId → client default set → empty
 */
export async function getCustomFieldsForEdition(
  editionId: string
): Promise<{ enabled: boolean; fields: ResolvedCustomField[] }> {
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
            select: {
              id: true,
              name: true,
              label: true,
              type: true,
              required: true,
              placeholder: true,
              options: true,
              defaultValue: true,
              sortOrder: true,
              columnHeader: true,
              standardField: true,
            },
          },
        },
      },
    },
  });

  if (!edition) return { enabled: false, fields: [] };

  // If edition has a specific set, use it
  if (edition.customFieldSetId && edition.customFieldSet?.isActive) {
    return { enabled: true, fields: edition.customFieldSet.fields };
  }

  // Fallback: client's default set
  const defaultSet = await prisma.customFieldSet.findFirst({
    where: { clientId: edition.clientId, isDefault: true, isActive: true },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          label: true,
          type: true,
          required: true,
          placeholder: true,
          options: true,
          defaultValue: true,
          sortOrder: true,
          columnHeader: true,
          standardField: true,
        },
      },
    },
  });

  if (defaultSet && defaultSet.fields.length > 0) {
    return { enabled: true, fields: defaultSet.fields };
  }

  // Final fallback: legacy — check hasCustomFields + direct client fields
  const client = await prisma.client.findUnique({
    where: { id: edition.clientId },
    select: { hasCustomFields: true },
  });

  if (!client?.hasCustomFields) return { enabled: false, fields: [] };

  const legacyFields = await prisma.clientCustomField.findMany({
    where: { clientId: edition.clientId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      label: true,
      type: true,
      required: true,
      placeholder: true,
      options: true,
      defaultValue: true,
      sortOrder: true,
      columnHeader: true,
      standardField: true,
    },
  });

  return { enabled: legacyFields.length > 0, fields: legacyFields };
}

/**
 * Resolve custom fields for a client (for use outside edition context).
 * Returns the default set's fields, or legacy fields.
 */
export async function getCustomFieldsForClient(
  clientId: string
): Promise<{ enabled: boolean; fields: ResolvedCustomField[] }> {
  const defaultSet = await prisma.customFieldSet.findFirst({
    where: { clientId, isDefault: true, isActive: true },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          label: true,
          type: true,
          required: true,
          placeholder: true,
          options: true,
          defaultValue: true,
          sortOrder: true,
          columnHeader: true,
          standardField: true,
        },
      },
    },
  });

  if (defaultSet && defaultSet.fields.length > 0) {
    return { enabled: true, fields: defaultSet.fields };
  }

  // Legacy fallback
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { hasCustomFields: true },
  });

  if (!client?.hasCustomFields) return { enabled: false, fields: [] };

  const legacyFields = await prisma.clientCustomField.findMany({
    where: { clientId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      label: true,
      type: true,
      required: true,
      placeholder: true,
      options: true,
      defaultValue: true,
      sortOrder: true,
      columnHeader: true,
      standardField: true,
    },
  });

  return { enabled: legacyFields.length > 0, fields: legacyFields };
}
