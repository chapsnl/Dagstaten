import { queryRows, exec } from "@/lib/db";
import { calcKassaEntry } from "@/lib/calc";
import { getSettings, getBusinesses, getKassas, getPinDevices } from "@/lib/repo/meta";
import { DailyEntryRow } from "@/lib/types";

export interface DayKassaView {
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
  btw21: number;
  btw9: number;
  totaalInclBtw: number;
  cashTotaal: number;
}

export async function getDayView(date: string): Promise<{
  date: string;
  perBusiness: { businessId: number; businessCode: string; businessName: string; kassas: DayKassaView[] }[];
}> {
  const [settings, businesses, kassas, pinDevices, entries] = await Promise.all([
    getSettings(),
    getBusinesses(),
    getKassas(),
    getPinDevices(),
    queryRows<DailyEntryRow>("SELECT * FROM daily_entries WHERE date = $1", [date]),
  ]);
  const reserveDevices = pinDevices.filter((p) => p.is_reserve === true);
  const entryByKassa = new Map(entries.map((e) => [e.kassa_id, e]));

  const perBusiness = businesses.map((b) => ({
    businessId: b.id,
    businessCode: b.code,
    businessName: b.name,
    kassas: kassas
      .filter((k) => k.business_id === b.id)
      .map((k) => {
        const entry = entryByKassa.get(k.id);
        const ownDevice = pinDevices.find((p) => p.kassa_id === k.id);
        const available = [
          ...(ownDevice ? [{ id: ownDevice.id, name: ownDevice.name, isReserve: false }] : []),
          ...reserveDevices.map((r) => ({ id: r.id, name: r.name, isReserve: true })),
        ];
        const pinAmount = entry?.pin_amount ?? 0;
        const omzetIncl21 = entry?.omzet_incl21 ?? 0;
        const omzetIncl9 = entry?.omzet_incl9 ?? 0;
        const calc = calcKassaEntry(
          pinAmount,
          omzetIncl21,
          omzetIncl9,
          settings.vat_rate_high,
          settings.vat_rate_low
        );
        return {
          kassaId: k.id,
          kassaCode: k.code,
          kassaName: k.name,
          businessId: b.id,
          businessCode: b.code,
          businessName: b.name,
          pinDeviceId: entry?.pin_device_id ?? ownDevice?.id ?? null,
          availablePinDevices: available,
          pinAmount,
          omzetIncl21,
          omzetIncl9,
          note: entry?.note ?? "",
          btw21: calc.btw21,
          btw9: calc.btw9,
          totaalInclBtw: calc.totaalInclBtw,
          cashTotaal: calc.cashTotaal,
        };
      }),
  }));

  return { date, perBusiness };
}

export interface DayEntryInput {
  kassaId: number;
  pinDeviceId: number | null;
  pinAmount: number;
  omzetIncl21: number;
  omzetIncl9: number;
  note?: string;
}

export async function saveDayEntries(date: string, entries: DayEntryInput[]): Promise<void> {
  for (const e of entries) {
    await exec(
      `INSERT INTO daily_entries (date, kassa_id, pin_device_id, pin_amount, omzet_incl21, omzet_incl9, note, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (date, kassa_id) DO UPDATE SET
         pin_device_id = excluded.pin_device_id,
         pin_amount = excluded.pin_amount,
         omzet_incl21 = excluded.omzet_incl21,
         omzet_incl9 = excluded.omzet_incl9,
         note = excluded.note,
         updated_at = now()`,
      [date, e.kassaId, e.pinDeviceId, e.pinAmount || 0, e.omzetIncl21 || 0, e.omzetIncl9 || 0, e.note ?? null]
    );
  }
}

export async function getEntriesForDateRange(startDate: string, endDate: string): Promise<DailyEntryRow[]> {
  return queryRows<DailyEntryRow>(
    "SELECT * FROM daily_entries WHERE date >= $1 AND date <= $2 ORDER BY date",
    [startDate, endDate]
  );
}
