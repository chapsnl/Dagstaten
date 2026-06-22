import { queryRows, queryOne, exec } from "@/lib/db";
import { calcKassaEntry, round2 } from "@/lib/calc";
import { getBusinesses, getKassas, getSettings } from "@/lib/repo/meta";
import {
  datesOfIsoWeek,
  formatISO,
  isoWeekInfoForDateStr,
  mondayOfIsoWeek,
  isoWeekInfoForDate,
  compareIsoWeek,
} from "@/lib/dateUtils";
import { Business, DailyEntryRow, Kassa, Settings, WeekExpenseRow } from "@/lib/types";
import { addDays } from "date-fns";

export interface WeekCore {
  isoYear: number;
  isoWeek: number;
  weekStart: string;
  weekEnd: string;
  businesses: {
    businessId: number;
    businessCode: string;
    businessName: string;
    turnoverIncl21: number;
    turnoverIncl9: number;
    btw21: number;
    btw9: number;
    totaalInclBtw: number;
    pinTotal: number;
    cashTotaal: number;
    perDag: {
      date: string;
      kassas: { kassaId: number; kassaCode: string; pinAmount: number; omzetIncl21: number; omzetIncl9: number; cashTotaal: number }[];
    }[];
  }[];
  combined: {
    turnoverInclBtw: number;
    btw21: number;
    btw9: number;
    pinTotal: number;
    cashTotaal: number;
  };
  expenses: WeekExpenseRow[];
  expensesTotal: number;
  actualDeposit: number | null;
  depositNote: string | null;
  calculatedDeposit: number;
  verschilDeposit: number | null;
  isClosed: boolean;
}

interface WeekRef {
  isoYear: number;
  isoWeek: number;
}

interface WeekMeta {
  settings: Settings;
  businesses: Business[];
  kassas: Kassa[];
}

interface DepositRow {
  iso_year: number;
  iso_week: number;
  actual_amount: number | null;
  note: string | null;
}

async function loadMeta(): Promise<WeekMeta> {
  const [settings, businesses, kassas] = await Promise.all([
    getSettings(),
    getBusinesses(),
    getKassas(),
  ]);
  return { settings, businesses, kassas };
}

// Bouwt een WeekCore op uit al-opgehaalde data (geen eigen DB-calls). Wordt gebruikt
// door zowel de losse computeWeekCore (1 week) als de batch-variant hieronder
// (meerdere weken in een handvol queries, voor het kwartaal-/jaaroverzicht).
function buildWeekCore(
  ref: WeekRef,
  meta: WeekMeta,
  entriesForWeek: DailyEntryRow[],
  expensesForWeek: WeekExpenseRow[],
  depositForWeek: DepositRow | null
): WeekCore {
  const { settings, businesses, kassas } = meta;
  const dates = datesOfIsoWeek(ref.isoYear, ref.isoWeek).map(formatISO);

  const businessResults = businesses.map((b) => {
    const businessKassas = kassas.filter((k) => k.business_id === b.id);
    let turnoverIncl21 = 0;
    let turnoverIncl9 = 0;
    let btw21 = 0;
    let btw9 = 0;
    let pinTotal = 0;
    let cashTotaal = 0;
    const perDag = dates.map((date) => ({
      date,
      kassas: businessKassas.map((k) => {
        const entry = entriesForWeek.find((e) => e.date === date && e.kassa_id === k.id);
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
        turnoverIncl21 += omzetIncl21;
        turnoverIncl9 += omzetIncl9;
        btw21 += calc.btw21;
        btw9 += calc.btw9;
        pinTotal += pinAmount;
        cashTotaal += calc.cashTotaal;
        return {
          kassaId: k.id,
          kassaCode: k.code,
          pinAmount,
          omzetIncl21,
          omzetIncl9,
          cashTotaal: calc.cashTotaal,
        };
      }),
    }));

    return {
      businessId: b.id,
      businessCode: b.code,
      businessName: b.name,
      turnoverIncl21: round2(turnoverIncl21),
      turnoverIncl9: round2(turnoverIncl9),
      btw21: round2(btw21),
      btw9: round2(btw9),
      totaalInclBtw: round2(turnoverIncl21 + turnoverIncl9),
      pinTotal: round2(pinTotal),
      cashTotaal: round2(cashTotaal),
      perDag,
    };
  });

  const combined = businessResults.reduce(
    (acc, b) => ({
      turnoverInclBtw: acc.turnoverInclBtw + b.totaalInclBtw,
      btw21: acc.btw21 + b.btw21,
      btw9: acc.btw9 + b.btw9,
      pinTotal: acc.pinTotal + b.pinTotal,
      cashTotaal: acc.cashTotaal + b.cashTotaal,
    }),
    { turnoverInclBtw: 0, btw21: 0, btw9: 0, pinTotal: 0, cashTotaal: 0 }
  );

  const expensesTotal = round2(expensesForWeek.reduce((s, e) => s + e.amount, 0));
  const calculatedDeposit = round2(combined.cashTotaal - expensesTotal);
  const actualDeposit = depositForWeek?.actual_amount ?? null;
  const verschilDeposit = actualDeposit !== null ? round2(actualDeposit - calculatedDeposit) : null;

  const monday = mondayOfIsoWeek(ref.isoYear, ref.isoWeek);
  return {
    isoYear: ref.isoYear,
    isoWeek: ref.isoWeek,
    weekStart: formatISO(monday),
    weekEnd: formatISO(addDays(monday, 6)),
    businesses: businessResults,
    combined: {
      turnoverInclBtw: round2(combined.turnoverInclBtw),
      btw21: round2(combined.btw21),
      btw9: round2(combined.btw9),
      pinTotal: round2(combined.pinTotal),
      cashTotaal: round2(combined.cashTotaal),
    },
    expenses: expensesForWeek,
    expensesTotal,
    actualDeposit,
    depositNote: depositForWeek?.note ?? null,
    calculatedDeposit,
    verschilDeposit,
    isClosed: actualDeposit !== null,
  };
}

export async function computeWeekCore(isoYear: number, isoWeek: number): Promise<WeekCore> {
  const meta = await loadMeta();
  const dates = datesOfIsoWeek(isoYear, isoWeek).map(formatISO);
  const [entries, expenses, depositRow] = await Promise.all([
    queryRows<DailyEntryRow>("SELECT * FROM daily_entries WHERE date = ANY($1::date[])", [dates]),
    queryRows<WeekExpenseRow>(
      "SELECT * FROM week_expenses WHERE iso_year = $1 AND iso_week = $2 ORDER BY sort_order, id",
      [isoYear, isoWeek]
    ),
    queryOne<DepositRow>("SELECT * FROM week_deposits WHERE iso_year = $1 AND iso_week = $2", [isoYear, isoWeek]),
  ]);
  return buildWeekCore({ isoYear, isoWeek }, meta, entries, expenses, depositRow);
}

// Haalt meerdere weken in een handvol queries op (1x daily_entries over de hele
// datumrange, 1x week_expenses en 1x week_deposits over de betrokken jaren) in
// plaats van per week apart te bevragen. Voorkomt honderden losse round-trips
// naar de database bij het kwartaal-/jaaroverzicht.
export async function computeWeekCoreRange(weekRefs: WeekRef[]): Promise<Map<string, WeekCore>> {
  const map = new Map<string, WeekCore>();
  if (weekRefs.length === 0) return map;

  const meta = await loadMeta();
  const allDates = weekRefs.flatMap((r) => datesOfIsoWeek(r.isoYear, r.isoWeek).map(formatISO));
  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
  const years = Array.from(new Set(weekRefs.map((r) => r.isoYear)));

  const [entries, expenses, deposits] = await Promise.all([
    queryRows<DailyEntryRow>("SELECT * FROM daily_entries WHERE date >= $1 AND date <= $2", [minDate, maxDate]),
    queryRows<WeekExpenseRow & { iso_year: number; iso_week: number }>(
      "SELECT * FROM week_expenses WHERE iso_year = ANY($1::int[]) ORDER BY iso_year, iso_week, sort_order, id",
      [years]
    ),
    queryRows<DepositRow>("SELECT * FROM week_deposits WHERE iso_year = ANY($1::int[])", [years]),
  ]);

  for (const ref of weekRefs) {
    const dateSet = new Set(datesOfIsoWeek(ref.isoYear, ref.isoWeek).map(formatISO));
    const weekEntries = entries.filter((e) => dateSet.has(e.date));
    const weekExpenses = expenses.filter((e) => e.iso_year === ref.isoYear && e.iso_week === ref.isoWeek);
    const weekDeposit = deposits.find((d) => d.iso_year === ref.isoYear && d.iso_week === ref.isoWeek) ?? null;
    map.set(`${ref.isoYear}-${ref.isoWeek}`, buildWeekCore(ref, meta, weekEntries, weekExpenses, weekDeposit));
  }
  return map;
}

export async function saveWeekExpenses(
  isoYear: number,
  isoWeek: number,
  expenses: { description: string; amount: number }[]
): Promise<void> {
  await exec("DELETE FROM week_expenses WHERE iso_year = $1 AND iso_week = $2", [isoYear, isoWeek]);
  let idx = 0;
  for (const e of expenses) {
    if (!e.description && !e.amount) continue;
    await exec(
      "INSERT INTO week_expenses (iso_year, iso_week, description, amount, sort_order) VALUES ($1, $2, $3, $4, $5)",
      [isoYear, isoWeek, e.description || "", e.amount || 0, idx]
    );
    idx += 1;
  }
}

export async function saveWeekDeposit(
  isoYear: number,
  isoWeek: number,
  actualAmount: number | null,
  note: string | null
): Promise<void> {
  await exec(
    `INSERT INTO week_deposits (iso_year, iso_week, actual_amount, note) VALUES ($1, $2, $3, $4)
     ON CONFLICT (iso_year, iso_week) DO UPDATE SET actual_amount = excluded.actual_amount, note = excluded.note`,
    [isoYear, isoWeek, actualAmount, note]
  );
}

export interface RunningBalanceEntry extends WeekCore {
  balanceStart: number;
  balanceEnd: number;
}

// Loopt chronologisch vanaf de startdatum van de kasstand t/m de doelweek en bouwt
// het lopende kassaldo op (zelfde logica als de "Kas"-kolom in de oude kwartaalstaat,
// met dit verschil dat hier het WERKELIJK afgestorte bedrag wordt gebruikt zodra dat
// is ingevoerd, zodat eventuele verschillen direct zichtbaar worden). Haalt alle
// betrokken weken in een keer op (computeWeekCoreRange) in plaats van week voor week.
export async function runningBalanceUpTo(targetYear: number, targetWeek: number): Promise<RunningBalanceEntry[]> {
  const settings = await getSettings();
  const start = isoWeekInfoForDateStr(settings.starting_cash_float_date || formatISO(new Date()));
  const target = { isoYear: targetYear, isoWeek: targetWeek };

  const weekRefs: WeekRef[] = [];
  let cursor = { isoYear: start.isoYear, isoWeek: start.isoWeek };
  let safety = 0;
  while (compareIsoWeek(cursor, target) <= 0 && safety < 600) {
    safety += 1;
    weekRefs.push(cursor);
    const nextMonday = addDays(mondayOfIsoWeek(cursor.isoYear, cursor.isoWeek), 7);
    const info = isoWeekInfoForDate(nextMonday);
    cursor = { isoYear: info.isoYear, isoWeek: info.isoWeek };
  }

  const coreMap = await computeWeekCoreRange(weekRefs);
  const result: RunningBalanceEntry[] = [];
  let balance = settings.starting_cash_float;
  for (const ref of weekRefs) {
    const core = coreMap.get(`${ref.isoYear}-${ref.isoWeek}`)!;
    const depositUsed = core.actualDeposit ?? core.calculatedDeposit;
    const balanceStart = balance;
    const balanceEnd = round2(
      balanceStart + core.combined.turnoverInclBtw - depositUsed - core.expensesTotal - core.combined.pinTotal
    );
    result.push({ ...core, balanceStart, balanceEnd });
    balance = balanceEnd;
  }
  return result;
}
