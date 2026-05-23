"use client";

import { UNITS } from "@/lib/types";

interface UnitSelectProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  size?: "sm" | "xs";
}

export function UnitSelect({ value, onChange, className, size = "sm" }: UnitSelectProps) {
  const isCustom = value && !UNITS.includes(value as typeof UNITS[number]);
  const sizeClass = size === "xs"
    ? "px-2 py-1 text-xs"
    : "px-2 py-2 text-sm";

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${sizeClass} ${className || ""}`}
    >
      <option value="">— unit —</option>
      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      {isCustom && <option value={value}>{value}</option>}
    </select>
  );
}
