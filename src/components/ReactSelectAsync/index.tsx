import React, { useState, useCallback } from "react";
import AsyncSelect from "react-select/async";
import _ from "lodash";
import { dashboardService } from "@/services/dashboard";

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
  onChange: (selectedOption: OptionType | null) => void;
}

const fetchOptions = async (inputValue: string): Promise<OptionType[]> => {
  try {
    const response = await dashboardService.fetchCompanyByName(inputValue);
    console.log({ response }); 
    return response.results.map((company: CompanyData) => ({
      value: company.id,
      label: company.name,
    }));
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

const CompanySelect: React.FC<CompanySelectProps> = ({ value, onChange }) => {
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

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    return newValue;
  };

  return (
    <AsyncSelect
      cacheOptions
      loadOptions={loadOptions}
      defaultOptions={false} 
      placeholder="Select Company"
      onInputChange={handleInputChange}
      inputValue={inputValue}
      value={value}
      onChange={onChange} 
      
    />
  );
};

export default CompanySelect;
