import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) return unit || "";
  const q = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2).replace(/\.?0+$/, "");
  return unit ? `${q} ${unit}` : q;
}

export function scaleQuantity(quantity: number | null, scale: number): number | null {
  if (quantity === null) return null;
  return Math.round(quantity * scale * 1000) / 1000;
}

/** Returns true if an ingredient name matches any entry in the user's skip list. */
export function isSkippedIngredient(name: string, skipList: string[]): boolean {
  const lower = name.toLowerCase().trim();
  return skipList.some(
    (skip) => lower === skip || lower.startsWith(skip + " ") || lower.endsWith(" " + skip)
  );
}
