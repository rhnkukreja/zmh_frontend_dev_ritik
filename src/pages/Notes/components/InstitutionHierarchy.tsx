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
    if (expandedInstitutions.includes(institutionName)) {
      setExpandedInstitutions(expandedInstitutions.filter(name => name !== institutionName));
    } else {
      setExpandedInstitutions([...expandedInstitutions, institutionName]);
    }
  };

  const handleInstitutionClick = (institutionName: string) => {
    setSelectedInstitution(institutionName);
    // Don't reset company selection when clicking on already expanded institution
    if (!expandedInstitutions.includes(institutionName)) {
      setSelectedCompany(""); // Only reset company selection when expanding a new institution
    }
    toggleInstitution(institutionName);
  };

  const handleCompanyClick = (companyName: string) => {
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

  if (loadingInstitutionHierarchy) {
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
                  onClick={() => handleInstitutionClick(institutionName)}
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
                  <div>
                    {companies.map((companyName, companyIndex) => {
                      return (
                        <div
                          key={companyIndex}
                          className={clsx(
                            "flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-transparent",
                            selectedCompany === companyName && selectedInstitution === institutionName 
                              ? "border-b-2 border-primary text-primary bg-gray-50" 
                              : "text-gray-700 hover:text-gray-900"
                          )}
                          onClick={() => handleCompanyClick(companyName)}
                        >
                          <span className="flex-1 font-normal">
                            {companyName}
                          </span>
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
