import React, { useState, useEffect } from "react";
import Select, { components, MultiValue } from "react-select";
import { Check } from "lucide-react";
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
  preventRemoveLastItem?: boolean; // New prop to prevent removing last item
  fieldName?: string; // Field name for custom error messages
  alignLeft?: boolean;
  size?: "default" | "compact";
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  data,
  placeholder = "Select options...",
  onChange,
  loading = false,
  selectedOption = [], // Default to an empty array
  preventRemoveLastItem = false,
  fieldName = "item",
  alignLeft = false,
  size = "default",
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
        className={`flex items-center gap-2 px-3 py-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}`}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
        <span className={isDisabled ? 'text-gray-400' : ''}>{data.label}</span>
      </div>
    );
  };

  // Custom styles to fix blue selection box and maintain proper styling
  const isCompact = size === "compact";
  const controlMinHeight = isCompact ? "36px" : "42px";
  const controlFontSize = isCompact ? "14px" : "14px";
  const controlBorderColor = "#e2e8f0";
  const controlShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: controlBorderColor,
      boxShadow: controlShadow,
      border: `1px solid ${controlBorderColor} !important`,
      outline: 'none',
      minHeight: controlMinHeight,
      fontSize: controlFontSize,
      backgroundColor: '#ffffff',
      borderRadius: '0.375rem',
      width: '100%',
      textAlign: alignLeft ? 'left' : undefined,
      '&:hover': {
        borderColor: controlBorderColor,
        border: `1px solid ${controlBorderColor} !important`
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
      fontSize: controlFontSize,
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
      padding: isCompact ? '2px 12px' : '4px 12px',
      textAlign: alignLeft ? 'left' : undefined,
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: controlFontSize,
      textAlign: alignLeft ? 'left' : undefined,
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 999,
      border: '1px solid #e2e8f0',
      boxShadow: controlShadow,
      marginTop: '1px',
      borderRadius: '0.375rem',
      width: '100%',
      textAlign: alignLeft ? 'left' : undefined,
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: 220,
      paddingTop: 4,
      paddingBottom: 4,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'transparent' : state.isFocused ? '#f3f4f6' : 'white',
      color: '#374151',
      cursor: 'pointer',
      fontSize: controlFontSize,
      padding: 0,
      textAlign: alignLeft ? 'left' : undefined,
      '&:hover': {
        backgroundColor: '#f3f4f6'
      }
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#e5e7eb',
      border: '1px solid #d1d5db',
      maxWidth: '100%'
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#374151',
      fontSize: controlFontSize,
      textAlign: alignLeft ? 'left' : undefined,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      '&:hover': {
        backgroundColor: '#ef4444',
        color: 'white'
      }
    }),
    menuPortal: (provided: any) => ({
      ...provided,
      zIndex: 9999,
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
        // Clear input on selection or when menu closes
        if (actionMeta.action === 'set-value' || actionMeta.action === 'menu-close') {
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
      menuPortalTarget={document.body}
    />
  );
};

export default MultiSelectDropdown;
