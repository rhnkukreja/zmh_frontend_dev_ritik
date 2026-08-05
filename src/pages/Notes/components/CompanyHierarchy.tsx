import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/stores/hooks";
import { fetchCompanyHierarchyNotes } from "@/stores/domainNotesSlice";
import LoadingIcon from "@/components/Base/LoadingIcon";
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
    if (expandedCompanies.includes(companyName)) {
      setExpandedCompanies(expandedCompanies.filter(name => name !== companyName));
    } else {
      setExpandedCompanies([...expandedCompanies, companyName]);
    }
  };

  const handleCompanyClick = (companyName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstitution("");
    toggleCompany(companyName);
  };

  const handleInstitutionClick = (institutionName: string) => {
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

  // Auto-select first company and institution when data loads or when selections are cleared
  useEffect(() => {
    if (companyHierarchy && companyHierarchy.length > 0) {
      const firstCompany = companyHierarchy[0];
      const companyName = firstCompany.main_heading;
      const institutions = firstCompany.sub_headings || [];

      // Always select first company and institution if nothing is selected
      if (!selectedCompany) {
        setSelectedCompany(companyName);
        setExpandedCompanies([companyName]);
      }

      if (!selectedInstitution && institutions.length > 0) {
        setSelectedInstitution(institutions[0]);
      }
    }
  }, [companyHierarchy, selectedCompany, selectedInstitution]);

  if (loadingCompanyHierarchy) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingIcon
          icon="three-dots"
          className="w-10 h-10 text-primary"
          color="#800000"
        />
      </div>
    );
  }

  if (!companyHierarchy || companyHierarchy.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500">No companies found</span>
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
            placeholder="Search companies..."
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
          {(searchTerm ? searchResults : companyHierarchy).map((item: CompanyHierarchyItem, index: number) => {
            const companyName = item.main_heading;
            const isExpanded = expandedCompanies.includes(companyName);
            const institutions = Object.keys(item.sub_heading || {});

            return (
              <div key={index} className="border-b border-gray-200">
                {/* Company Header */}
                <div
                  className={clsx(
                    "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedCompany === companyName && "bg-red-50 border-l-4 border-primary"
                  )}
                  onClick={() => handleCompanyClick(companyName)}
                >
                  <div className="flex items-center flex-1">
                    <span className="font-medium text-gray-800">
                      {companyName}
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8">
                    <Lucide
                      icon={isExpanded ? "ChevronDown" : "ChevronRight"}
                      className="w-5 h-5 text-gray-500"
                    />
                  </div>
                </div>

                {/* Institutions List */}
                {isExpanded && (
                  <div className="ml-6 border-l border-gray-200">
                    {institutions.map((institutionName, institutionIndex) => {
                      return (
                        <div
                          key={institutionIndex}
                          className={clsx(
                            "flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors",
                            selectedInstitution === institutionName && selectedCompany === companyName
                              ? "text-primary font-medium bg-gray-50"
                              : "text-gray-700 hover:text-gray-900"
                          )}
                          onClick={() => handleInstitutionClick(institutionName)}
                        >
                          <Lucide icon="CornerDownRight" className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="flex-1">{institutionName}</span>
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

export default CompanyHierarchy;
