import {
  addDays,
  format,
  getISOWeek,
  getISOWeekYear,
  getQuarter,
  parseISO,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from "date-fns";

export const DAG_NAMEN = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];

export const MAAND_NAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function mondayOfIsoWeek(isoYear: number, isoWeek: number): Date {
  // Start vanaf 4 januari (ligt altijd in ISO-week 1) en zet het juiste iso-jaar/week.
  let d = new Date(isoYear, 0, 4);
  d = setISOWeekYear(d, isoYear);
  d = setISOWeek(d, isoWeek);
  return startOfISOWeek(d);
}

export function datesOfIsoWeek(isoYear: number, isoWeek: number): Date[] {
  const monday = mondayOfIsoWeek(isoYear, isoWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isoWeekInfoForDate(date: Date): {
  isoYear: number;
  isoWeek: number;
  monday: Date;
} {
  return {
    isoYear: getISOWeekYear(date),
    isoWeek: getISOWeek(date),
    monday: startOfISOWeek(date),
  };
}

export function isoWeekInfoForDateStr(dateStr: string) {
  return isoWeekInfoForDate(parseISO(dateStr));
}

// Een ISO-week wordt toegekend aan het kwartaal/maand van de donderdag in die week
// (zelfde conventie als het ISO-jaar van een week).
export function quarterInfoForIsoWeek(
  isoYear: number,
  isoWeek: number
): { year: number; quarter: number; month: number } {
  const monday = mondayOfIsoWeek(isoYear, isoWeek);
  const thursday = addDays(monday, 3);
  return {
    year: thursday.getFullYear(),
    quarter: getQuarter(thursday),
    month: thursday.getMonth() + 1,
  };
}

export interface QuarterWeekRef {
  isoYear: number;
  isoWeek: number;
  month: number;
  monday: Date;
}

export function weeksInQuarter(year: number, quarter: number): QuarterWeekRef[] {
  const result: QuarterWeekRef[] = [];
  // Loop ruim om het kwartaal heen (eerste kalenderweek van het jaar tot en met week 53)
  // en selecteer de weken waarvan de donderdag in het gevraagde kwartaal/jaar valt.
  for (let w = 1; w <= 53; w++) {
    const info = quarterInfoForIsoWeek(year - 1, w);
    if (info.year === year && info.quarter === quarter) {
      result.push({ isoYear: year - 1, isoWeek: w, month: info.month, monday: mondayOfIsoWeek(year - 1, w) });
    }
  }
  for (let w = 1; w <= 53; w++) {
    const info = quarterInfoForIsoWeek(year, w);
    if (info.year === year && info.quarter === quarter) {
      result.push({ isoYear: year, isoWeek: w, month: info.month, monday: mondayOfIsoWeek(year, w) });
    }
  }
  result.sort((a, b) => a.monday.getTime() - b.monday.getTime());
  return result;
}

export function weeksInYear(year: number): QuarterWeekRef[] {
  return [1, 2, 3, 4].flatMap((q) => weeksInQuarter(year, q));
}

export function compareIsoWeek(
  a: { isoYear: number; isoWeek: number },
  b: { isoYear: number; isoWeek: number }
): number {
  if (a.isoYear !== b.isoYear) return a.isoYear - b.isoYear;
  return a.isoWeek - b.isoWeek;
}
