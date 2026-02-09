"use client";

import { useEffect, useState } from "react";
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

export function LessonForm({ lesson, onSubmit, onCancel }: LessonFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lesson) {
      setDate(formatItalianDate(lesson.date));
      setStartTime(lesson.startTime ?? "");
      setEndTime(lesson.endTime ?? "");
      setDurationHours(lesson.durationHours ?? "");
      setTitle(lesson.title ?? "");
      setNotes(lesson.notes ?? "");
      return;
    }
    setDate("");
    setStartTime("");
    setEndTime("");
    setDurationHours("");
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
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    onSubmit({
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationHours: Number(durationHours),
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
          className="rounded-md border bg-background px-3 py-2"
          value={durationHours}
          onChange={(event) =>
            setDurationHours(event.target.value ? Number(event.target.value) : "")
          }
        />
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
