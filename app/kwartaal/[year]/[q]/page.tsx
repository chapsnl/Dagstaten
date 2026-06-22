import { getQuarterReport } from "@/lib/repo/report";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export default async function KwartaalPage({
  params,
}: {
  params: Promise<{ year: string; q: string }>;
}) {
  const { year, q } = await params;
  const yearNum = Number(year);
  const quarter = Number(q);
  const report = await getQuarterReport(yearNum, quarter);

  const prevQ = quarter - 1 < 1 ? 4 : quarter - 1;
  const prevY = quarter - 1 < 1 ? yearNum - 1 : yearNum;
  const nextQ = quarter + 1 > 4 ? 1 : quarter + 1;
  const nextY = quarter + 1 > 4 ? yearNum + 1 : yearNum;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">
            {quarter}e kwartaal {yearNum}
          </h1>
          <p className="page-subtitle">BTW-overzicht voor de aangifte</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kwartaal/${prevY}/${prevQ}`} className="btn">
            &larr; vorig kwartaal
          </Link>
          <Link href={`/kwartaal/${nextY}/${nextQ}`} className="btn">
            volgend kwartaal &rarr;
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="panel-highlight flex flex-wrap gap-8">
        <div>
          <div className="text-emerald-100 text-sm">Af te dragen BTW</div>
          <div className="text-2xl font-semibold">&euro;{report.teBetalenBtw.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-emerald-100 text-sm">Omzet incl. BTW</div>
          <div className="text-2xl font-semibold">&euro;{report.totals.inclBtw.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-emerald-100 text-sm">Kassaldo einde kwartaal</div>
          <div className="text-2xl font-semibold">
            {report.kasEindstand !== null ? `\u20ac${report.kasEindstand.toFixed(2)}` : "-"}
          </div>
        </div>
      </div>

      {report.months.map((m) => (
        <div key={m.month} className="card">
          <div className="card-header capitalize">{m.monthName}</div>
          <div className="overflow-x-auto">
            <table className="fin">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Periode</th>
                  <th>BTW 21%</th>
                  <th>Excl. 21%</th>
                  <th>BTW 9%</th>
                  <th>Excl. 9%</th>
                  <th>Omzet excl. BTW</th>
                  <th>Omzet incl. BTW</th>
                  <th>Bankafstort</th>
                  <th>Kasuitgaven</th>
                  <th>PIN</th>
                  <th>Cash</th>
                  <th>Kassaldo</th>
                </tr>
              </thead>
              <tbody>
                {m.weeks.map((w) => (
                  <tr key={`${w.isoYear}-${w.isoWeek}`}>
                    <td>
                      <Link href={`/week/${w.isoYear}/${w.isoWeek}`} className="underline">
                        {w.isoWeek}
                      </Link>
                      {!w.isClosed && <span className="text-amber-600 text-xs ml-1">(open)</span>}
                    </td>
                    <td className="text-slate-500">
                      {w.weekStart} / {w.weekEnd}
                    </td>
                    <td className="text-right">{w.btw21.toFixed(2)}</td>
                    <td className="text-right">{w.excl21.toFixed(2)}</td>
                    <td className="text-right">{w.btw9.toFixed(2)}</td>
                    <td className="text-right">{w.excl9.toFixed(2)}</td>
                    <td className="text-right">{w.exclBtw.toFixed(2)}</td>
                    <td className="text-right">{w.inclBtw.toFixed(2)}</td>
                    <td className="text-right">{w.bankafstort.toFixed(2)}</td>
                    <td className="text-right">{w.kasUitgaven.toFixed(2)}</td>
                    <td className="text-right">{w.pin.toFixed(2)}</td>
                    <td className="text-right">{w.cash.toFixed(2)}</td>
                    <td className="text-right">{w.kasEindstand !== null ? w.kasEindstand.toFixed(2) : "-"}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-slate-50">
                  <td colSpan={2}>Totaal {m.monthName}</td>
                  <td className="text-right">{m.totals.btw21.toFixed(2)}</td>
                  <td className="text-right">{m.totals.excl21.toFixed(2)}</td>
                  <td className="text-right">{m.totals.btw9.toFixed(2)}</td>
                  <td className="text-right">{m.totals.excl9.toFixed(2)}</td>
                  <td className="text-right">{m.totals.exclBtw.toFixed(2)}</td>
                  <td className="text-right">{m.totals.inclBtw.toFixed(2)}</td>
                  <td className="text-right">{m.totals.bankafstort.toFixed(2)}</td>
                  <td className="text-right">{m.totals.kasUitgaven.toFixed(2)}</td>
                  <td className="text-right">{m.totals.pin.toFixed(2)}</td>
                  <td className="text-right">{m.totals.cash.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="panel-dark">
        <div className="font-semibold mb-2">Totaal {quarter}e kwartaal {yearNum}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-slate-300">BTW 21%</div>
            <div>&euro;{report.totals.btw21.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">BTW 9%</div>
            <div>&euro;{report.totals.btw9.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">Af te dragen BTW</div>
            <div className="font-semibold">&euro;{report.teBetalenBtw.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">Omzet excl. BTW</div>
            <div>&euro;{report.totals.exclBtw.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">Omzet incl. BTW</div>
            <div>&euro;{report.totals.inclBtw.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">Kasuitgaven</div>
            <div>&euro;{report.totals.kasUitgaven.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">Bankafstort</div>
            <div>&euro;{report.totals.bankafstort.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-300">PIN</div>
            <div>&euro;{report.totals.pin.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
