import { weeksInQuarter, MAAND_NAMEN } from "@/lib/dateUtils";
import { computeWeekCoreRange, runningBalanceUpTo, WeekCore } from "@/lib/repo/week";
import { getSettings } from "@/lib/repo/meta";
import { round2 } from "@/lib/calc";

export interface QuarterReportRow {
  isoYear: number;
  isoWeek: number;
  weekStart: string;
  weekEnd: string;
  btw21: number;
  excl21: number;
  btw9: number;
  excl9: number;
  exclBtw: number;
  inclBtw: number;
  bankafstort: number;
  kasUitgaven: number;
  pin: number;
  cash: number;
  kasEindstand: number | null;
  isClosed: boolean;
}

type Totals = Omit<QuarterReportRow, "isoYear" | "isoWeek" | "weekStart" | "weekEnd" | "kasEindstand" | "isClosed">;

export interface QuarterReportMonth {
  month: number;
  monthName: string;
  weeks: QuarterReportRow[];
  totals: Totals;
}

export interface QuarterReport {
  year: number;
  quarter: number;
  months: QuarterReportMonth[];
  totals: Totals;
  kasEindstand: number | null;
  teBetalenBtw: number;
}

function toRow(core: WeekCore, kasEindstand: number | null): QuarterReportRow {
  const excl21 = round2(core.combined.btw21 > 0 ? (core.combined.btw21 * 100) / 21 : 0);
  const excl9 = round2(core.combined.btw9 > 0 ? (core.combined.btw9 * 100) / 9 : 0);
  return {
    isoYear: core.isoYear,
    isoWeek: core.isoWeek,
    weekStart: core.weekStart,
    weekEnd: core.weekEnd,
    btw21: core.combined.btw21,
    excl21,
    btw9: core.combined.btw9,
    excl9,
    exclBtw: round2(excl21 + excl9),
    inclBtw: core.combined.turnoverInclBtw,
    bankafstort: round2(core.actualDeposit ?? core.calculatedDeposit),
    kasUitgaven: core.expensesTotal,
    pin: core.combined.pinTotal,
    cash: core.combined.cashTotaal,
    kasEindstand,
    isClosed: core.isClosed,
  };
}

function sumRows(rows: QuarterReportRow[]): Totals {
  const base: Totals = {
    btw21: 0,
    excl21: 0,
    btw9: 0,
    excl9: 0,
    exclBtw: 0,
    inclBtw: 0,
    bankafstort: 0,
    kasUitgaven: 0,
    pin: 0,
    cash: 0,
  };
  for (const r of rows) {
    base.btw21 += r.btw21;
    base.excl21 += r.excl21;
    base.btw9 += r.btw9;
    base.excl9 += r.excl9;
    base.exclBtw += r.exclBtw;
    base.inclBtw += r.inclBtw;
    base.bankafstort += r.bankafstort;
    base.kasUitgaven += r.kasUitgaven;
    base.pin += r.pin;
    base.cash += r.cash;
  }
  (Object.keys(base) as (keyof Totals)[]).forEach((k) => (base[k] = round2(base[k])));
  return base;
}

// Het lopende kassaldo is alleen gedefinieerd vanaf de ingestelde startdatum
// (instellingen > "Vanaf datum"). Weken vóór die datum krijgen kasEindstand = null:
// er is dan geen vaste startwaarde om vanaf te rekenen.
async function balanceMapUpTo(lastIsoYear: number, lastIsoWeek: number): Promise<Map<string, number>> {
  const chain = await runningBalanceUpTo(lastIsoYear, lastIsoWeek);
  return new Map(chain.map((c) => [`${c.isoYear}-${c.isoWeek}`, c.balanceEnd]));
}

export async function getQuarterReport(year: number, quarter: number): Promise<QuarterReport> {
  const weekRefs = weeksInQuarter(year, quarter);
  if (weekRefs.length === 0) {
    const empty = sumRows([]);
    return { year, quarter, months: [], totals: empty, kasEindstand: null, teBetalenBtw: 0 };
  }
  const last = weekRefs[weekRefs.length - 1];
  const [balanceMap, coreMap] = await Promise.all([
    balanceMapUpTo(last.isoYear, last.isoWeek),
    computeWeekCoreRange(weekRefs),
  ]);

  const rows = weekRefs.map((ref) => {
    const core = coreMap.get(`${ref.isoYear}-${ref.isoWeek}`)!;
    const kasEindstand = balanceMap.get(`${ref.isoYear}-${ref.isoWeek}`) ?? null;
    return { month: ref.month, row: toRow(core, kasEindstand) };
  });

  const monthsSet = Array.from(new Set(rows.map((r) => r.month))).sort((a, b) => a - b);
  const months: QuarterReportMonth[] = monthsSet.map((m) => {
    const weeks = rows.filter((r) => r.month === m).map((r) => r.row);
    return {
      month: m,
      monthName: MAAND_NAMEN[m - 1],
      weeks,
      totals: sumRows(weeks),
    };
  });

  const allRows = rows.map((r) => r.row);
  const totals = sumRows(allRows);
  const lastWithBalance = [...allRows].reverse().find((r) => r.kasEindstand !== null);

  return {
    year,
    quarter,
    months,
    totals,
    kasEindstand: lastWithBalance ? lastWithBalance.kasEindstand : null,
    teBetalenBtw: round2(totals.btw21 + totals.btw9),
  };
}

export interface YearOverview {
  year: number;
  quarters: {
    quarter: number;
    teBetalenBtw: number;
    inclBtw: number;
    exclBtw: number;
    kasUitgaven: number;
    bankafstort: number;
    pin: number;
    kasEindstand: number | null;
  }[];
  totals: { teBetalenBtw: number; inclBtw: number; exclBtw: number; kasUitgaven: number; bankafstort: number; pin: number };
  kasStart: number;
  kasEinde: number | null;
}

export async function getYearOverview(year: number): Promise<YearOverview> {
  const [quarters, settings] = await Promise.all([
    Promise.all([1, 2, 3, 4].map((q) => getQuarterReport(year, q))),
    getSettings(),
  ]);

  const qRows = quarters.map((q) => ({
    quarter: q.quarter,
    teBetalenBtw: q.teBetalenBtw,
    inclBtw: q.totals.inclBtw,
    exclBtw: q.totals.exclBtw,
    kasUitgaven: q.totals.kasUitgaven,
    bankafstort: q.totals.bankafstort,
    pin: q.totals.pin,
    kasEindstand: q.kasEindstand,
  }));

  const totals = qRows.reduce(
    (acc, r) => ({
      teBetalenBtw: acc.teBetalenBtw + r.teBetalenBtw,
      inclBtw: acc.inclBtw + r.inclBtw,
      exclBtw: acc.exclBtw + r.exclBtw,
      kasUitgaven: acc.kasUitgaven + r.kasUitgaven,
      bankafstort: acc.bankafstort + r.bankafstort,
      pin: acc.pin + r.pin,
    }),
    { teBetalenBtw: 0, inclBtw: 0, exclBtw: 0, kasUitgaven: 0, bankafstort: 0, pin: 0 }
  );
  (Object.keys(totals) as (keyof typeof totals)[]).forEach((k) => (totals[k] = round2(totals[k])));

  const lastWithBalance = [...qRows].reverse().find((q) => q.kasEindstand !== null);

  return {
    year,
    quarters: qRows,
    totals,
    kasStart: round2(settings.starting_cash_float),
    kasEinde: lastWithBalance ? lastWithBalance.kasEindstand : null,
  };
}
