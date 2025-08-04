import React, { useState, useEffect } from "react";
import Select, { components, MultiValue } from "react-select";
import { FormCheck } from "../Form";

interface Option {
  value: string;
  label: string;
  isDisabled?: boolean;
}

interface MultiSelectDropdownProps {
  data: (string | Option)[]; // Can be array of strings or Option objects
  placeholder?: string;
  onChange: (selectedOptions: Option[]) => void;
  loading?: boolean;
  selectedOption?: string[] | Option[] | any; // Can be array of strings or Option objects
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  data,
  placeholder = "Select options...",
  onChange,
  loading = false,
  selectedOption = [], // Default to an empty array
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [showLoading, setShowLoading] = useState<boolean>(loading);

  // Synchronize selected options with the `selectedOption` prop
  useEffect(() => {
    if (Array.isArray(selectedOption)) {
      const formattedSelectedOptions = selectedOption.map((item) => {
        if (typeof item === 'string') {
          return {
            value: item,
            label: item,
          };
        }
        return item;
      });
      setSelectedOptions(formattedSelectedOptions);
    } else {
      setSelectedOptions([]);
    }
  }, [selectedOption]);

  // Format options from the data
  useEffect(() => {
    const formattedOptions = data?.map((item) => {
      if (typeof item === 'string') {
        return {
          value: item,
          label: item,
        };
      }
      return item;
    });
    setOptions(formattedOptions || []);
  }, [data]);

  const handleChange = (selected: MultiValue<Option>) => {
    const newSelectedOptions = selected as Option[];
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions);
  };

  const CustomOption = (props: any) => {
    const { data, isSelected, innerRef, innerProps, isDisabled } = props;

    return (
      <div 
        ref={innerRef} 
        {...innerProps} 
        className={`flex items-center p-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FormCheck className="mr-2">
          <FormCheck.Input 
            className="ml-1" 
            checked={isSelected} 
            type="checkbox" 
            disabled={isDisabled}
          />
        </FormCheck>
        <span className={isDisabled ? 'text-gray-400' : ''}>{data.label}</span>
      </div>
    );
  };

  return (
    <Select
      isMulti
      options={loading ? [] : options}
      value={selectedOptions}
      onChange={handleChange}
      placeholder={showLoading ? "Loading options..." : placeholder}
      hideSelectedOptions={false}
      components={{
        Option: CustomOption,
        NoOptionsMessage: () => (
          <div className="p-2">{showLoading ? "Loading..." : "No options found"}</div>
        ),
      }}
      isDisabled={loading}
      className="basic-multi-select"
      classNamePrefix="select"
      closeMenuOnSelect={false}
    />
  );
};

export default MultiSelectDropdown;
