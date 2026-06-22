"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { getMeta } from "@/lib/repo/meta";

type Meta = Awaited<ReturnType<typeof getMeta>>;

export default function SettingsForm({ meta }: { meta: Meta }) {
  const router = useRouter();
  const [settings, setSettings] = useState(meta.settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newKassa, setNewKassa] = useState<Record<number, { code: string; name: string }>>({});
  const [newReserveName, setNewReserveName] = useState("");

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSavingSettings(false);
    router.refresh();
  }

  async function addKassa(businessId: number) {
    const v = newKassa[businessId];
    if (!v?.code || !v?.name) return;
    await fetch("/api/kassa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, code: v.code, name: v.name }),
    });
    setNewKassa((p) => ({ ...p, [businessId]: { code: "", name: "" } }));
    router.refresh();
  }

  async function renameKassa(id: number, name: string) {
    await fetch(`/api/kassa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function deactivateKassa(id: number) {
    if (!confirm("Deze kassa deactiveren? Eerder ingevoerde data blijft bewaard.")) return;
    await fetch(`/api/kassa/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addReserve() {
    if (!newReserveName) return;
    await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newReserveName }),
    });
    setNewReserveName("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveSettings} className="card card-body space-y-4">
        <h2 className="font-semibold">Algemeen</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Bedrijfsnaam</label>
            <input
              type="text"
              className="field-input w-full"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
            />
          </div>
          <div />
          <div>
            <label className="field-label">Startkas (vlottende kas) &euro;</label>
            <input
              type="text"
              inputMode="decimal"
              className="field-input w-full"
              value={settings.starting_cash_float}
              onChange={(e) =>
                setSettings({ ...settings, starting_cash_float: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="field-label">Vanaf datum</label>
            <input
              type="date"
              className="field-input w-full"
              value={settings.starting_cash_float_date}
              onChange={(e) => setSettings({ ...settings, starting_cash_float_date: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">BTW-tarief hoog (%)</label>
            <input
              type="text"
              inputMode="decimal"
              className="field-input w-full"
              value={settings.vat_rate_high}
              onChange={(e) => setSettings({ ...settings, vat_rate_high: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="field-label">BTW-tarief laag (%)</label>
            <input
              type="text"
              inputMode="decimal"
              className="field-input w-full"
              value={settings.vat_rate_low}
              onChange={(e) => setSettings({ ...settings, vat_rate_low: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <button type="submit" disabled={savingSettings} className="btn-save">
          Opslaan
        </button>
      </form>

      {meta.businesses.map((b) => (
        <div key={b.id} className="card card-body space-y-3">
          <h2 className="font-semibold">{b.name} - kassa&apos;s</h2>
          <table className="fin">
            <thead>
              <tr>
                <th>Code</th>
                <th>Naam</th>
                <th>PIN-apparaat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {b.kassas.map((k) => (
                <tr key={k.id}>
                  <td>{k.code}</td>
                  <td>
                    <input
                      type="text"
                      defaultValue={k.name}
                      className="field-input"
                      onBlur={(e) => {
                        if (e.target.value !== k.name) renameKassa(k.id, e.target.value);
                      }}
                    />
                  </td>
                  <td>{k.pinDevices.map((p) => p.name).join(", ") || "-"}</td>
                  <td>
                    <button type="button" className="text-red-600 text-sm" onClick={() => deactivateKassa(k.id)}>
                      deactiveren
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-slate-500">Code</label>
              <input
                type="text"
                className="field-input w-24"
                value={newKassa[b.id]?.code ?? ""}
                onChange={(e) => setNewKassa((p) => ({ ...p, [b.id]: { ...p[b.id], code: e.target.value } }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Naam</label>
              <input
                type="text"
                className="field-input w-40"
                value={newKassa[b.id]?.name ?? ""}
                onChange={(e) => setNewKassa((p) => ({ ...p, [b.id]: { ...p[b.id], name: e.target.value } }))}
              />
            </div>
            <button type="button" className="btn" onClick={() => addKassa(b.id)}>
              + kassa toevoegen
            </button>
          </div>
        </div>
      ))}

      <div className="card card-body space-y-3">
        <h2 className="font-semibold">Reserve PIN-apparaten</h2>
        <ul className="text-sm list-disc pl-5">
          {meta.reservePinDevices.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
        <div className="flex gap-2 items-end">
          <input
            type="text"
            placeholder="naam"
            className="field-input w-48"
            value={newReserveName}
            onChange={(e) => setNewReserveName(e.target.value)}
          />
          <button type="button" className="btn" onClick={addReserve}>
            + reserve toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
