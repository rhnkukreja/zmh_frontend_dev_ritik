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
  symbol?: string;
  company?: any;
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
            symbol: company?.symbol || company?.ticker, // Add symbol/ticker field
            company: company // Add complete company object
          }));
      }
      return response.results.map((company: any) => ({
        value: company?.id ?? company,
        label: company?.name ?? company,
        symbol: company?.symbol || company?.ticker, // Add symbol/ticker field
        company: company // Add complete company object
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
  const [isFocused, setIsFocused] = useState(false);

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
    // Clear input value after selection
    setInputValue("");
  };
  const handleInputChange = (newValue: string) => {
    const safeValue = newValue || "";
    setInputValue(safeValue);
    return safeValue;
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Only clear input if there's no current value or it's an empty array
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setInputValue("");
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Reset input value when blurring if no selection is made
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setInputValue("");
    }
  };

  const handleMenuOpen = () => {
    // Only clear input when menu opens if there's no current value or it's an empty array
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setInputValue("");
    }
  };

  useEffect(() => {
    handleInputChange(setDefaultValue?.label ?? setDefaultValue ?? "");
  }, [setDefaultValue]);

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '42px',
      width: '100%',
      maxWidth: '100%',
      borderColor: state.isFocused ? '#800000' : '#e2e8f0',
      boxShadow: state.isFocused ? '0 0 0 1px #800000' : 'none',
      outline: 'none !important',
      '&:hover': {
        borderColor: '#800000',
      },
      '&:focus': {
        outline: 'none !important',
        boxShadow: '0 0 0 1px #800000'
      },
      '&:focus-within': {
        outline: 'none !important',
        boxShadow: '0 0 0 1px #800000'
      }
    }),
    input: (provided: any) => ({
      ...provided,
      minWidth: '100px', // Ensures input doesn't shrink too much
      width: 'auto', // Allows input to grow
      color: '#374151',
      outline: 'none !important',
      boxShadow: 'none !important',
      border: 'none !important',
      '&::selection': {
        backgroundColor: 'transparent !important',
        color: 'inherit !important'
      },
      '&:focus': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important'
      }
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9CA3AF'
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '2px 8px',
      flexWrap: 'wrap',
      outline: 'none !important',
      boxShadow: 'none !important'
    }),
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
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#800000' // Primary color for selected option
        : state.isFocused 
        ? '#f1f5f9' // Light gray for focused option
        : 'white',
      color: state.isSelected 
        ? 'white' // White text for selected option
        : 'black',
      '&:hover': {
        backgroundColor: state.isSelected ? '#800000' : '#f1f5f9',
        color: state.isSelected ? 'white' : 'black',
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
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMenuOpen={handleMenuOpen}
      inputValue={inputValue} // Show the actual input value
      value={value}
      className={className}
      onChange={onChangeSelect}
      menuPortalTarget={document.body}
      isClearable={isClearable}
      isLoading={isLoadingDefault}
      openMenuOnFocus={true}
      openMenuOnClick={true}
      controlShouldRenderValue={true} // Always render the selected value
    />
  );
};

export default CompanySelect;
