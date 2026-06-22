"use client";
import { useMemo, useState } from "react";
import { calcKassaEntry, parseAmountInput, round2 } from "@/lib/calc";
import { Settings } from "@/lib/types";
import AmountInput from "@/components/AmountInput";

interface DayKassaView {
  kassaId: number;
  kassaCode: string;
  kassaName: string;
  businessId: number;
  businessCode: string;
  businessName: string;
  pinDeviceId: number | null;
  availablePinDevices: { id: number; name: string; isReserve: boolean }[];
  pinAmount: number;
  omzetIncl21: number;
  omzetIncl9: number;
  note: string;
}

interface DayView {
  date: string;
  perBusiness: { businessId: number; businessCode: string; businessName: string; kassas: DayKassaView[] }[];
}

type RowState = {
  pinDeviceId: number | null;
  pinAmount: string;
  omzetIncl21: string;
  omzetIncl9: string;
  note: string;
};

function initialRows(view: DayView): Record<number, RowState> {
  const init: Record<number, RowState> = {};
  for (const b of view.perBusiness) {
    for (const k of b.kassas) {
      init[k.kassaId] = {
        pinDeviceId: k.pinDeviceId,
        pinAmount: k.pinAmount ? String(k.pinAmount) : "",
        omzetIncl21: k.omzetIncl21 ? String(k.omzetIncl21) : "",
        omzetIncl9: k.omzetIncl9 ? String(k.omzetIncl9) : "",
        note: k.note || "",
      };
    }
  }
  return init;
}

export default function DayEntryForm({
  date,
  view,
  settings,
}: {
  date: string;
  view: DayView;
  settings: Settings;
}) {
  const [rows, setRows] = useState<Record<number, RowState>>(() => initialRows(view));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Tijdens typen: alleen lokale state bijwerken (voor de live berekening).
  function update(kassaId: number, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [kassaId]: { ...prev[kassaId], ...patch } }));
  }

  // Bij het verlaten van een veld (of een directe keuze zoals het PIN-apparaat):
  // meteen opslaan, zodat je nooit data verliest door weg te klikken.
  function commit(kassaId: number, patch: Partial<RowState>) {
    const next = { ...rows, [kassaId]: { ...rows[kassaId], ...patch } };
    setRows(next);
    void saveAll(next);
  }

  async function saveAll(snapshot: Record<number, RowState>) {
    setStatus("saving");
    const entries = view.perBusiness.flatMap((b) =>
      b.kassas.map((k) => {
        const r = snapshot[k.kassaId];
        return {
          kassaId: k.kassaId,
          pinDeviceId: r.pinDeviceId,
          pinAmount: parseAmountInput(r.pinAmount),
          omzetIncl21: parseAmountInput(r.omzetIncl21),
          omzetIncl9: parseAmountInput(r.omzetIncl9),
          note: r.note,
        };
      })
    );
    try {
      const res = await fetch("/api/day/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entries }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const calcByKassa = useMemo(() => {
    const out: Record<number, ReturnType<typeof calcKassaEntry>> = {};
    for (const b of view.perBusiness) {
      for (const k of b.kassas) {
        const r = rows[k.kassaId];
        out[k.kassaId] = calcKassaEntry(
          parseAmountInput(r.pinAmount),
          parseAmountInput(r.omzetIncl21),
          parseAmountInput(r.omzetIncl9),
          settings.vat_rate_high,
          settings.vat_rate_low
        );
      }
    }
    return out;
  }, [rows, view, settings]);

  const dagTotaal = useMemo(() => {
    let pin = 0,
      cash = 0,
      omzet = 0,
      btw21 = 0,
      btw9 = 0;
    Object.values(calcByKassa).forEach((c) => {
      pin += c.pinAmount;
      cash += c.cashTotaal;
      omzet += c.totaalInclBtw;
      btw21 += c.btw21;
      btw9 += c.btw9;
    });
    return {
      pin: round2(pin),
      cash: round2(cash),
      omzet: round2(omzet),
      btw21: round2(btw21),
      btw9: round2(btw9),
    };
  }, [calcByKassa]);

  return (
    <div className="space-y-8">
      {view.perBusiness.map((b) => (
        <div key={b.businessId} className="card">
          <div className="card-header">{b.businessName}</div>
          <div className="overflow-x-auto">
            <table className="fin">
              <thead>
                <tr>
                  <th>Kassa</th>
                  <th>PIN-apparaat</th>
                  <th>PIN bedrag (&euro;)</th>
                  <th>Omzet incl. 21%</th>
                  <th>Omzet incl. 9%</th>
                  <th>BTW 21%</th>
                  <th>BTW 9%</th>
                  <th>Totaal omzet</th>
                  <th>Cash (=totaal-pin)</th>
                </tr>
              </thead>
              <tbody>
                {b.kassas.map((k) => {
                  const r = rows[k.kassaId];
                  const c = calcByKassa[k.kassaId];
                  return (
                    <tr key={k.kassaId}>
                      <td className="font-medium">{k.kassaName}</td>
                      <td>
                        {k.availablePinDevices.length > 1 ? (
                          <select
                            className="field-input w-full"
                            value={r.pinDeviceId ?? ""}
                            onChange={(e) => commit(k.kassaId, { pinDeviceId: Number(e.target.value) })}
                          >
                            {k.availablePinDevices.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                                {d.isReserve ? " (reserve)" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500">{k.availablePinDevices[0]?.name ?? "-"}</span>
                        )}
                      </td>
                      <td>
                        <AmountInput
                          className="field-input w-24 text-right"
                          value={r.pinAmount}
                          onChange={(v) => update(k.kassaId, { pinAmount: v })}
                          onCommit={(formatted) => commit(k.kassaId, { pinAmount: formatted })}
                        />
                      </td>
                      <td>
                        <AmountInput
                          className="field-input w-24 text-right"
                          value={r.omzetIncl21}
                          onChange={(v) => update(k.kassaId, { omzetIncl21: v })}
                          onCommit={(formatted) => commit(k.kassaId, { omzetIncl21: formatted })}
                        />
                      </td>
                      <td>
                        <AmountInput
                          className="field-input w-24 text-right"
                          value={r.omzetIncl9}
                          onChange={(v) => update(k.kassaId, { omzetIncl9: v })}
                          onCommit={(formatted) => commit(k.kassaId, { omzetIncl9: formatted })}
                        />
                      </td>
                      <td className="text-right text-slate-600">&euro; {c.btw21.toFixed(2)}</td>
                      <td className="text-right text-slate-600">&euro; {c.btw9.toFixed(2)}</td>
                      <td className="text-right font-medium">&euro; {c.totaalInclBtw.toFixed(2)}</td>
                      <td className="text-right font-medium">&euro; {c.cashTotaal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="panel-dark flex flex-wrap gap-6 text-sm">
        <div>
          <div className="text-slate-300">Totaal omzet</div>
          <div className="text-lg font-semibold">&euro; {dagTotaal.omzet.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-300">BTW 21%</div>
          <div className="text-lg font-semibold">&euro; {dagTotaal.btw21.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-300">BTW 9%</div>
          <div className="text-lg font-semibold">&euro; {dagTotaal.btw9.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-300">PIN totaal</div>
          <div className="text-lg font-semibold">&euro; {dagTotaal.pin.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-300">Cash totaal</div>
          <div className="text-lg font-semibold">&euro; {dagTotaal.cash.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-sm h-5">
        {status === "saving" && <span className="text-slate-500">Bezig met opslaan...</span>}
        {status === "saved" && <span className="text-emerald-600">Opgeslagen.</span>}
        {status === "error" && (
          <span className="text-red-600">Opslaan mislukt - controleer je internetverbinding.</span>
        )}
        {status === "idle" && (
          <span className="text-slate-400">Wijzigingen worden automatisch opgeslagen zodra je een veld verlaat.</span>
        )}
      </div>
    </div>
  );
}
