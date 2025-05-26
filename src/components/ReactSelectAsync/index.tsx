import React, { useState, useCallback, useEffect } from "react";
import AsyncSelect from "react-select/async";
import _ from "lodash";
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
}

const fetchOptions = async (
  inputValue: string,
  isInstitution?: boolean,
  companyGlobalSearchName?: string,
  exactUrl?: string,
  arrayKeyName?: string
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
          arrayKeyName
        );

    if (isInstitution) {
      return response.results.map((institution: any) => ({
        value: institution,
        label: institution,
      }));
    } else {
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
}) => {
  const [inputValue, setInputValue] = useState("");
   const [ defaultOptions, setDefaultOptions] = useState([])

  const loadOptions = useCallback(
    _.debounce(
      (inputValue: string, callback: (options: OptionType[]) => void) => {
        fetchOptions(
          inputValue,
          isInstitution,
          companyGlobalSearchName,
          exactUrl,
          arrayKeyName
        ).then((options) => {
          callback(options);
         
        });
      },
      300
    ),
    [companyGlobalSearchName]
  );
useEffect(() => {
  const fetchDefaultOptions = async () => {
    try {
      const options = await fetchOptions(
        "a",
        isInstitution,
        companyGlobalSearchName,
        exactUrl,
        arrayKeyName
      );
      setDefaultOptions(options);

    } catch (error) {
      console.error("Error fetching default options:", error);
    }
  };

  fetchDefaultOptions();
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
      defaultOptions={defaultOptions?.length ?  defaultOptions?.slice(0,5) : false}
      placeholder={
        placeholder
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
    />
  );
};

export default CompanySelect;
