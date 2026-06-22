"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseAmountInput, round2 } from "@/lib/calc";
import type { WeekCore } from "@/lib/repo/week";
import AmountInput from "@/components/AmountInput";

type ExpenseRow = { description: string; amount: string };

export default function WeekClosingForm({
  isoYear,
  isoWeek,
  core,
  balanceStart,
  balanceEnd,
}: {
  isoYear: number;
  isoWeek: number;
  core: WeekCore;
  balanceStart: number | null;
  balanceEnd: number | null;
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>(
    core.expenses.length
      ? core.expenses.map((e) => ({ description: e.description, amount: String(e.amount) }))
      : [{ description: "", amount: "" }]
  );
  const [actualDeposit, setActualDeposit] = useState(
    core.actualDeposit !== null ? String(core.actualDeposit) : ""
  );
  const [depositNote, setDepositNote] = useState(core.depositNote || "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const expensesTotal = round2(expenses.reduce((s, e) => s + parseAmountInput(e.amount), 0));
  const calculatedDeposit = round2(core.combined.cashTotaal - expensesTotal);
  const verschil = actualDeposit !== "" ? round2(parseAmountInput(actualDeposit) - calculatedDeposit) : null;

  async function saveAll(snapshot: { expenses: ExpenseRow[]; actualDeposit: string; depositNote: string }) {
    setStatus("saving");
    try {
      const res = await fetch("/api/week/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isoYear,
          isoWeek,
          expenses: snapshot.expenses
            .filter((x) => x.description || x.amount)
            .map((x) => ({ description: x.description, amount: parseAmountInput(x.amount) })),
          actualDeposit: snapshot.actualDeposit !== "" ? parseAmountInput(snapshot.actualDeposit) : null,
          depositNote: snapshot.depositNote,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  function updateExpense(idx: number, patch: Partial<ExpenseRow>) {
    setExpenses((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function commitExpense(idx: number, patch: Partial<ExpenseRow>) {
    const next = expenses.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    setExpenses(next);
    void saveAll({ expenses: next, actualDeposit, depositNote });
  }

  function removeExpense(idx: number) {
    const next = expenses.filter((_, i) => i !== idx);
    setExpenses(next);
    void saveAll({ expenses: next, actualDeposit, depositNote });
  }

  function commitDeposit(patch: { actualDeposit?: string; depositNote?: string }) {
    const nextDeposit = patch.actualDeposit ?? actualDeposit;
    const nextNote = patch.depositNote ?? depositNote;
    if (patch.actualDeposit !== undefined) setActualDeposit(patch.actualDeposit);
    if (patch.depositNote !== undefined) setDepositNote(patch.depositNote);
    void saveAll({ expenses, actualDeposit: nextDeposit, depositNote: nextNote });
  }

  return (
    <div className="card card-body space-y-4">
      <h2 className="font-semibold">Week afsluiten</h2>

      <div>
        <div className="text-sm font-medium mb-2">Contante uitgaven (inkopen, salarissen, ...)</div>
        <div className="space-y-2">
          {expenses.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder="Omschrijving"
                className="field-input flex-1"
                value={row.description}
                onChange={(e) => updateExpense(idx, { description: e.target.value })}
                onBlur={(e) => commitExpense(idx, { description: e.target.value })}
              />
              <AmountInput
                placeholder="bedrag"
                className="field-input w-32 text-right"
                value={row.amount}
                onChange={(v) => updateExpense(idx, { amount: v })}
                onCommit={(formatted) => commitExpense(idx, { amount: formatted })}
              />
              <button type="button" className="text-red-600 text-sm px-2" onClick={() => removeExpense(idx)}>
                verwijder
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm underline text-slate-600"
            onClick={() => setExpenses([...expenses, { description: "", amount: "" }])}
          >
            + regel toevoegen
          </button>
        </div>
        <div className="text-sm text-slate-600 mt-2">Totaal kasuitgaven: &euro;{expensesTotal.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded p-3 text-sm">
        <div>Cash totaal (DD + Eagle)</div>
        <div className="text-right">&euro;{core.combined.cashTotaal.toFixed(2)}</div>
        <div>- Kasuitgaven</div>
        <div className="text-right">&euro;{expensesTotal.toFixed(2)}</div>
        <div className="font-semibold">= Te storten (berekend)</div>
        <div className="text-right font-semibold">&euro;{calculatedDeposit.toFixed(2)}</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Werkelijk afgestort bedrag (&euro;)</label>
          <AmountInput
            className="field-input w-full"
            value={actualDeposit}
            onChange={(v) => setActualDeposit(v)}
            onCommit={(formatted) => commitDeposit({ actualDeposit: formatted })}
          />
        </div>
        <div>
          <label className="field-label">Notitie</label>
          <input
            type="text"
            className="field-input w-full"
            value={depositNote}
            onChange={(e) => setDepositNote(e.target.value)}
            onBlur={(e) => commitDeposit({ depositNote: e.target.value })}
          />
        </div>
      </div>

      {verschil !== null && (
        <div className={`text-sm font-medium ${Math.abs(verschil) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
          Verschil (werkelijk - berekend): &euro;{verschil.toFixed(2)}
        </div>
      )}

      <div className="panel-dark grid grid-cols-2 gap-4 text-sm">
        <div>Kassaldo begin week</div>
        <div className="text-right">{balanceStart !== null ? `€${balanceStart.toFixed(2)}` : "-"}</div>
        <div className="font-semibold">Kassaldo eind week</div>
        <div className="text-right font-semibold">
          {balanceEnd !== null ? `€${balanceEnd.toFixed(2)}` : "-"}
        </div>
      </div>
      {balanceStart === null && (
        <p className="text-xs text-slate-500">
          Nog geen kassaldo voor deze week: die wordt pas opgebouwd vanaf de startdatum bij
          Instellingen.
        </p>
      )}

      <div className="text-sm h-5">
        {status === "saving" && <span className="text-slate-500">Bezig met opslaan...</span>}
        {status === "saved" && <span className="text-emerald-600">Opgeslagen.</span>}
        {status === "error" && <span className="text-red-600">Opslaan mislukt - controleer je internetverbinding.</span>}
        {status === "idle" && (
          <span className="text-slate-400">Wijzigingen worden automatisch opgeslagen zodra je een veld verlaat.</span>
        )}
      </div>
    </div>
  );
}
