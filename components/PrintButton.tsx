"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn print:hidden" type="button">
      Print / uitdraai
    </button>
  );
}
