import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BoardIntelPanel, CompanyHit, searchCompanies } from "./index";

/** SEC writes share classes with a dash (BRK-B); the dashboard may hold BRK.B or BRK/B. */
const secTicker = (ticker: string) => (ticker || "").trim().toUpperCase().replace(/[./]/g, "-");

/** The dashboard's Board Intel tab: the selected company's board intelligence.
 *
 *  The dashboard knows the company by ticker; Board Intel works by SEC CIK. The ticker is
 *  matched EXACTLY against SEC's ticker list -- never the first search hit, which could be a
 *  different company -- and a ticker SEC does not list is said so rather than guessed. */
export default function DashboardBoardIntel({ ticker, name, companyId }: {
  ticker: string; name: string;
  /** the dashboard's company id, for the year-on-year vote support */
  companyId?: number | string;
}) {
  const [company, setCompany] = useState<CompanyHit | null>(null);
  const [state, setState] = useState<"resolving" | "found" | "unmatched" | "error">("resolving");

  useEffect(() => {
    let cancelled = false;
    setCompany(null);
    const wanted = secTicker(ticker);
    if (!wanted) { setState("unmatched"); return; }
    setState("resolving");
    searchCompanies(wanted)
      .then((hits) => {
        if (cancelled) return;
        const match = hits.find((h) => h.ticker === wanted);
        if (match) { setCompany(match); setState("found"); } else setState("unmatched");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [ticker]);

  return (
    <div className="p-5 mt-1 box">
      {state === "resolving" && (
        <div className="flex items-center gap-3 text-sm text-gray-700" role="status">
          <Loader2 size={18} className="animate-spin text-[#931638]" /> Finding {name || ticker} in SEC's company list…
        </div>
      )}
      {state === "unmatched" && (
        <p className="text-sm text-gray-700">
          {name || ticker} ({ticker}) is not in SEC's list of listed companies, so there is no proxy statement to read.
        </p>
      )}
      {state === "error" && (
        <p className="text-sm text-red-700">Could not reach the Board Intelligence service. Please try again shortly.</p>
      )}
      {/* key: a new company starts from a clean panel */}
      {state === "found" && company && <BoardIntelPanel key={company.cik} company={company} autoStart={false} companyId={companyId} />}
    </div>
  );
}
