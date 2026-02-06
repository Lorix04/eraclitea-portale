"use client";

import { useEffect, useState } from "react";

interface ColorPickerProps {
  label: string;
  value: string | null | undefined;
  onChange: (color: string) => void;
  required?: boolean;
  placeholder?: string;
}

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function ColorPicker({
  label,
  value,
  onChange,
  required,
  placeholder,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (val === "") {
      onChange("");
      return;
    }
    if (COLOR_REGEX.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="flex items-center gap-2">
        <div
          className="h-10 w-10 rounded border"
          style={{ backgroundColor: value || "#CCCCCC" }}
        />
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder || "#000000"}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input
          type="color"
          value={value || "#000000"}
          onChange={(event) => {
            setInputValue(event.target.value);
            onChange(event.target.value);
          }}
          className="h-10 w-10 cursor-pointer rounded border p-0"
        />
      </div>
    </div>
  );
}
