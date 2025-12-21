import React, { useState, useEffect } from "react";
import Select, { components, MultiValue } from "react-select";
import { FormCheck } from "../Form";
import { toast } from "react-toastify";

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
  preventRemoveLastItem?: boolean; // New prop to prevent removing last item
  fieldName?: string; // Field name for custom error messages
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  data,
  placeholder = "Select options...",
  onChange,
  loading = false,
  selectedOption = [], // Default to an empty array
  preventRemoveLastItem = false,
  fieldName = "item",
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [showLoading, setShowLoading] = useState<boolean>(loading);
  const [hasInitialLoad, setHasInitialLoad] = useState<boolean>(false);
  const [isUserSelecting, setIsUserSelecting] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");

  // Update showLoading when loading prop changes
  useEffect(() => {
    setShowLoading(loading);
  }, [loading]);

  // Synchronize selected options with the `selectedOption` prop
  useEffect(() => {
    // Don't override user's active selection
    if (isUserSelecting) {
      return;
    }
    
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
  }, [selectedOption, isUserSelecting]);

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
    
    // Mark that we've received data (even if empty) after the first load
    if (!hasInitialLoad && !loading) {
      setHasInitialLoad(true);
    }
  }, [data, loading, hasInitialLoad]);

  const handleChange = (selected: MultiValue<Option>) => {
    const newSelectedOptions = selected as Option[];
    
    // Set flag to indicate user is actively selecting
    setIsUserSelecting(true);
    
    // Check if trying to remove the last item when preventRemoveLastItem is true
    if (preventRemoveLastItem && selectedOptions.length === 1 && newSelectedOptions.length === 0) {
      toast.error(`At least one ${fieldName} must be selected`);
      setIsUserSelecting(false);
      return; // Don't update the state, keep the current selection
    }
    
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions);
    
    // Reset the flag after a short delay to allow prop updates
    setTimeout(() => {
      setIsUserSelecting(false);
    }, 100);
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

  // Custom styles to fix blue selection box and maintain proper styling
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 1px #d1d5db' : 'none',
      border: '1px solid #d1d5db !important',
      outline: 'none',
      minHeight: '42px',
      '&:hover': {
        borderColor: '#d1d5db',
        border: '1px solid #d1d5db !important'
      },
      '&:focus': {
        borderColor: '#d1d5db',
        boxShadow: '0 0 0 1px #d1d5db',
        border: '1px solid #d1d5db !important',
        outline: 'none'
      },
      '&:focus-within': {
        borderColor: '#d1d5db',
        boxShadow: '0 0 0 1px #d1d5db',
        border: '1px solid #d1d5db !important',
        outline: 'none'
      }
    }),
    input: (provided: any) => ({
      ...provided,
      color: '#374151',
      outline: 'none !important',
      boxShadow: 'none !important',
      border: 'none !important',
      background: 'transparent !important',
      '&::selection': {
        backgroundColor: 'transparent !important',
        color: 'inherit !important'
      },
      '&:focus': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
        background: 'transparent !important'
      }
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '2px 8px'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9ca3af'
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 999,
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'transparent' : state.isFocused ? '#f3f4f6' : 'white',
      color: '#374151',
      cursor: 'pointer',
      padding: 0,
      '&:hover': {
        backgroundColor: '#f3f4f6'
      }
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#e5e7eb',
      border: '1px solid #d1d5db'
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#374151'
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      '&:hover': {
        backgroundColor: '#ef4444',
        color: 'white'
      }
    })
  };

  return (
    <Select
      isMulti
      options={options}
      value={selectedOptions}
      onChange={handleChange}
      onInputChange={(newValue, actionMeta) => {
        // Only update input value for user input actions
        if (actionMeta.action === 'input-change') {
          setInputValue(newValue);
        }
        // Don't clear input on selection - allow user to continue filtering
        // Only clear when menu closes
        if (actionMeta.action === 'menu-close') {
          setInputValue('');
        }
      }}
      inputValue={inputValue}
      placeholder={showLoading || !hasInitialLoad ? "Loading options..." : placeholder}
      hideSelectedOptions={false}
      styles={customStyles}
      components={{
        Option: CustomOption,
        NoOptionsMessage: () => (
          <div className="p-2 text-center">
            {showLoading || !hasInitialLoad ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading options...
              </div>
            ) : (
              <div className="text-gray-500">No options available</div>
            )}
          </div>
        ),
      }}
      isDisabled={loading}
      className="basic-multi-select"
      classNamePrefix="select"
      closeMenuOnSelect={false}
      isLoading={showLoading}
      isSearchable={true}
      isClearable={false}
      blurInputOnSelect={false}
      openMenuOnFocus={true}
      openMenuOnClick={true}
    />
  );
};

export default MultiSelectDropdown;
