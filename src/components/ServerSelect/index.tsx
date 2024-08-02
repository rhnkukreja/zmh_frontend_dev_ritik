import { useEffect, useState,  MutableRefObject } from "react";
import { axiosInstance } from "@/services/index";
import TomSelect, { TomSelectElement } from "@/components/Base/TomSelect";
import LoadingIcon from "@/components/Base/LoadingIcon";

type Option = {
  value: number | string;
  label: string;
};

type FetchOptionsArgs = {
  url: string;
  valueKey: string;
  labelKey: string;
  placeholderText: string;
  className: string;
  selectedValue: string;
  setSelectedValue: (value: string) => void;
  selectRef: MutableRefObject<TomSelectElement>;
};

async function fetchOptions({
  url,
  valueKey,
  labelKey,
}: {
  url: string;
  valueKey: string;
  labelKey: string;
}): Promise<Option[]> {
  const response = await axiosInstance.get(url);
  const data = response.data.results || response.data;

  return data.map((item: any) => ({
    value: String(item[valueKey]),
    label: item[labelKey],
  }));
}

export const GeneralSelector = ({
  url,
  valueKey,
  labelKey,
  placeholderText,
  className,
  selectedValue,
  setSelectedValue,
  selectRef,
}: FetchOptionsArgs) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedOptions = await fetchOptions({ url, valueKey, labelKey });
        setOptions(fetchedOptions);
      } catch (err) {
        console.error("Error fetching options:", err);
        setError("Failed to load options");
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [url, valueKey, labelKey]);

  return (
    <div className="mt-2 text-left">
      {loading && options.length === 0 ? (
        <div className="flex justify-center items-center">
          <LoadingIcon icon="oval" className="w-8 h-8" />
          <div className="ml-2 text-xs">Loading...</div>
        </div>
      ) : (
        <TomSelect
          getRef={(el) => {
            selectRef.current = el;
          }}
          disabled={!!error}
          value={selectedValue}
          onChange={(e) => {
            setSelectedValue(e.target.value);
          }}
          options={{
            placeholder: placeholderText,
          }}
          className={className}
        >
          
          {error ? (
            <option value="" disabled>
              {error}
            </option>
          ) : (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
          {loading && options.length > 0 && (
            <option value="" disabled>
              Loading more options...
            </option>
          )}
        </TomSelect>
      )}
    </div>
  );
};
