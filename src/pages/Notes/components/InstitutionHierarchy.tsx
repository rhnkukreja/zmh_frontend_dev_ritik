import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/stores/hooks";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";
import { InstitutionHierarchyItem } from "@/types/domainNotes";
import { fetchInstitutionHierarchyNotes } from "@/stores/domainNotesSlice";
import { domainNotesService } from "@/services/domainNotes";

interface InstitutionHierarchyProps {
  selectedInstitution: string;
  setSelectedInstitution: React.Dispatch<React.SetStateAction<string>>;
  selectedCompany: string;
  setSelectedCompany: React.Dispatch<React.SetStateAction<string>>;
}

const HierarchySkeleton = () => (
  <div>
    <div className="p-4 border-b border-gray-200">
      <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
    </div>
    <div className="p-3 space-y-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div
              className="h-4 rounded bg-slate-200 animate-pulse"
              style={{ width: `${60 + ((index % 3) + 1) * 8}%` }}
            />
            <div className="h-5 w-5 rounded bg-slate-200 animate-pulse" />
          </div>
          {index === 1 && (
            <div className="px-4 pb-4 ml-6 border-l border-gray-100 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const InstitutionHierarchy: React.FC<InstitutionHierarchyProps> = ({
  selectedInstitution,
  setSelectedInstitution,
  selectedCompany,
  setSelectedCompany,
}) => {
  const dispatch = useAppDispatch();
  const { institutionHierarchy, loadingInstitutionHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );
  const [expandedInstitutions, setExpandedInstitutions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleInstitution = (institutionName: string) => {
    setExpandedInstitutions((prev) =>
      prev.includes(institutionName)
        ? prev.filter((name) => name !== institutionName)
        : [...prev, institutionName]
    );
  };

  const handleInstitutionClick = (institutionName: string, companies: string[]) => {
    const isCurrentlyExpanded = expandedInstitutions.includes(institutionName);
    setSelectedInstitution(institutionName);
    if (!isCurrentlyExpanded && companies.length > 0) {
      setSelectedCompany(companies[0]);
    }
    toggleInstitution(institutionName);
  };

  const handleCompanyClick = (institutionName: string, companyName: string) => {
    setSelectedInstitution(institutionName);
    setSelectedCompany(companyName);
  };

  // Search functionality
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        setIsSearching(true);
        try {
          const response = await domainNotesService.getInstitutionHierarchyNotes();
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
    dispatch(fetchInstitutionHierarchyNotes());
  };

  useEffect(() => {
    if (searchTerm.trim().length > 0 || !institutionHierarchy?.length) {
      return;
    }

    const currentInstitution =
      institutionHierarchy.find((item) => item.main_heading === selectedInstitution) ||
      institutionHierarchy[0];
    const institutionName = currentInstitution.main_heading;
    const companies = Object.keys(currentInstitution.sub_heading || {});

    if (!selectedInstitution) {
      setSelectedInstitution(institutionName);
      setExpandedInstitutions([institutionName]);
    }

    if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0]);
    }
  }, [institutionHierarchy, selectedInstitution, selectedCompany, searchTerm, setSelectedCompany, setSelectedInstitution]);

  if (loadingInstitutionHierarchy) {
    return <HierarchySkeleton />;
  }

  if (!institutionHierarchy || institutionHierarchy.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500">No institutions found</span>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search institutions..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <Lucide 
            icon="Search" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" 
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <Lucide icon="X" className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex justify-center items-center p-8">
          <LoadingIcon
            icon="three-dots"
            className="w-6 h-6 text-primary"
            color="#800000"
          />
        </div>
      ) : (
        <>
          {(searchTerm ? searchResults : institutionHierarchy).map((item: InstitutionHierarchyItem, index: number) => {
            const institutionName = item.main_heading;
            const isExpanded = expandedInstitutions.includes(institutionName);
            const companies = Object.keys(item.sub_heading || {});

            return (
              <div key={index} className="border-b border-gray-200">
                {/* Institution Header */}
                <div
                  className={clsx(
                    "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedInstitution === institutionName && "bg-red-50 border-l-4 border-primary"
                  )}
                  onClick={() => handleInstitutionClick(institutionName, companies)}
                >
                  <div className="flex items-center flex-1">
                    <span className="font-medium text-gray-800">
                      {institutionName}
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8">
                    <Lucide
                      icon={isExpanded ? "ChevronDown" : "ChevronRight"}
                      className="w-5 h-5 text-gray-500"
                    />
                  </div>
                </div>

                {/* Companies List */}
{isExpanded && (
  <div className="ml-6 border-l border-gray-200">
    {companies.map((companyName, companyIndex) => {
      return (
        <div
          key={companyIndex}
          className={clsx(
            "flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors",
            selectedCompany === companyName && selectedInstitution === institutionName 
              ? "text-primary font-medium bg-gray-50"
              : "text-gray-700 hover:text-gray-900"
          )}
          onClick={() => handleCompanyClick(institutionName, companyName)}
        >
          <Lucide icon="CornerDownRight" className="w-4 h-4 mr-2 text-gray-400" />
          <span className="flex-1">{companyName}</span>
        </div>
      );
    })}
  </div>
)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default InstitutionHierarchy;
