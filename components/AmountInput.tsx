"use client";
import { formatAmount2 } from "@/lib/calc";

// Bedragveld dat bij het verlaten van het veld altijd 2 decimalen toont
// (325 -> 325,00, 725,50 blijft 725,50). onChange geeft de ruwe tekst door
// (voor live berekeningen tijdens het typen); onCommit wordt aangeroepen
// nadat het veld geformatteerd is (handig om dan automatisch op te slaan).
export default function AmountInput({
  value,
  onChange,
  onCommit,
  className,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: (formatted: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        const formatted = formatAmount2(value);
        onChange(formatted);
        onCommit?.(formatted);
      }}
    />
  );
}
