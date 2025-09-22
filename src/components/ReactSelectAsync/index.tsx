import React, { useState, useCallback, useEffect } from "react";
import AsyncSelect from "react-select/async";
import _, { remove } from "lodash";
import { dashboardService } from "@/services/dashboard";
import { MultiValue } from "react-select";

interface CompanyData {
  id: number;
  name: string;
}

interface OptionType {
  value: number;
  label: string;
}

interface CompanySelectProps {
  value: any;
  onChange: (selectedOption: OptionType | OptionType[] | null) => void;
  isMulti?: boolean;
  className?: string;
  setDefaultValue?: any;
  isInstitution?: boolean;
  placeholder?: string;
  companyGlobalSearchName?: string;
  isClearable?: boolean;
  exactUrl?: string;
  arrayKeyName?: string;
  isHideCurrentCompany?: boolean;
  currentCompany?: string;
  currentFilters?: any;
  year?: string; // Add year parameter
}

const fetchOptions = async (
  inputValue: string,
  isInstitution?: boolean,
  companyGlobalSearchName?: string,
  exactUrl?: string,
  arrayKeyName?: string,
  isHideCurrentCompany?: boolean,
  currentCompany?: string,
  currentFilters?: any,
  year?: string
): Promise<OptionType[]> => {
  // Always ensure year parameter is included
  const yearParam = year || 
                   (window.location.search.includes('year=') ? 
                    new URLSearchParams(window.location.search).get('year') : 
                    '2024');
  
  try {
    const response = isInstitution
      ? await dashboardService.fetchInstitutionByName(
          inputValue,
          companyGlobalSearchName,
          yearParam // Always pass year parameter
        )
      : await dashboardService.fetchCompanyByName(
          inputValue,
          exactUrl,
          arrayKeyName,
          currentFilters
        );

    if (isInstitution) {
      return response.results.map((institution: any) => ({
        value: institution,
        label: institution,
      }));
    } else {
      if (isHideCurrentCompany && currentCompany) {
        return response.results
          .filter((company: any) => company.name !== currentCompany)
          .map((company: any) => ({
            value: company?.id ?? company,
            label: company?.name ?? company,
          }));
      }
      return response.results.map((company: any) => ({
        value: company?.id ?? company,
        label: company?.name ?? company,
      }));
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

const CompanySelect: React.FC<CompanySelectProps> = ({
  value,
  onChange,
  isMulti = false,
  className,
  setDefaultValue,
  isInstitution = false,
  placeholder = "",
  companyGlobalSearchName = "",
  isClearable,
  exactUrl,
  arrayKeyName,
  isHideCurrentCompany = false,
  currentCompany = "",
  currentFilters,
  year,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [defaultOptions, setDefaultOptions] = useState<OptionType[]>([]);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const loadOptions = useCallback(
    _.debounce(
      (inputValue: string, callback: (options: OptionType[]) => void) => {
        // Always ensure year parameter is included for NPX-related components
        const yearParam = year || 
                         (window.location.search.includes('year=') ? 
                          new URLSearchParams(window.location.search).get('year') : 
                          '2024');
                          
        fetchOptions(
          inputValue,
          isInstitution,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName,
          isHideCurrentCompany,
          currentCompany,
          currentFilters,
          yearParam // Always pass year parameter
        ).then((options) => {
          callback(options);
        });
      },
      300
    ),
    [
      companyGlobalSearchName,
      isInstitution,
      exactUrl,
      arrayKeyName,
      isHideCurrentCompany,
      currentCompany,
      currentFilters,
      // Always include year in dependencies
      year
    ]
  );

  useEffect(() => {
    const fetchDefaultOptions = async () => {
      try {
        setIsLoadingDefault(true);
        // Always ensure year parameter is included for NPX-related components
        const yearParam = year || 
                         (window.location.search.includes('year=') ? 
                          new URLSearchParams(window.location.search).get('year') : 
                          '2024');
                          
        const options = await fetchOptions(
          "a",
          isInstitution,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName,
          isHideCurrentCompany,
          currentCompany,
          currentFilters,
          yearParam // Always pass year parameter
        );
        setDefaultOptions(options);
      } catch (error) {
        console.error("Error fetching default options:", error);
        setDefaultOptions([]); // Set empty array on error
      } finally {
        setIsLoadingDefault(false);
      }
    };

    // Fetch options when component mounts or when critical props change
    fetchDefaultOptions();
    
  }, [
    // Always include companyGlobalSearchName and year in dependencies
    companyGlobalSearchName,
    year
  ]); // Refresh options when company or year changes
  const onChangeSelect = (newValue: MultiValue<OptionType>) => {
    onChange(newValue as OptionType[]);
  };
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    return newValue;
  };

  useEffect(() => {
    handleInputChange(setDefaultValue?.label ?? setDefaultValue ?? "");
  }, [setDefaultValue]);

  const customStyles = {
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "#e2e8f0",
      color: "black",
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: "black",
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: "black",
      ":hover": {
        backgroundColor: "#e2e8f0",
        color: "black",
      },
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };


  return (
    <AsyncSelect
      styles={customStyles}
      isMulti={isMulti}
      loadOptions={loadOptions}
      defaultOptions={isLoadingDefault ? true : (defaultOptions?.length ? defaultOptions?.slice(0,5) : false)}
      placeholder={
        isLoadingDefault 
          ? "Loading..." 
          : placeholder
          ? placeholder
          : isInstitution
          ? "Search Institution"
          : "Search Company"
      }
      onInputChange={handleInputChange}
      inputValue={inputValue}
      value={value}
      className={className}
      onChange={onChangeSelect}
      menuPortalTarget={document.body}
      isClearable={isClearable}
      isLoading={isLoadingDefault}
    />
  );
};

export default CompanySelect;
