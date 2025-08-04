// components/CreatableInputSelect.tsx
import React from "react";
import CreatableSelect from "react-select/creatable";
import { MultiValue, components } from "react-select";

export interface OptionType {
  label: string;
  value: string;
}

interface CreatableInputSelectProps {
  placeholder?: string;
  value: string[];
  onChange: (options: string[]) => void;
}

const CreatableInputSelect: React.FC<CreatableInputSelectProps> = ({
  placeholder = "Type Keywords",
  value,
  onChange,
}) => {
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
      openMenuOnFocus={false} // allow typing but no dropdown on focus
      openMenuOnClick={false} 
    
      components={{
        DropdownIndicator: () => null, // remove dropdown arrow
        IndicatorSeparator: () => null, // remove separator
         NoOptionsMessage: () => null,
      }}
      className="basic-multi-select"
      classNamePrefix="select"
    />
  );
};

export default CreatableInputSelect;
