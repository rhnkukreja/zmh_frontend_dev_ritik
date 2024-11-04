import React, { useState, useCallback } from "react";
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
}

const fetchOptions = async (inputValue: string): Promise<OptionType[]> => {
  try {
    const response = await dashboardService.fetchCompanyByName(inputValue);

    return response.results.map((company: CompanyData) => ({
      value: company.id,
      label: company.name,
    }));
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
}) => {
  const [inputValue, setInputValue] = useState("");

  const loadOptions = useCallback(
    _.debounce(
      (inputValue: string, callback: (options: OptionType[]) => void) => {
        fetchOptions(inputValue).then((options) => {
          callback(options);
        });
      },
      300
    ),
    []
  );

  const onChangeSelect = (newValue: MultiValue<OptionType>) => {
    onChange(newValue as OptionType[]);
  };
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    return newValue;
  };

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
      cacheOptions
      styles={customStyles}
      isMulti={isMulti}
      loadOptions={loadOptions}
      defaultOptions={false}
      placeholder="Select Company"
      onInputChange={handleInputChange}
      inputValue={inputValue}
      value={value}
      className={className}
      onChange={onChangeSelect}
      menuPortalTarget={document.body}
    />
  );
};

export default CompanySelect;
