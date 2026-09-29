import React, { useState, useEffect, useMemo } from "react";
import AsyncSelect from "react-select/async";
import _ from "lodash";
import { dashboardService } from "@/services/dashboard";
import { MultiValue } from "react-select";

interface CompanyData {
  id: number;
  name: string;
}

interface OptionType {
  value: any;
  label: string;
  symbol?: string;
  company?: any;
}

const normalizeCompanyResults = (response: any): any[] => {
  const payload = response?.results ?? response;

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => (Array.isArray(item) ? item : [item]));
  }

  if (Array.isArray(payload?.company)) {
    return payload.company.flatMap((item: any) => (Array.isArray(item) ? item : [item]));
  }

  if (Array.isArray(payload?.companies)) {
    return payload.companies.flatMap((item: any) => (Array.isArray(item) ? item : [item]));
  }

  if (Array.isArray(payload?.company_name)) {
    return payload.company_name.flatMap((item: any) => (Array.isArray(item) ? item : [item]));
  }

  if (typeof payload?.company === "string") {
    return [payload.company];
  }

  if (typeof payload?.company_name === "string") {
    return [payload.company_name];
  }

  return [];
};

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
  showDefaultOptions?: boolean;
  hideDropdownIndicator?: boolean;
  includeSelectAllOption?: boolean;
  selectAllLabel?: string;
}

const fetchOptions = async (
  inputValue: string,
  isInstitution?: boolean,
  includeSelectAllOption?: boolean,
  selectAllLabel?: string,
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
      const institutionOptions = response.results.map((institution: any) => ({
        value: institution,
        label: institution,
      }));

      const selectAllOption: OptionType = {
        value: '__select_all__',
        label: selectAllLabel || 'Select All',
      };

      return includeSelectAllOption
        ? [selectAllOption, ...institutionOptions]
        : institutionOptions;
    } else {
      const companyResults = normalizeCompanyResults(response)
        .map((company: any) => {
          if (typeof company === "string") {
            return {
              value: company,
              label: company,
              symbol: undefined,
              company,
            };
          }

          return {
            value:
              company?.id ??
              company?.name ??
              company?.company_name ??
              company?.company ??
              company?.company_v1 ??
              company,
            label:
              company?.name ??
              company?.company_name ??
              company?.company ??
              company?.company_v1 ??
              company?.label ??
              company,
            symbol: company?.symbol || company?.ticker,
            company,
          };
        })
        .filter((company: OptionType) => Boolean(company.label));

      if (isHideCurrentCompany && currentCompany) {
        return companyResults.filter(
          (company: OptionType) => company.label !== currentCompany
        );
      }

      return companyResults;
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
  showDefaultOptions = true,
  hideDropdownIndicator = false,
  includeSelectAllOption = false,
  selectAllLabel,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [defaultOptions, setDefaultOptions] = useState<OptionType[]>([]);
  const [isLoadingDefault, setIsLoadingDefault] = useState(showDefaultOptions);
  const [isFocused, setIsFocused] = useState(false);

  const loadOptions = useMemo(
    () =>
      _.debounce(
        (inputValue: string, callback: (options: OptionType[]) => void) => {
          const trimmedValue = inputValue.trim();

          if (trimmedValue.length < 1) {
            callback([]);
            return;
          }

          // Always ensure year parameter is included for NPX-related components
          const yearParam = year ||
            (window.location.search.includes('year=') ?
              new URLSearchParams(window.location.search).get('year') :
              '2024');

          fetchOptions(
            trimmedValue,
            isInstitution,
            includeSelectAllOption,
            selectAllLabel,
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
        450
      ),
    [
      companyGlobalSearchName,
      isInstitution,
      includeSelectAllOption,
      selectAllLabel,
      exactUrl,
      arrayKeyName,
      isHideCurrentCompany,
      currentCompany,
      currentFilters,
      year,
    ]
  );

  useEffect(() => {
    return () => {
      loadOptions.cancel();
    };
  }, [loadOptions]);

  useEffect(() => {
    if (!showDefaultOptions) {
      setDefaultOptions([]);
      setIsLoadingDefault(false);
      return;
    }

    const fetchDefaultOptions = async () => {
      try {
        setIsLoadingDefault(true);
        const yearParam = year || 
                         (window.location.search.includes('year=') ? 
                          new URLSearchParams(window.location.search).get('year') : 
                          '2024');
        const options = await fetchOptions(
          "a",
          isInstitution,
          includeSelectAllOption,
          selectAllLabel,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName,
          isHideCurrentCompany,
          currentCompany,
          currentFilters,
          yearParam
        );
        setDefaultOptions(options);
      } catch (error) {
        console.error("Error fetching default options:", error);
        setDefaultOptions([]);
      } finally {
        setIsLoadingDefault(false);
      }
    };

    fetchDefaultOptions();
  }, [companyGlobalSearchName, year, showDefaultOptions, isInstitution, includeSelectAllOption, selectAllLabel, exactUrl, arrayKeyName, isHideCurrentCompany, currentCompany, currentFilters]);
  const onChangeSelect = (newValue: MultiValue<OptionType> | OptionType | null) => {
    onChange(newValue as OptionType | OptionType[] | null);
    // Clear input value after selection
    setInputValue("");
  };
  const handleInputChange = (newValue: string, actionMeta?: { action?: string }) => {
    const safeValue = newValue || "";

    if (actionMeta?.action && actionMeta.action !== "input-change") {
      if (
        actionMeta.action === "set-value" ||
        actionMeta.action === "menu-close" ||
        actionMeta.action === "input-blur"
      ) {
        setInputValue("");
        return "";
      }

      return inputValue;
    }

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

  const resolvedDefaultOptions = showDefaultOptions
    ? (isLoadingDefault ? true : (defaultOptions?.length ? defaultOptions?.slice(0, 5) : false))
    : (isInstitution && includeSelectAllOption
      ? [{ value: '__select_all__', label: selectAllLabel || 'Select All' }]
      : false);

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
      cacheOptions
      loadOptions={loadOptions}
      defaultOptions={resolvedDefaultOptions}
      placeholder={
        showDefaultOptions && isLoadingDefault 
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
      isLoading={showDefaultOptions ? isLoadingDefault : false}
      openMenuOnFocus={true}
      openMenuOnClick={true}
      controlShouldRenderValue={true} // Always render the selected value
      noOptionsMessage={() => (inputValue && inputValue.length > 0 ? 'No options' : 'Type to search')}
      components={hideDropdownIndicator ? { DropdownIndicator: () => null, IndicatorSeparator: () => null } : undefined}
    />
  );
};

export default CompanySelect;
