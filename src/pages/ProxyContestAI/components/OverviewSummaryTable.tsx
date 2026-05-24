import React from "react";

interface OverviewSummaryTableProps {
  summaryData: Record<string, any> | null;
  loading: boolean;
}

type RowDef =
  | { type?: "data";      key: string; label: string; render: (v: any) => React.ReactNode }
  | { type: "separator";  label: string };

const ROW_DEFS: RowDef[] = [
  /* ── Campaigns ─────────────────────────────────────────── */
  { key: "total_campaigns", label: "No. of unique campaigns", render: (v: any) => v ?? "-" },
  /* ── Director nominees ──────────────────────────────────── */
  { type: "separator", label: "Director Nominees" },
  { key: "management_nominees",                    label: "Management nominees",                     render: (v: any) => v ?? "-" },
  { key: "management_nominees_withheld_or_against",label: "Management nominees — withheld / against", render: (v: any) => v ?? "-" },
  { key: "activist_nominees",                      label: "Activist nominees",                       render: (v: any) => v ?? "-" },
  { key: "activist_nominees_supported",            label: "Activist nominees — supported",           render: (v: any) => v ?? "-" },
  /* ── Advisory alignment ─────────────────────────────────── */
  { type: "separator", label: "Advisory Firm Alignment" },
  {
    key: "iss_advisory_alignment",
    label: "ISS — Campaigns where ISS supported activist",
    render: (v: any) => v ? `${v.ratio} (${v.alignment_percentage})` : "-",
  },
  {
    key: "gl_advisory_alignment",
    label: "GL — Campaigns where GL supported activist",
    render: (v: any) => v ? `${v.ratio} (${v.alignment_percentage})` : "-",
  },
];

const OverviewSummaryTable: React.FC<OverviewSummaryTableProps> = ({ summaryData, loading }) => {
  const SKELETON_COLS = 3;

  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-xl animate-pulse">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="bg-primary/30 px-4 py-3 rounded-tl-xl min-w-[200px]">
                <div className="h-4 bg-white/30 rounded w-20" />
              </th>
              {Array.from({ length: SKELETON_COLS }).map((_, i) => (
                <th key={i} className={`bg-primary/30 px-4 py-3 min-w-[160px] ${i === SKELETON_COLS - 1 ? 'rounded-tr-xl' : ''}`}>
                  <div className="h-4 bg-white/30 rounded w-28 mx-auto mb-1" />
                  <div className="h-2.5 bg-white/20 rounded w-36 mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-3 border-b border-slate-100">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                </td>
                {Array.from({ length: SKELETON_COLS }).map((_, i) => (
                  <td key={i} className="px-4 py-3 text-center border-b border-slate-100">
                    <div className="h-3.5 bg-slate-200 rounded w-16 mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!summaryData || Object.keys(summaryData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <span className="text-5xl mb-3">📊</span>
        <p className="text-base font-medium">No summary data available</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  const institutions = Object.keys(summaryData);

  return (
    <div className="w-full overflow-x-auto rounded-xl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="bg-primary text-white text-left px-4 py-3 font-semibold rounded-tl-xl min-w-[200px]">
              Summary
            </th>
            {institutions.map((name, i) => {
              return (
                <th
                  key={name}
                  className={`bg-primary text-white text-center px-4 py-3 font-semibold min-w-[160px] ${
                    i === institutions.length - 1 ? "rounded-tr-xl" : ""
                  }`}
                >
                  {name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROW_DEFS.map((row, rowIdx) => {
            if (row.type === "separator") {
              return (
                <tr key={`sep-${rowIdx}`}>
                  <td
                    colSpan={institutions.length + 1}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-200"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={row.key}
                className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
              >
                <td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">
                  {row.label}
                </td>
                {institutions.map((name) => {
                  const val = summaryData[name]?.[row.key];
                  return (
                    <td
                      key={name}
                      className="px-4 py-3 text-center text-slate-800 border-b border-slate-100"
                    >
                      {row.render(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OverviewSummaryTable;
