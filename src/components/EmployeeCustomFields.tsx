"use client";

import { useQuery } from "@tanstack/react-query";

type CustomFieldDef = {
  name: string;
  label: string;
  type: string;
  standardField: string | null;
};

interface EmployeeCustomFieldsProps {
  clientId: string;
  customData?: Record<string, any> | null;
  employeeData?: Record<string, any>;
}

function formatValue(value: any, type: string): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (type === "date") {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      // fall through
    }
  }
  return String(value);
}

export default function EmployeeCustomFields({
  clientId,
  customData,
  employeeData,
}: EmployeeCustomFieldsProps) {
  const { data: cfData } = useQuery({
    queryKey: ["custom-fields", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?clientId=${clientId}`);
      if (!res.ok) return { enabled: false, fields: [] };
      return res.json();
    },
    enabled: !!clientId,
  });

  if (!cfData?.enabled || !cfData.fields?.length) return null;

  const fields = (cfData.fields as CustomFieldDef[]).filter(
    (f) => !f.standardField
  );
  if (fields.length === 0) return null;

  // Check if there's any custom data to show
  const hasAnyValue = fields.some(
    (f) => customData?.[f.name] != null && customData[f.name] !== ""
  );
  if (!hasAnyValue) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="text-sm font-semibold mb-3">Campi personalizzati</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const value = customData?.[field.name];
          return (
            <div key={field.name}>
              <p className="text-xs text-muted-foreground">{field.label}</p>
              <p className="text-sm">{formatValue(value, field.type)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
