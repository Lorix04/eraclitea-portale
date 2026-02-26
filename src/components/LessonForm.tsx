"use client";

import { useEffect, useMemo, useState } from "react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { formatItalianDate } from "@/lib/date-utils";
import { Lesson, LessonFormData } from "@/types";

interface LessonFormProps {
  lesson?: Lesson;
  onSubmit: (data: LessonFormData) => void;
  onCancel: () => void;
}

function getTimeInMinutes(value: string): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function LessonForm({ lesson, onSubmit, onCancel }: LessonFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [luogo, setLuogo] = useState("");
  const [knownLuoghi, setKnownLuoghi] = useState<string[]>([]);
  const [luogoInputFocused, setLuogoInputFocused] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredLuoghi = useMemo(() => {
    const query = luogo.trim().toLowerCase();
    if (!query) {
      return knownLuoghi.slice(0, 8);
    }
    return knownLuoghi
      .filter((entry) =>
        entry
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.startsWith(query))
      )
      .slice(0, 8);
  }, [knownLuoghi, luogo]);

  useEffect(() => {
    const loadLuoghi = async () => {
      try {
        const res = await fetch("/api/lezioni/luoghi");
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json)) {
          setKnownLuoghi(
            json
              .map((entry) => String(entry).trim())
              .filter((entry) => entry.length > 0)
          );
        }
      } catch {
        setKnownLuoghi([]);
      }
    };
    loadLuoghi();
  }, []);

  useEffect(() => {
    if (lesson) {
      setDate(formatItalianDate(lesson.date));
      setStartTime(lesson.startTime ?? "");
      setEndTime(lesson.endTime ?? "");
      setDurationHours(lesson.durationHours ?? "");
      setLuogo(lesson.luogo ?? "");
      setTitle(lesson.title ?? "");
      setNotes(lesson.notes ?? "");
      return;
    }
    setDate("");
    setStartTime("");
    setEndTime("");
    setDurationHours("");
    setLuogo("");
    setTitle("");
    setNotes("");
  }, [lesson]);

  useEffect(() => {
    if (!startTime || !endTime) return;
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    if (
      Number.isNaN(startHour) ||
      Number.isNaN(startMin) ||
      Number.isNaN(endHour) ||
      Number.isNaN(endMin)
    ) {
      return;
    }
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    const diffMinutes = endTotal - startTotal;
    if (diffMinutes <= 0) return;
    const hours = Math.round((diffMinutes / 60) * 100) / 100;
    setDurationHours(hours);
  }, [startTime, endTime]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!date) fieldErrors.date = "Questo campo e obbligatorio";
    if (!startTime) fieldErrors.startTime = "Questo campo e obbligatorio";
    if (!endTime) fieldErrors.endTime = "Questo campo e obbligatorio";
    const startMinutes = getTimeInMinutes(startTime);
    const endMinutes = getTimeInMinutes(endTime);
    if (
      startMinutes !== null &&
      endMinutes !== null &&
      endMinutes <= startMinutes
    ) {
      fieldErrors.endTime =
        "L'ora di fine deve essere successiva all'ora di inizio";
    }
    if (durationHours === "" || Number(durationHours) <= 0) {
      fieldErrors.durationHours = "Inserisci una durata valida";
    }
    if (!luogo.trim()) {
      fieldErrors.luogo = "Questo campo e obbligatorio";
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    onSubmit({
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationHours: Number(durationHours),
      luogo: luogo.trim(),
      title: title || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormRequiredLegend />
      <ItalianDateInput
        label="Data"
        value={date}
        onChange={(value) => {
          setDate(value);
          if (errors.date) {
            setErrors((prev) => ({ ...prev, date: "" }));
          }
        }}
        required
        error={errors.date}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Orario inizio</FormLabel>
          <input
            type="time"
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.startTime
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              if (errors.startTime) {
                setErrors((prev) => ({ ...prev, startTime: "" }));
              }
            }}
          />
          <FormFieldError message={errors.startTime} />
        </div>
        <div className="flex flex-col gap-2">
          <FormLabel required>Orario fine</FormLabel>
          <input
            type="time"
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.endTime ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              if (errors.endTime) {
                setErrors((prev) => ({ ...prev, endTime: "" }));
              }
            }}
          />
          <FormFieldError message={errors.endTime} />
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Durata (ore)</FormLabel>
        <input
          type="number"
          min="0.5"
          step="0.5"
          className={`rounded-md border bg-background px-3 py-2 ${
            errors.durationHours
              ? "border-red-500 focus-visible:outline-red-500"
              : ""
          }`}
          value={durationHours}
          onChange={(event) => {
            setDurationHours(event.target.value ? Number(event.target.value) : "");
            if (errors.durationHours) {
              setErrors((prev) => ({ ...prev, durationHours: "" }));
            }
          }}
        />
        <FormFieldError message={errors.durationHours} />
      </label>

      <label className="relative flex flex-col gap-2 text-sm">
        <FormLabel required>Luogo</FormLabel>
        <input
          type="text"
          className={`rounded-md border bg-background px-3 py-2 ${
            errors.luogo ? "border-red-500 focus-visible:outline-red-500" : ""
          }`}
          placeholder="Es. Aula A - Roma"
          value={luogo}
          onFocus={() => setLuogoInputFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setLuogoInputFocused(false), 120);
          }}
          onChange={(event) => {
            setLuogo(event.target.value);
            if (errors.luogo) {
              setErrors((prev) => ({ ...prev, luogo: "" }));
            }
          }}
        />
        {luogoInputFocused && filteredLuoghi.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-20 max-h-44 overflow-auto rounded-md border bg-popover py-1 shadow-md">
            {filteredLuoghi.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setLuogo(suggestion);
                    setLuogoInputFocused(false);
                    if (errors.luogo) {
                      setErrors((prev) => ({ ...prev, luogo: "" }));
                    }
                  }}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <FormFieldError message={errors.luogo} />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Argomento/Titolo</FormLabel>
        <input
          type="text"
          className="rounded-md border bg-background px-3 py-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Note</FormLabel>
        <textarea
          className="rounded-md border bg-background px-3 py-2"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={onCancel}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Salva
        </button>
      </div>
    </form>
  );
}
