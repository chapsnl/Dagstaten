import { getYearOverview } from "@/lib/repo/report";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export default async function JaarPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = Number(year);
  const overview = await getYearOverview(yearNum);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Jaaroverzicht {yearNum}</h1>
          <p className="page-subtitle">Inkomsten en uitgaven per kwartaal, DD en EA samen</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/jaar/${yearNum - 1}`} className="btn">
            &larr; {yearNum - 1}
          </Link>
          <Link href={`/jaar/${yearNum + 1}`} className="btn">
            {yearNum + 1} &rarr;
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="panel-highlight flex flex-wrap gap-8">
        <div>
          <div className="text-emerald-100 text-sm">Omzet incl. BTW</div>
          <div className="text-2xl font-semibold">&euro;{overview.totals.inclBtw.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-emerald-100 text-sm">Af te dragen BTW (jaartotaal)</div>
          <div className="text-2xl font-semibold">&euro;{overview.totals.teBetalenBtw.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-emerald-100 text-sm">Kasuitgaven</div>
          <div className="text-2xl font-semibold">&euro;{overview.totals.kasUitgaven.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        <table className="fin">
          <thead>
            <tr>
              <th>Kwartaal</th>
              <th>Omzet excl. BTW</th>
              <th>Omzet incl. BTW</th>
              <th>BTW te betalen</th>
              <th>Kasuitgaven</th>
              <th>Bankafstort</th>
              <th>PIN</th>
              <th>Kassaldo einde</th>
            </tr>
          </thead>
          <tbody>
            {overview.quarters.map((q) => (
              <tr key={q.quarter}>
                <td>
                  <Link href={`/kwartaal/${yearNum}/${q.quarter}`} className="underline">
                    {q.quarter}e kwartaal
                  </Link>
                </td>
                <td className="text-right">{q.exclBtw.toFixed(2)}</td>
                <td className="text-right">{q.inclBtw.toFixed(2)}</td>
                <td className="text-right">{q.teBetalenBtw.toFixed(2)}</td>
                <td className="text-right">{q.kasUitgaven.toFixed(2)}</td>
                <td className="text-right">{q.bankafstort.toFixed(2)}</td>
                <td className="text-right">{q.pin.toFixed(2)}</td>
                <td className="text-right">{q.kasEindstand !== null ? q.kasEindstand.toFixed(2) : "-"}</td>
              </tr>
            ))}
            <tr className="font-semibold bg-slate-50">
              <td>Totaal {yearNum}</td>
              <td className="text-right">{overview.totals.exclBtw.toFixed(2)}</td>
              <td className="text-right">{overview.totals.inclBtw.toFixed(2)}</td>
              <td className="text-right">{overview.totals.teBetalenBtw.toFixed(2)}</td>
              <td className="text-right">{overview.totals.kasUitgaven.toFixed(2)}</td>
              <td className="text-right">{overview.totals.bankafstort.toFixed(2)}</td>
              <td className="text-right">{overview.totals.pin.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="card card-body">
          <div className="text-slate-500">Kassaldo begin {yearNum}</div>
          <div className="text-xl font-semibold">&euro;{overview.kasStart.toFixed(2)}</div>
        </div>
        <div className="card card-body">
          <div className="text-slate-500">Kassaldo einde {yearNum}</div>
          <div className="text-xl font-semibold">
            {overview.kasEinde !== null ? `\u20ac${overview.kasEinde.toFixed(2)}` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
