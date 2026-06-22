import { Pool, types } from "pg";

// Postgres geeft 'numeric'-kolommen standaard terug als string (om precisie te
// bewaren). Wij rekenen met gewone JS-numbers en ronden zelf af (zie lib/calc.ts),
// dus zetten we numeric altijd om naar number.
types.setTypeParser(1700 /* numeric */, (val) => (val === null ? null : parseFloat(val)));

// Een 'date'-kolom geeft pg standaard terug als JS Date-object (in lokale tijdzone
// geinterpreteerd), terwijl de hele app overal met 'YYYY-MM-DD'-strings rekent
// (zie lib/dateUtils.ts). Daarom laten we date-kolommen als ruwe string staan.
types.setTypeParser(1082 /* date */, (val) => val);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL ontbreekt. Zet de Supabase-connectiestring in .env.local (zie README)."
  );
}

declare global {
  var __boekhoudingPool: Pool | undefined;
}

// Lokaal (npm run dev/start, 1 langlevend proces) mag dit gerust wat hoger staan.
// Op serverless hosting (Netlify, Vercel, ...) draait elke request mogelijk in een
// kortlevende functie-instantie; te veel gelijktijdige pools/connecties per
// instantie kan dan de Supabase-pooler (Supavisor) verzadigen. PGPOOL_MAX laat dit
// per omgeving instellen; standaard houden we het sowieso laag, want deze app
// heeft maar 1 gebruiker tegelijk nodig. Zie README voor de aanbevolen waarde
// per hostingplatform.
const poolMax = Number(process.env.PGPOOL_MAX) || 3;

function createPool(): Pool {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: poolMax,
  });
}

export const pool: Pool = globalThis.__boekhoudingPool ?? createPool();
globalThis.__boekhoudingPool = pool;

export interface QueryResultRow {
  [key: string]: unknown;
}

// Kleine helper rond pool.query: geeft direct de rijen-array terug (pg-rijen
// zijn al gewone objecten, in tegenstelling tot node:sqlite, dus geen extra
// 'plain object'-conversie nodig).
export async function queryRows<T = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  await pool.query(sql, params);
}
