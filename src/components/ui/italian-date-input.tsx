"use client";

import { useEffect, useState } from "react";
import { isValidItalianDate } from "@/lib/date-utils";

interface ItalianDateInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

export function ItalianDateInput({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  placeholder = "GG/MM/AAAA",
}: ItalianDateInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;

    const digits = newValue.replace(/\D/g, "");
    if (digits.length >= 2 && !newValue.includes("/")) {
      newValue = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    if (digits.length >= 4 && newValue.split("/").length < 3) {
      const parts = newValue.split("/");
      if (parts.length === 2 && parts[1].length >= 2) {
        newValue = `${parts[0]}/${parts[1].slice(0, 2)}/${parts[1].slice(2)}`;
      }
    }

    if (newValue.length > 10) {
      newValue = newValue.slice(0, 10);
    }

    setInputValue(newValue);

    if (newValue === "" || newValue.length === 10) {
      const valid = newValue === "" || isValidItalianDate(newValue);
      setIsInvalid(!valid);

      if (valid) {
        onChange(newValue);
      }
    }
  };

  const handleBlur = () => {
    if (inputValue && inputValue.length > 0 && inputValue.length < 10) {
      setIsInvalid(true);
    }
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="text-sm">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className={`mt-1 w-full rounded-md border bg-background px-3 py-2 ${
          isInvalid || error ? "border-red-500 focus:ring-red-500" : ""
        }`}
        aria-invalid={isInvalid || !!error}
      />
      {isInvalid || error ? (
        <p className="text-sm text-red-500">
          {error || "Inserisci una data valida (GG/MM/AAAA)"}
        </p>
      ) : null}
    </div>
  );
}
