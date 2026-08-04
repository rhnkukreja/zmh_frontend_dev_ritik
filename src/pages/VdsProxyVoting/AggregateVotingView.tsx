import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { baseURL } from "@/constant";
import { convertToTitleCase, createDynamicURL } from "@/utils/helper";
import { vdsEuropeanService } from "@/services/vdsEuropean";

const DEFAULT_INSTITUTIONS = ["BlackRock, Inc.", "The Vanguard Group"];
const MAX_INSTITUTIONS = 3;

interface AggregateVotingViewProps {
  companyName: string;
  year: string;
  institutionOptions?: string[];
}

const pickDefaultInstitutions = (options: string[]): string[] => {
  if (!options || options.length === 0) return DEFAULT_INSTITUTIONS;

  const blackrock = options.find((option) => option.toLowerCase().includes("blackrock"));
  const vanguard = options.find((option) => option.toLowerCase().includes("vanguard"));
  const picked = [blackrock, vanguard].filter(Boolean) as string[];

  if (picked.length > 0) return picked;
  return options.slice(0, 2);
};

const AggregateVotingView: React.FC<AggregateVotingViewProps> = ({
  companyName,
  year,
  institutionOptions = [],
}) => {
  const [institutions, setInstitutions] = useState<string[]>(() => pickDefaultInstitutions(institutionOptions));
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [showInstitutionLimitMessage, setShowInstitutionLimitMessage] = useState(false);
  const userChangedInstitutionsRef = useRef(false);
  const limitMessageTimeoutRef = useRef<number | null>(null);

  // Keep the default selection in sync until the user makes an explicit choice.
  useEffect(() => {
    if (userChangedInstitutionsRef.current) return;
    if (!institutionOptions || institutionOptions.length === 0) return;
    setInstitutions(pickDefaultInstitutions(institutionOptions));
  }, [institutionOptions]);

  useEffect(() => {
    if (!companyName || !year || institutions.length === 0) {
      setAnalytics(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const url = createDynamicURL(`${baseURL}/api/proposal-voting-stats/`, {
      investor_company: institutions,
      company_name: [companyName],
      year: [parseInt(year, 10)],
      country: ["USA"],
      page: 1,
    });

    vdsEuropeanService
      .getVDSEuropeanAnalytics(url)
      .then(({ response }) => {
        if (!cancelled) setAnalytics(response);
      })
      .catch((error) => {
        console.warn("Failed to load aggregate voting analytics:", error);
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyName, year, institutions]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const byInstitution = analytics?.by_institution || [];
  const byCompany = Array.isArray(analytics?.by_company) ? analytics.by_company : [];

  const years = useMemo(() => {
    const allYears = new Set<string>();
    byInstitution.forEach((institution: any) => {
      Object.keys(institution.years || {}).forEach((y) => allYears.add(y));
    });
    return Array.from(allYears).sort();
  }, [byInstitution]);

  const hasSummaryData = byInstitution.length > 0 && years.length > 0;

  useEffect(() => {
    if (!byCompany.length) return;

    const nextOpenGroups: { [key: string]: boolean } = {};
    byCompany.forEach((yearEntry: any) => {
      if (!Array.isArray(yearEntry.companies)) return;
      yearEntry.companies.forEach((ele: any) => {
        nextOpenGroups[ele.company_name] = true;
      });
    });

    setOpenGroups(nextOpenGroups);
  }, [byCompany]);

  useEffect(() => {
    return () => {
      if (limitMessageTimeoutRef.current) {
        window.clearTimeout(limitMessageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div className="mb-6 max-w-md">
        <label className="block text-sm font-semibold text-slate-600 mb-1.5">
          Institutions
        </label>
        {showInstitutionLimitMessage && (
          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            Maximum {MAX_INSTITUTIONS} institutions can be selected.
          </div>
        )}
        <MultiSelectDropdown
          data={(institutionOptions.length > 0 ? institutionOptions : institutions).map((option) => ({
            value: option,
            label: option,
            isDisabled: institutions.length >= MAX_INSTITUTIONS && !institutions.includes(option),
          }))}
          placeholder="Select institutions"
          selectedOption={institutions}
          preventRemoveLastItem
          fieldName="institution"
          onChange={(selectedOptions) => {
            if (selectedOptions.length > MAX_INSTITUTIONS) {
              return;
            }

            if (selectedOptions.length === MAX_INSTITUTIONS) {
              setShowInstitutionLimitMessage(true);
              if (limitMessageTimeoutRef.current) {
                window.clearTimeout(limitMessageTimeoutRef.current);
              }
              limitMessageTimeoutRef.current = window.setTimeout(() => {
                setShowInstitutionLimitMessage(false);
              }, 2500);
            } else {
              setShowInstitutionLimitMessage(false);
            }

            userChangedInstitutionsRef.current = true;
            setInstitutions(selectedOptions.map((option) => option.value));
          }}
        />
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`summary-skeleton-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-primary/90 px-4 py-3">
                <div className="h-4 w-40 animate-pulse rounded-full bg-white/35" />
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`row-skeleton-${index}`} className="flex items-center gap-4">
                    <div className="h-4 w-56 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 flex-1 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 flex-1 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !hasSummaryData && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="text-lg">?</span>
          </div>
          <p className="text-sm">No aggregate voting data available for the selected filters.</p>
        </div>
      )}

      {!loading && hasSummaryData && (
        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8">
          <div className="overflow-x-auto">
            <table className="w-full mx-auto rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-primary text-white text-base">
                  <th className="px-6 py-3 text-left font-semibold rounded-tl-2xl rounded-bl-2xl">Summary</th>
                  {byInstitution.map((institution: any, index: number) => (
                    <th
                      key={institution.institution_id}
                      className={clsx(
                        "px-6 py-3 text-center font-semibold",
                        index === byInstitution.length - 1 && "rounded-tr-2xl"
                      )}
                    >
                      {institution.institution_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-700 text-base divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 font-medium">No. of unique companies</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData?.unique_companies ? yearData.unique_companies.toLocaleString() : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">No of proposals</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? yearData.total_proposals.toLocaleString() : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">No. of FOR votes</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? `${yearData.for_votes.toLocaleString()} (${yearData.for_percentage}%)` : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">No. of SPLIT votes</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? `${yearData.split_votes.toLocaleString()} (${yearData.split_percentage}%)` : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">No. of AGAINST/WITHHOLD votes</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? `${yearData.against_votes.toLocaleString()} (${yearData.against_percentage}%)` : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">No. of Abstain votes</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}-abstain`} className="px-6 py-3 text-center">
                          {yearData
                            ? `${(yearData.abstain_votes || 0).toLocaleString()} (${yearData.abstain_percentage || 0}%)`
                            : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">
                    Alignment with management (Votes Cast/Management Recommendation)
                  </td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? yearData.aligned_with_mgmt : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">Alignment percentage</td>
                  {byInstitution.map((institution: any) =>
                    years.map((y) => {
                      const yearData = institution.years?.[y];
                      return (
                        <td key={`${institution.institution_id}-${y}`} className="px-6 py-3 text-center">
                          {yearData ? `${yearData.alignment_percentage}%` : "-"}
                        </td>
                      );
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Meeting-level proposal detail, grouped by company/meeting */}
      {!loading && byCompany.length > 0 && (
        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
          <div className="divide-y divide-gray-100">
            {byCompany.map((yearEntry: any, yearIdx: number) =>
              Array.isArray(yearEntry.companies)
                ? yearEntry.companies.map((ele: any, index: number) => (
                    <div key={ele.company_id || `${yearIdx}-${index}`} className="py-2">
                      <div
                        className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 font-medium text-base"
                        onClick={() => toggleGroup(ele.company_name)}
                      >
                        <span className="text-gray-800">
                          {`${ele.meeting_date} - ${ele.company_name}`}
                          {ele.meeting_type?.trim() && ` (${ele.meeting_type})`}
                        </span>
                        <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                          <Lucide
                            icon={openGroups[ele.company_name] ? "ChevronUp" : "ChevronDown"}
                            className="w-5 h-5"
                          />
                        </button>
                      </div>
                      {openGroups[ele.company_name] && Array.isArray(ele.sample_proposals) && (
                        <div className="mt-2 mb-4 bg-gray-50 overflow-x-auto">
                          <table className="min-w-[1100px] w-full table-auto">
                            <thead>
                              <tr className="bg-primary text-white text-sm">
                                <th className="px-2 py-2 text-center font-semibold w-[8%] max-w-[60px] whitespace-nowrap">No.</th>
                                <th className="px-4 py-2 text-left font-semibold w-[52%] max-w-[600px]">Proposal</th>
                                <th className="px-2 py-2 text-left font-semibold w-[13%] max-w-[100px]">Mgmt Rec</th>
                                <th className="px-2 py-2 text-left font-semibold w-[13%] max-w-[100px]">Vote Cast</th>
                                <th className="px-2 py-2 text-left font-semibold w-[14%] max-w-[120px]">Institution Name</th>
                              </tr>
                            </thead>
                            <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                              {ele.sample_proposals.map((vds: any, vdsIdx: number) => (
                                <React.Fragment key={vds.proposal_id || vdsIdx}>
                                  <tr className="hover:bg-primary/10">
                                    <td className="px-2 py-2 align-middle text-center whitespace-nowrap w-[8%] max-w-[60px]">
                                      {vds?.proposal_num}
                                    </td>
                                    <td className="px-4 py-2 align-middle w-[52%] max-w-[600px]">
                                      {vds?.proposal}
                                    </td>
                                    <td className="px-2 py-2 align-middle whitespace-nowrap w-[13%] max-w-[100px]">
                                      {convertToTitleCase(vds?.mgt_rec)}
                                    </td>
                                    <td className="px-2 py-2 align-middle whitespace-nowrap w-[13%] max-w-[100px]">
                                      <span
                                        className={clsx([
                                          (vds?.vote?.includes("Against") || vds?.vote?.includes("Withhold")) &&
                                            "text-red-700 font-semibold",
                                        ])}
                                      >
                                        {vds?.vote}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 align-middle break-words w-[20%]">
                                      {vds?.institution_name}
                                    </td>
                                  </tr>
                                  {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                    <tr className="bg-gray-50">
                                      <td></td>
                                      <td colSpan={4} className="px-4 py-2">
                                        <div className="text-xs text-gray-600">
                                          <span className="font-semibold text-gray-700">Voting Rationale: </span>
                                          {vds?.notes}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                : null
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AggregateVotingView;
