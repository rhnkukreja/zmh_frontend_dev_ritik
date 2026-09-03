import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/stores/hooks";
import { fetchCompanyHierarchyNotes } from "@/stores/domainNotesSlice";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";
import { CompanyHierarchyItem } from "@/types/domainNotes";
import { domainNotesService } from "@/services/domainNotes";

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
  const dispatch = useAppDispatch();
  const { companyHierarchy, loadingCompanyHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CompanyHierarchyItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies((prev) =>
      prev.includes(companyName)
        ? prev.filter((name) => name !== companyName)
        : [...prev, companyName]
    );
  };

  const handleCompanyClick = (companyName: string) => {
    toggleCompany(companyName);
  };

  const handleInstitutionClick = (companyName: string, institutionName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstitution(institutionName);
  };

  // Search functionality
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        setIsSearching(true);
        try {
          const response = await domainNotesService.getCompanyHierarchyNotes();
          // Filter results based on search term
          const filteredResults = response.results.filter((item: any) =>
            item.main_heading.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setSearchResults(filteredResults);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    dispatch(fetchCompanyHierarchyNotes());
  };

  // Keep the selected company/institution pair valid when the hierarchy reloads or search resets.
  useEffect(() => {
    if (!companyHierarchy?.length || searchTerm.trim().length > 0) {
      return;
    }

    const currentCompany =
      companyHierarchy.find((item) => item.main_heading === selectedCompany) || companyHierarchy[0];
    const companyName = currentCompany.main_heading;
    const institutions = Object.keys(currentCompany.sub_heading || {});
    const nextInstitution =
      institutions.includes(selectedInstitution) ? selectedInstitution : institutions[0] || "";

    if (selectedCompany !== companyName) {
      setSelectedCompany(companyName);
    }

    if (nextInstitution !== selectedInstitution) {
      setSelectedInstitution(nextInstitution);
    }

    setExpandedCompanies((prev) =>
      prev.includes(companyName) ? prev : [...prev, companyName]
    );
  }, [
    companyHierarchy,
    searchTerm,
    selectedCompany,
    selectedInstitution,
    setSelectedCompany,
    setSelectedInstitution,
  ]);

  if (loadingCompanyHierarchy) {
    return <HierarchySkeleton />;
  }

  if (!companyHierarchy || companyHierarchy.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6">
        <span className="text-sm font-medium text-slate-500">No companies found</span>
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
            placeholder="Search companies..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Lucide
            icon="Search"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform"
            >
              <Lucide icon="X" className="h-4 w-4 text-slate-400 transition hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {isSearching ? (
          <HierarchySkeleton />
        ) : (
          <div className="pb-3">
            {(searchTerm ? searchResults : companyHierarchy).map((item: CompanyHierarchyItem, index: number) => {
              const companyName = item.main_heading;
              const isExpanded = expandedCompanies.includes(companyName);
              const institutions = Object.keys(item.sub_heading || {});

              return (
                <div key={index} className="border-b border-slate-100 last:border-b-0">
                  <div
                    className={clsx(
                      "flex cursor-pointer items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50",
                      selectedCompany === companyName && "border-l-4 border-primary bg-rose-50/70 pl-3"
                    )}
                    onClick={() => handleCompanyClick(companyName)}
                  >
                    <div className="flex min-w-0 flex-1 items-center">
                      <span className="text-sm font-semibold leading-5 text-slate-800">
                        {companyName}
                      </span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80">
                      <Lucide
                        icon={isExpanded ? "ChevronDown" : "ChevronRight"}
                        className="h-4 w-4 text-slate-500"
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-6 border-l border-slate-200 bg-slate-50/50 py-2">
                      {institutions.map((institutionName, institutionIndex) => {
                        return (
                          <div
                            key={institutionIndex}
                            className={clsx(
                              "flex cursor-pointer items-center px-3 py-2 text-sm transition-colors hover:bg-white",
                              selectedInstitution === institutionName && selectedCompany === companyName
                                ? "bg-white font-medium text-primary"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                            onClick={() => handleInstitutionClick(companyName, institutionName)}
                          >
                            <Lucide icon="CornerDownRight" className="mr-2 h-4 w-4 text-slate-400" />
                            <span className="flex-1 leading-5">{institutionName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHierarchy;
