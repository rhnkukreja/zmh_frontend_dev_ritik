import { caseStudiesService } from "@/services/caseStudies";
import { FilterDropdown } from "@/types/casestudy";
import { useEffect, useState, useCallback } from "react";

interface UseCaseStudyDropdownsResult {
  apiDropdownOptions: FilterDropdown;
  loading: boolean;
  forceFetch: () => void;
}

const useCaseStudyDropdowns = (): UseCaseStudyDropdownsResult => {
  const [apiDropdownOptions, setApiDropdownOptions] = useState<FilterDropdown>({
    institution: [],
    market: [],
    proposal_type: [],
    sector: [],
    themes: [],
    vote: [],
    year: [],
    category: [],
    sub_category: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchDropdownValues = async () => {
    setLoading(true);
    try {
      const res = await caseStudiesService.getCaseStudiesDropdownValues();
      if (res.result) {
        setApiDropdownOptions(res.result);
      }
    } catch (error) {
      console.error("Failed to fetch dropdown values:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownValues();
  }, []);

  const forceFetch = useCallback(() => {
    fetchDropdownValues();
  }, []);

  return { apiDropdownOptions, loading, forceFetch };
};

export default useCaseStudyDropdowns;
