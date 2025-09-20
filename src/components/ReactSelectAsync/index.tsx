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
}

const fetchOptions = async (
  inputValue: string,
  isInstitution?: boolean,
  companyGlobalSearchName?: string,
  exactUrl?: string,
  arrayKeyName?: string,
  isHideCurrentCompany?: boolean,
  currentCompany?: string,
  currentFilters?: any
): Promise<OptionType[]> => {

  try {
    const response = isInstitution
      ? await dashboardService.fetchInstitutionByName(
          inputValue,
          companyGlobalSearchName
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
}) => {
  const [inputValue, setInputValue] = useState("");
  const [defaultOptions, setDefaultOptions] = useState<OptionType[]>([]);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const loadOptions = useCallback(
    _.debounce(
      (inputValue: string, callback: (options: OptionType[]) => void) => {
        fetchOptions(
          inputValue,
          isInstitution,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName,
          isHideCurrentCompany,
          currentCompany,
          currentFilters
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
    ]
  );

  useEffect(() => {
    const fetchDefaultOptions = async () => {
      try {
        setIsLoadingDefault(true);
        const options = await fetchOptions(
          "a",
          isInstitution,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName,
          isHideCurrentCompany,
          currentCompany,
          currentFilters
        );
        setDefaultOptions(options);
      } catch (error) {
        console.error("Error fetching default options:", error);
        setDefaultOptions([]); // Set empty array on error
      } finally {
        setIsLoadingDefault(false);
      }
    };

    // Only fetch default options on initial load, not when currentFilters change
    if (defaultOptions.length === 0 && isLoadingDefault) {
      fetchDefaultOptions();
    }
}, []);
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
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '42px',
      width: '100%',
      maxWidth: '100%',
      borderColor: state.isFocused ? '#800000' : '#e2e8f0',
      boxShadow: state.isFocused ? '0 0 0 1px #800000' : 'none',
      '&:hover': {
        borderColor: '#800000',
      },
    }),
    input: (provided: any) => ({
      ...provided,
      minWidth: '100px', // Ensures input doesn't shrink too much
      width: 'auto', // Allows input to grow
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '2px 8px',
      flexWrap: 'wrap',
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
