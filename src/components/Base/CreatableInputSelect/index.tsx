// components/CreatableInputSelect.tsx
import React from "react";
import CreatableSelect from "react-select/creatable";
import { MultiValue } from "react-select";

export interface OptionType {
  label: string;
  value: string;
}

interface CreatableInputSelectProps {
  placeholder?: string;
  value: string[]; // Accept array of strings
  onChange: (options: string[]) => void; // Return array of strings
}

const CreatableInputSelect: React.FC<CreatableInputSelectProps> = ({
  placeholder = "Type and press enter...",
  value,
  onChange,
}) => {
  // Convert string[] to OptionType[] for react-select
  const selectOptions: OptionType[] = value.map((val) => ({
    label: val,
    value: val,
  }));

  const handleChange = (newValue: MultiValue<OptionType>) => {
    const values = (newValue as OptionType[]).map((option) => option.value);
    onChange(values);
  };

  return (
    <CreatableSelect
      isMulti
      placeholder={placeholder}
      value={selectOptions}
      onChange={handleChange}
      openMenuOnFocus={false}
      openMenuOnClick={false}
      className="basic-multi-select"
      classNamePrefix="select"
    />
  );
};

export default CreatableInputSelect;
