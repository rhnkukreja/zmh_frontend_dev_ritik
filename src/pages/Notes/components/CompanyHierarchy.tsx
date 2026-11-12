import React, { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/stores/hooks";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";

interface CompanyHierarchyProps {
  selectedCompany: string;
  setSelectedCompany: React.Dispatch<React.SetStateAction<string>>;
  selectedInstitution: string;
  setSelectedInstitution: React.Dispatch<React.SetStateAction<string>>;
}

const HierarchySkeleton = () => (
  <div className="flex h-full flex-col bg-white">
    <div className="border-b border-slate-200 bg-white px-4 py-4">
      <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-3 py-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="flex items-center justify-between p-4">
            <div
              className="h-4 animate-pulse rounded bg-slate-200"
              style={{ width: `${60 + ((index % 3) + 1) * 8}%` }}
            />
            <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
          </div>
          {index === 1 && (
            <div className="ml-6 space-y-2 border-l border-gray-100 px-4 pb-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          )}
        </div>
      ))}
      <div className="flex min-h-[110px] flex-1 flex-col justify-between rounded-lg border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="ml-6 space-y-2 border-l border-gray-100 px-4 py-1">
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  </div>
);

const CompanyHierarchy: React.FC<CompanyHierarchyProps> = ({
  selectedCompany,
  setSelectedCompany,
  selectedInstitution,
  setSelectedInstitution,
}) => {
  const { companyHierarchy, loadingCompanyHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );
  const [searchTerm, setSearchTerm] = useState("");

  const investorRows = useMemo(
    () =>
      (companyHierarchy || []).flatMap((company) =>
        Object.keys(company.sub_heading || {}).map((institutionName) => ({
          companyName: company.main_heading,
          institutionName,
        }))
      ),
    [companyHierarchy]
  );

  const filteredInvestors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return investorRows;

    return investorRows.filter(({ institutionName }) =>
      institutionName.toLowerCase().includes(normalizedSearch)
    );
  }, [investorRows, searchTerm]);

  const handleInstitutionClick = (companyName: string, institutionName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstitution(institutionName);
  };

  useEffect(() => {
    if (!investorRows.length) return;

    const selectedRow = investorRows.find(
      ({ companyName, institutionName }) =>
        companyName === selectedCompany && institutionName === selectedInstitution
    );
    const nextRow = selectedRow || investorRows[0];

    if (selectedCompany !== nextRow.companyName) {
      setSelectedCompany(nextRow.companyName);
    }
    if (selectedInstitution !== nextRow.institutionName) {
      setSelectedInstitution(nextRow.institutionName);
    }
  }, [
    investorRows,
    selectedCompany,
    selectedInstitution,
    setSelectedCompany,
    setSelectedInstitution,
  ]);

  if (loadingCompanyHierarchy) {
    return <HierarchySkeleton />;
  }

  if (!investorRows.length) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6">
        <span className="text-sm font-medium text-slate-500">No institutions found</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search institutions..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Lucide
            icon="Search"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform"
            >
              <Lucide icon="X" className="h-4 w-4 text-slate-400 transition hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {filteredInvestors.length > 0 ? (
          <div className="pb-3">
            {filteredInvestors.map(({ companyName, institutionName }) => {
              const isSelected =
                selectedCompany === companyName && selectedInstitution === institutionName;

              return (
                <button
                  key={`${companyName}-${institutionName}`}
                  type="button"
                  className={clsx(
                    "flex w-full cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                    isSelected && "border-l-4 border-l-primary bg-rose-50/70 pl-3"
                  )}
                  onClick={() => handleInstitutionClick(companyName, institutionName)}
                >
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-800">
                    {institutionName}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-sm font-medium text-slate-500">
            No institutions found
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHierarchy;
