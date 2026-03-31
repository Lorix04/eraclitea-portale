type FieldDef = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  isActive: boolean;
};

export function validateCustomData(
  customData: Record<string, any>,
  fields: FieldDef[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.isActive) continue;

    const value = customData[field.name];

    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field.name] = `${field.label} e obbligatorio`;
      continue;
    }

    if (value === undefined || value === null || value === "") continue;

    switch (field.type) {
      case "number":
        if (isNaN(Number(value)))
          errors[field.name] = `${field.label} deve essere un numero`;
        break;
      case "date":
        if (isNaN(Date.parse(String(value))))
          errors[field.name] = `${field.label} deve essere una data valida`;
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
          errors[field.name] = `${field.label} deve essere un'email valida`;
        break;
      case "select":
        if (field.options) {
          const opts = field.options.split("|").map((o) => o.trim());
          if (!opts.includes(String(value)))
            errors[field.name] = `${field.label}: valore non valido`;
        }
        break;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
