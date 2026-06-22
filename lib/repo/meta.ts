import { queryRows, queryOne, exec } from "@/lib/db";
import { Business, Kassa, PinDevice, Settings } from "@/lib/types";

export async function getBusinesses(): Promise<Business[]> {
  return queryRows<Business>("SELECT * FROM businesses ORDER BY sort_order, id");
}

export async function getKassas(): Promise<Kassa[]> {
  return queryRows<Kassa>(
    "SELECT * FROM kassas WHERE active = true ORDER BY business_id, sort_order, id"
  );
}

export async function getPinDevices(): Promise<PinDevice[]> {
  return queryRows<PinDevice>(
    "SELECT * FROM pin_devices WHERE active = true ORDER BY business_id, sort_order, id"
  );
}

export async function getSettings(): Promise<Settings> {
  const rows = await queryRows<{ key: string; value: string }>("SELECT key, value FROM settings");
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    company_name: map.company_name ?? "",
    starting_cash_float: parseFloat(map.starting_cash_float ?? "0"),
    starting_cash_float_date: map.starting_cash_float_date ?? "",
    vat_rate_high: parseFloat(map.vat_rate_high ?? "21"),
    vat_rate_low: parseFloat(map.vat_rate_low ?? "9"),
  };
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;
    await exec(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, String(value)]
    );
  }
}

export async function getMeta() {
  const [businesses, kassas, pinDevices, settings] = await Promise.all([
    getBusinesses(),
    getKassas(),
    getPinDevices(),
    getSettings(),
  ]);
  return {
    settings,
    businesses: businesses.map((b) => ({
      ...b,
      kassas: kassas
        .filter((k) => k.business_id === b.id)
        .map((k) => ({
          ...k,
          pinDevices: pinDevices.filter((p) => p.kassa_id === k.id),
        })),
    })),
    reservePinDevices: pinDevices.filter((p) => p.is_reserve === true),
  };
}

// --- beheer (instellingen-scherm) ---

export async function addKassa(businessId: number, code: string, name: string): Promise<number> {
  const maxOrderRow = await queryOne<{ m: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) as m FROM kassas WHERE business_id = $1",
    [businessId]
  );
  const nextOrder = (maxOrderRow?.m ?? 0) + 1;
  const inserted = await queryOne<{ id: number }>(
    "INSERT INTO kassas (business_id, code, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id",
    [businessId, code, name, nextOrder]
  );
  const kassaId = inserted!.id;
  await exec(
    "INSERT INTO pin_devices (business_id, kassa_id, code, name, is_reserve, sort_order) VALUES ($1, $2, $3, $4, false, $5)",
    [businessId, kassaId, `PIN-${code}`, `PIN ${code}`, nextOrder]
  );
  return kassaId;
}

export async function deactivateKassa(kassaId: number): Promise<void> {
  await exec("UPDATE kassas SET active = false WHERE id = $1", [kassaId]);
  await exec("UPDATE pin_devices SET active = false WHERE kassa_id = $1", [kassaId]);
}

export async function renameKassa(kassaId: number, name: string): Promise<void> {
  await exec("UPDATE kassas SET name = $1 WHERE id = $2", [name, kassaId]);
}

export async function addReservePinDevice(name: string): Promise<void> {
  await exec(
    "INSERT INTO pin_devices (business_id, kassa_id, code, name, is_reserve, sort_order) VALUES (NULL, NULL, $1, $2, true, 99)",
    [`PIN-RES-${Date.now()}`, name]
  );
}
