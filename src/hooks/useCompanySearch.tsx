import { commonService } from "@/services/common";
import {
  setDashboardGlobalSearch,
  setFinhub,
  setIsCompanySelected,
  setSavedSearch,
} from "@/stores/authenticationSlice";
import { useAppDispatch } from "@/stores/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { CompanyData } from "@/types/company";

const useCompanySearch = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const syncTickerInUrl = (ticker?: string) => {
    if (!ticker) return;

    const params = new URLSearchParams(location.search);
    params.set("ticker", ticker);

    navigate(
      {
        pathname: location.pathname,
        search: `?${params.toString()}`,
      },
      { replace: true }
    );
  };

  const saveSearch = async (id: number, company: string) => {
    const res = await commonService.saveSearches({
      module: "Global Search",
      id: id,
      company: company,
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Global Search",
          value: {
            id: id,
            company: company,
          },
        })
      );
    }
    return res;
  };

  const companySearchAndUpdate = async (companyData: CompanyData) => {
    // window.history.pushState({}, "", `/?ticker=${companyData?.symbol}`);
    const nextTicker = companyData?.symbol || companyData?.ticker;
    const saveSearchResponse = await saveSearch(
      companyData?.id,
      companyData?.name
    );
    if (saveSearchResponse?.finnhub) {
      dispatch(setFinhub(saveSearchResponse?.finnhub));
    } else {
      dispatch(setFinhub(null));
    }
    dispatch(
      setDashboardGlobalSearch({
        id: companyData?.id,
        ticker: nextTicker || "",
        name: companyData?.name,
        board_name: companyData?.board_name || companyData?.name, // Fallback to name if board_name not available
      })
    );
    dispatch(setIsCompanySelected(true));
    syncTickerInUrl(nextTicker);
  };
  return {
    saveSearch,
    companySearchAndUpdate,
  };
};

export default useCompanySearch;
