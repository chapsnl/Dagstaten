// Zorgt dat het Postgres-schema (Supabase) bestaat en vult ontbrekende
// standaardgegevens (bedrijven/kassa's/PIN-apparaten/instellingen) aan.
// Elk onderdeel wordt apart gecontroleerd, dus dit script is veilig om
// meerdere keren te draaien - ook als de database al deels gevuld was
// (bijvoorbeeld omdat eerder alleen handmatig het schema is uitgevoerd).
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../lib/db";

async function ensureBusiness(code: string, name: string, sortOrder: number): Promise<number> {
  const existing = await pool.query("select id from businesses where code = $1", [code]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const inserted = await pool.query(
    "insert into businesses (code, name, sort_order) values ($1, $2, $3) returning id",
    [code, name, sortOrder]
  );
  console.log(`Bedrijf aangemaakt: ${name}`);
  return inserted.rows[0].id;
}

async function ensureKassa(
  businessId: number,
  code: string,
  name: string,
  sortOrder: number
): Promise<number> {
  const existing = await pool.query(
    "select id from kassas where business_id = $1 and code = $2",
    [businessId, code]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  const inserted = await pool.query(
    "insert into kassas (business_id, code, name, sort_order) values ($1, $2, $3, $4) returning id",
    [businessId, code, name, sortOrder]
  );
  console.log(`Kassa aangemaakt: ${name}`);
  return inserted.rows[0].id;
}

async function ensurePinDeviceForKassa(businessId: number, kassaId: number, code: string, name: string) {
  const existing = await pool.query("select id from pin_devices where kassa_id = $1", [kassaId]);
  if (existing.rows.length > 0) return;
  await pool.query(
    "insert into pin_devices (business_id, kassa_id, code, name, is_reserve, sort_order) values ($1, $2, $3, $4, false, 0)",
    [businessId, kassaId, code, name]
  );
  console.log(`PIN-apparaat aangemaakt: ${name}`);
}

async function ensureReservePinDevice() {
  const existing = await pool.query("select id from pin_devices where is_reserve = true limit 1");
  if (existing.rows.length > 0) return;
  await pool.query(
    "insert into pin_devices (business_id, kassa_id, code, name, is_reserve, sort_order) values (null, null, $1, $2, true, 99)",
    ["PIN-RESERVE", "Reserve PIN"]
  );
  console.log("Reserve PIN-apparaat aangemaakt.");
}

async function ensureSetting(key: string, value: string) {
  const existing = await pool.query("select key from settings where key = $1", [key]);
  if (existing.rows.length > 0) return;
  await pool.query("insert into settings (key, value) values ($1, $2)", [key, value]);
  console.log(`Instelling aangemaakt: ${key} = ${value}`);
}

async function ensureSeed() {
  const ddId = await ensureBusiness("DD", "DD", 1);
  const eagleId = await ensureBusiness("EAGLE", "Eagle", 2);

  const kassaSpecs: [number, string, string, number][] = [
    [ddId, "D1", "D1", 1],
    [ddId, "D2", "D2", 2],
    [eagleId, "E1", "E1", 1],
    [eagleId, "E2", "E2", 2],
  ];
  for (const [businessId, code, name, sortOrder] of kassaSpecs) {
    const kassaId = await ensureKassa(businessId, code, name, sortOrder);
    await ensurePinDeviceForKassa(businessId, kassaId, `PIN-${code}`, `PIN ${code}`);
  }
  await ensureReservePinDevice();

  await ensureSetting("company_name", "Leatherpride Netherlands BV");
  await ensureSetting("starting_cash_float", "0");
  await ensureSetting("starting_cash_float_date", new Date().toISOString().slice(0, 10));
  await ensureSetting("vat_rate_high", "21");
  await ensureSetting("vat_rate_low", "9");
}

async function main() {
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schemaSql);
  await ensureSeed();
  console.log("Database klaar.");
  await pool.end();
}

main().catch((err) => {
  console.error("Database-initialisatie mislukt:", err);
  process.exit(1);
});
