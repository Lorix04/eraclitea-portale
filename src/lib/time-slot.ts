/**
 * Fascia oraria opzionale di un'edizione (CourseEdition.timeSlot).
 * AM = Mattina, PM = Pomeriggio. null/undefined = non impostata.
 */
export type TimeSlot = "AM" | "PM";

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  AM: "Mattina",
  PM: "Pomeriggio",
};

/** Label italiana ("Mattina"/"Pomeriggio"), o "—" se non impostata. */
export function timeSlotLabel(value?: string | null): string {
  if (value === "AM" || value === "PM") return TIME_SLOT_LABELS[value];
  return "—";
}

/** Opzioni per i select (creazione/modifica/filtri). */
export const TIME_SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: "AM", label: "Mattina (AM)" },
  { value: "PM", label: "Pomeriggio (PM)" },
];
