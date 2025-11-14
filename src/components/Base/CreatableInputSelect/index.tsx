// components/CreatableInputSelect.tsx
import React from "react";
import CreatableSelect from "react-select/creatable";
import { MultiValue, components } from "react-select";

export interface OptionType {
  label: string;
  value: string;
    __isNew__?: boolean;
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
  placeholder = "Type and press Enter to add keywords",
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

  const handleInputChange = (inputValue: string, { action }: any) => {
    // Only call onInputChange for actual user input, not for other actions
    if (action === 'input-change' && onInputChange) {
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
      // Keep menu open after selection so users can select multiple options
      closeMenuOnSelect={false}
      // Prevent menu from closing when input is blurred (important!)
      blurInputOnSelect={false}
      // Don't clear input when an option is selected
      isClearable={false}
      // Control menu opening behavior
      menuIsOpen={undefined}
      // Prevent automatic menu closing on certain actions
      captureMenuScroll={false}
      formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
      loadingMessage={() => "Loading suggestions..."}
      noOptionsMessage={({ inputValue }) => 
        inputValue.length > 0 
          ? `Press Enter to add "${inputValue}" as a custom keyword` 
          : "Start typing to search keywords or create custom ones"
      }
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        // Custom component to style the "Add new" option
        Option: (props) => {
          const { data, isSelected, isFocused, ...rest } = props;
          const isCreateOption = data.__isNew__;
          
          return (
            <components.Option
              {...props}
              className={`
                ${isCreateOption ? 'bg-gray-50 border-t border-gray-200' : ''}
                ${isFocused ? 'bg-gray-100' : ''}
                ${isSelected ? 'bg-gray-600 text-white' : ''}
                px-3 py-2 cursor-pointer
              `}
            >
              {isCreateOption ? (
                <div className="flex items-center">
                  <span className="text-gray-600 font-medium mr-2">+</span>
                  <span className="text-gray-600">{data.label}</span>
                </div>
              ) : (
                data.label
              )}
            </components.Option>
          );
        },
      }}
      className="basic-multi-select"
      classNamePrefix="select"
      // Enable creating new options
      isValidNewOption={(inputValue, selectValue, selectOptions) => {
        // Allow creating if input is not empty and not already selected
        return inputValue.trim().length > 0 && 
               !selectValue.some(option => option.value.toLowerCase() === inputValue.toLowerCase());
      }}
      // Allow creating on blur, tab, enter, and comma
      createOptionPosition="first"
      styles={{
        control: (provided, state) => ({
          ...provided,
          minHeight: '38px',
          borderColor: state.isFocused ? '#6B7280' : '#D1D5DB',
          boxShadow: state.isFocused ? '0 0 0 1px #6B7280' : 'none',
          '&:hover': {
            borderColor: '#6B7280',
          },
        }),
        multiValue: (provided) => ({
          ...provided,
          backgroundColor: '#F3F4F6',
          borderRadius: '3px',
        }),
        multiValueLabel: (provided) => ({
          ...provided,
          color: '#374151',
          fontWeight: '500',
        }),
        multiValueRemove: (provided) => ({
          ...provided,
          color: '#6B7280',
          '&:hover': {
            backgroundColor: '#9CA3AF',
            color: 'white',
          },
        }),
      }}
    />
  );
};

export default CreatableInputSelect;
