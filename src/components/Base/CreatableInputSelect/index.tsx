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
  onInputChange?: (inputValue: string) => void;
  options?: string[];
  loading?: boolean;
}

const CreatableInputSelect: React.FC<CreatableInputSelectProps> = ({
  placeholder = "Type Keywords",
  value,
  onChange,
  onInputChange,
  options = [],
  loading = false,
}) => {
  const selectOptions: OptionType[] = value.map((val) => ({
    label: val,
    value: val,
  }));

  const suggestionOptions: OptionType[] = options.map((option) => ({
    label: option,
    value: option,
  }));

  const handleChange = (newValue: MultiValue<OptionType>) => {
    const values = (newValue as OptionType[]).map((option) => option.value);
    onChange(values);
  };

  const handleInputChange = (inputValue: string) => {
    if (onInputChange) {
      onInputChange(inputValue);
    }
  };

  return (
    <CreatableSelect
      isMulti
      placeholder={placeholder}
      value={selectOptions}
      onChange={handleChange}
      onInputChange={handleInputChange}
      options={suggestionOptions}
      isLoading={loading}
      openMenuOnFocus={true}
      openMenuOnClick={true}
      menuIsOpen={options.length > 0 ? undefined : false} // Open menu when options are available
      formatCreateLabel={(inputValue) => `${inputValue}`}
      loadingMessage={() => "Loading suggestions..."}
      noOptionsMessage={({ inputValue }) => 
        inputValue.length > 0 ? "Type to search keywords..." : "Start typing to search keywords..."
      }
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
      }}
      className="basic-multi-select"
      classNamePrefix="select"
    />
  );
};

export default CreatableInputSelect;
