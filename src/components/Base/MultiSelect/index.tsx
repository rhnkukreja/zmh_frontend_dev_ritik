import React, { useState, useEffect } from "react";
import Select, { components, MultiValue } from "react-select";
import { FormCheck } from "../Form";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  data: string[]; // Directly pass an array of strings
  placeholder?: string;
  onChange: (selectedOptions: Option[]) => void;
  loading?: boolean; // New loading prop
  selectedOption?: string[]; // Array of selected values
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
      const formattedSelectedOptions = selectedOption.map((value) => ({
        value,
        label: value,
      }));
      setSelectedOptions(formattedSelectedOptions);
    } else {
      setSelectedOptions([]); // Ensure state consistency if `selectedOption` is invalid
    }
  }, [selectedOption]);

  // Format options from the data
  useEffect(() => {
    const formattedOptions = data?.map((item) => ({
      value: item,
      label: item,
    }));
    setOptions(formattedOptions || []);
  }, [data]);

  const handleChange = (selected: MultiValue<Option>) => {
    const newSelectedOptions = selected as Option[];
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions);
  };

  const CustomOption = (props: any) => {
    const { data, isSelected, innerRef, innerProps } = props;

    return (
      <div ref={innerRef} {...innerProps} className="flex items-center p-2">
        <FormCheck className="mr-2">
          <FormCheck.Input className="ml-1" checked={isSelected} type="checkbox" />
        </FormCheck>
        <span>{data.label}</span>
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
