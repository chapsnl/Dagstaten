// Pure BTW / kassa berekeningen, gedeeld door server (API routes) en evt. client preview.

export function btwFromIncl(incl: number, ratePercent: number): number {
  if (!incl) return 0;
  return incl - incl / (1 + ratePercent / 100);
}

export function exclFromIncl(incl: number, ratePercent: number): number {
  if (!incl) return 0;
  return incl / (1 + ratePercent / 100);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface KassaEntryCalc {
  pinAmount: number;
  omzetIncl21: number;
  omzetIncl9: number;
  btw21: number;
  btw9: number;
  totaalInclBtw: number;
  cashTotaal: number;
}

export function calcKassaEntry(
  pinAmount: number,
  omzetIncl21: number,
  omzetIncl9: number,
  rateHigh: number,
  rateLow: number
): KassaEntryCalc {
  const btw21 = btwFromIncl(omzetIncl21, rateHigh);
  const btw9 = btwFromIncl(omzetIncl9, rateLow);
  const totaalInclBtw = omzetIncl21 + omzetIncl9;
  const cashTotaal = totaalInclBtw - pinAmount;
  return {
    pinAmount,
    omzetIncl21,
    omzetIncl9,
    btw21: round2(btw21),
    btw9: round2(btw9),
    totaalInclBtw: round2(totaalInclBtw),
    cashTotaal: round2(cashTotaal),
  };
}
