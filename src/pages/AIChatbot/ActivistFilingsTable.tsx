import React, { useEffect, useMemo, useRef, useState } from "react";
import Lucide from "@/components/Base/Lucide";

// ─── Form-family buckets ────────────────────────────────────────────────────

const OWNERSHIP_FORMS = new Set(
  [
    "SC 13D", "SCHEDULE 13D", "SC 13D/A", "SCHEDULE 13D/A",
    "SC 13G", "SCHEDULE 13G", "SC 13G/A", "SCHEDULE 13G/A",
  ].map((s) => s.toUpperCase())
);
const PROXY_CONTEST_FORMS = new Set(
  ["PREC14A", "DEFC14A", "DEFA14A", "DFAN14A", "PRRN14A", "DEFN14A"].map((s) => s.toUpperCase())
);
const ANNUAL_MEETING_FORMS = new Set(
  ["PRE 14A", "DEF 14A", "PRE 14C", "DEF 14C"].map((s) => s.toUpperCase())
);

export type FormBucket = "all" | "ownership" | "proxy_contest" | "annual_meeting";

const FORM_BUCKET_LABELS: Record<Exclude<FormBucket, "all">, string> = {
  ownership: "13D/13G Ownership",
  proxy_contest: "Proxy Contest",
  annual_meeting: "Annual Meeting Proxy",
};

const FORM_BUCKET_ORDER: Exclude<FormBucket, "all">[] = ["ownership", "proxy_contest", "annual_meeting"];

const classifyForm = (form: any): Exclude<FormBucket, "all"> | null => {
  if (!form) return null;
  const normalized = String(form).trim().toUpperCase();
  if (OWNERSHIP_FORMS.has(normalized)) return "ownership";
  if (PROXY_CONTEST_FORMS.has(normalized)) return "proxy_contest";
  if (ANNUAL_MEETING_FORMS.has(normalized)) return "annual_meeting";
  return null;
};

const formatFilingDate = (value: any): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// ─── Per-bucket color coding ────────────────────────────────────────────────
const THEME_MAROON = "#8b1828";

const FORM_BUCKET_TAILWIND_DOT: Record<Exclude<FormBucket, "all">, string> = {
  ownership: "bg-blue-500",
  proxy_contest: "bg-red-800",
  annual_meeting: "bg-slate-400",
};

const FORM_BUCKET_HEX: Record<Exclude<FormBucket, "all">, string> = {
  ownership: "#2563eb",
  proxy_contest: THEME_MAROON,
  annual_meeting: "#94a3b8",
};

// ─── Shared filter state/logic ──────────────────────────────────────────────

export const useActivistFilingsFilters = (filings: any[]) => {
  const list = Array.isArray(filings) ? filings : [];
  const [formBucket, setFormBucket] = useState<FormBucket>("all");
  const [company, setCompany] = useState<string>("all");

  const companyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    list.forEach((f: any) => {
      const name = f?.reporting_for;
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);

  // Scoped to the currently-selected company (but NOT the form bucket) so the

  const companyFilteredList = useMemo(() => {
    if (company === "all") return list;
    return list.filter((f: any) => f?.reporting_for === company);
  }, [list, company]);

  const formBucketCounts = useMemo(() => {
    const counts: Record<Exclude<FormBucket, "all">, number> = { ownership: 0, proxy_contest: 0, annual_meeting: 0 };
    companyFilteredList.forEach((f: any) => {
      const bucket = classifyForm(f?.form);
      if (bucket) counts[bucket] += 1;
    });
    return counts;
  }, [companyFilteredList]);

  const filteredFilings = useMemo(() => {
    return list.filter((f: any) => {
      if (formBucket !== "all" && classifyForm(f?.form) !== formBucket) return false;
      if (company !== "all" && f?.reporting_for !== company) return false;
      return true;
    });
  }, [list, formBucket, company]);

  return {
    formBucket,
    setFormBucket,
    company,
    setCompany,
    companyOptions,
    formBucketCounts,
    totalCount: companyFilteredList.length,
    filteredFilings,
  };
};

// ─── Company filter dropdown ────────────────────────────────────────────────
const CompanyFilterDropdown = ({
  variant,
  company,
  setCompany,
  companyOptions,
}: {
  variant: "tailwind" | "inline";
  company: string;
  setCompany: (name: string) => void;
  companyOptions: { name: string; count: number }[];
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectOption = (name: string) => {
    setCompany(name);
    setOpen(false);
  };

  const label = company === "all" ? "All Companies" : company;

  if (variant === "tailwind") {
    return (
      <div className="relative ml-auto" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 bg-white max-w-[200px]"
        >
          <span className="truncate">{label}</span>
          <Lucide
            icon="ChevronDown"
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 min-w-[200px] max-w-[280px] max-h-[336px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-30 py-1">
            <button
              type="button"
              onClick={() => selectOption("all")}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm border-b border-slate-100 ${
                company === "all" ? "bg-red-50 text-red-800 font-semibold" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate font-medium">All Companies</span>
              <Lucide
                icon="Check"
                className={`w-3.5 h-3.5 shrink-0 text-red-800 ${company === "all" ? "opacity-100" : "opacity-0"}`}
              />
            </button>
            {companyOptions.map(({ name, count }) => (
              <button
                key={name}
                type="button"
                onClick={() => selectOption(name)}
                className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm ${
                  company === name ? "bg-red-50" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`truncate min-w-0 font-medium ${
                    company === name ? "text-red-800 font-semibold" : "text-slate-700"
                  }`}
                >
                  {name}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-400">({count})</span>
                  <Lucide
                    icon="Check"
                    className={`w-3.5 h-3.5 text-red-800 ${company === name ? "opacity-100" : "opacity-0"}`}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── inline variant ───────────────────────────────────────────────────────

  const optionContainerStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 14,
    background: active ? "#fdf2f4" : "transparent",
    border: "none",
    cursor: "pointer",
    minWidth: 0,
  });

  const optionNameStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    fontWeight: active ? 600 : 500,
    color: active ? THEME_MAROON : "#374151",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const optionCountStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#94a3b8",
    flexShrink: 0,
  };

  const CheckIcon = ({ active }: { active: boolean }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={THEME_MAROON}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: active ? 1 : 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const optionHoverProps = (active: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "#fdf2f4";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = active ? "#fdf2f4" : "transparent";
    },
  });

  return (
    <div style={{ position: "relative", marginLeft: "auto" }} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "5px 8px",
          color: "#111827",
          background: "#fff",
          maxWidth: 200,
          cursor: "pointer",
        }}
      >
        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            minWidth: 200,
            maxWidth: 280,
            maxHeight: 336,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            zIndex: 30,
            padding: "4px 0",
          }}
        >
          <button
            type="button"
            onClick={() => selectOption("all")}
            style={{ ...optionContainerStyle(company === "all"), borderBottom: "1px solid #f1f5f9" }}
            {...optionHoverProps(company === "all")}
          >
            <span style={optionNameStyle(company === "all")}>All Companies</span>
            <CheckIcon active={company === "all"} />
          </button>
          {companyOptions.map(({ name, count }) => (
            <button
              key={name}
              type="button"
              onClick={() => selectOption(name)}
              style={optionContainerStyle(company === name)}
              {...optionHoverProps(company === name)}
            >
              <span style={optionNameStyle(company === name)}>{name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={optionCountStyle}>({count})</span>
                <CheckIcon active={company === name} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Presentational table ───────────────────────────────────────────────────

const ActivistFilingsTable = ({
  filings,
  variant,
}: {
  filings: any[];
  variant: "tailwind" | "inline";
}) => {
  const {
    formBucket,
    setFormBucket,
    company,
    setCompany,
    companyOptions,
    formBucketCounts,
    totalCount,
    filteredFilings,
  } = useActivistFilingsFilters(filings);

  if (totalCount === 0) {
    return variant === "tailwind" ? (
      <p className="text-sm text-slate-500 m-0">No activist filings found in the last 5 years.</p>
    ) : (
      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No activist filings found in the last 5 years.</p>
    );
  }

  if (variant === "tailwind") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFormBucket("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              formBucket === "all"
                ? "bg-red-800 text-white border-red-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({totalCount})
          </button>
          {FORM_BUCKET_ORDER.map((bucket) => {
            const isEmpty = formBucketCounts[bucket] === 0;
            return (
              <button
                key={bucket}
                type="button"
                onClick={() => setFormBucket(bucket)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  formBucket === bucket
                    ? "bg-red-800 text-white border-red-800"
                    : isEmpty
                    ? "bg-white text-slate-400 border-slate-100 opacity-60 hover:opacity-100"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {FORM_BUCKET_LABELS[bucket]} ({formBucketCounts[bucket]})
              </button>
            );
          })}

          <CompanyFilterDropdown
            variant="tailwind"
            company={company}
            setCompany={setCompany}
            companyOptions={companyOptions}
          />
        </div>

        <p className="text-xs text-slate-500 m-0">
          {filteredFilings.length} of {totalCount} filings
        </p>

        {filteredFilings.length > 0 ? (
          <div className="overflow-x-auto overflow-y-auto border border-slate-200 rounded-md max-h-[480px]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-red-50">
                <tr className="bg-red-50 border-b border-red-100 text-xs uppercase tracking-wide text-red-800">
                  <th className="px-3 py-2 font-bold">Form &amp; File</th>
                  <th className="px-3 py-2 font-bold">Filed</th>
                  <th className="px-3 py-2 font-bold">Company</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilings.map((f: any, i: number) => {
                  const bucket = classifyForm(f?.form);
                  return (
                    <tr
                      key={f.accession || i}
                      className={`border-b border-slate-100 last:border-0 align-top hover:bg-red-50/40 transition-colors ${
                        i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                              bucket ? FORM_BUCKET_TAILWIND_DOT[bucket] : "bg-slate-300"
                            }`}
                            aria-hidden="true"
                          />
                          <div>
                            {f.url ? (
                              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-semibold hover:underline">
                                {f.form || "Filing"}
                              </a>
                            ) : (
                              <span className="font-semibold text-slate-900">{f.form || "Filing"}</span>
                            )}
                            {f.file_num && <div className="text-xs text-slate-400 mt-0.5">{f.file_num}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatFilingDate(f.filing_date)}</td>
                      <td
                        className="px-3 py-2 text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[220px]"
                        title={f.reporting_for}
                      >
                        {f.reporting_for || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 m-0">No filings match the selected filters.</p>
        )}
      </div>
    );
  }

  // ─── inline variant ───────────────────────────────────────────────────────
  const pillStyle = (active: boolean, isEmpty: boolean = false): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${active ? THEME_MAROON : isEmpty ? "#f3f4f6" : "#e5e7eb"}`,
    background: active ? THEME_MAROON : "#fff",
    color: active ? "#fff" : isEmpty ? "#c1c7d0" : "#6b7280",
    cursor: "pointer",
    opacity: !active && isEmpty ? 0.7 : 1,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setFormBucket("all")} style={pillStyle(formBucket === "all")}>
          All ({totalCount})
        </button>
        {FORM_BUCKET_ORDER.map((bucket) => (
          <button
            key={bucket}
            type="button"
            onClick={() => setFormBucket(bucket)}
            style={pillStyle(formBucket === bucket, formBucketCounts[bucket] === 0)}
          >
            {FORM_BUCKET_LABELS[bucket]} ({formBucketCounts[bucket]})
          </button>
        ))}

        <CompanyFilterDropdown
          variant="inline"
          company={company}
          setCompany={setCompany}
          companyOptions={companyOptions}
        />
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
        {filteredFilings.length} of {totalCount} filings
      </p>

      {filteredFilings.length > 0 ? (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 480, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 1 }}>
                {[
                  { label: "Form & File", align: "left" },
                  { label: "Filed", align: "left" },
                  { label: "Company", align: "left" },
                ].map((h) => (
                  <th
                    key={h.label}
                    style={{
                      padding: "12px 16px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#6b7280",
                      textAlign: h.align as any,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background: "#fafafa",
                    }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFilings.map((f: any, i: number) => {
                const bucket = classifyForm(f?.form);
                const rowBaseBg = i % 2 === 1 ? "#fafafa" : "#fff";
                return (
                  <tr
                    key={f.accession || i}
                    style={{
                      borderBottom: i !== filteredFilings.length - 1 ? "1px solid #f3f4f6" : "none",
                      verticalAlign: "top",
                      background: rowBaseBg,
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf2f4")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = rowBaseBg)}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span
                          style={{
                            marginTop: 6,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: bucket ? FORM_BUCKET_HEX[bucket] : "#d1d5db",
                          }}
                        />
                        <div>
                          {f.url ? (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: THEME_MAROON, textDecoration: "none", fontWeight: 500 }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              {f.form || "Filing"}
                            </a>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{f.form || "Filing"}</span>
                          )}
                          {f.file_num && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{f.file_num}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{formatFilingDate(f.filing_date)}</td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "#111827",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 220,
                      }}
                      title={f.reporting_for}
                    >
                      {f.reporting_for || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No filings match the selected filters.</p>
      )}
    </div>
  );
};

export default ActivistFilingsTable;
