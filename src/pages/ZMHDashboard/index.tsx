import { useEffect } from "react";
import _ from "lodash";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyDashboard,
  setPage,
} from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch, RootState } from "@/stores/store";
import { Helmet } from "react-helmet-async";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import InvestorCard from "@/components/InvestorCard";
import CaseStudiesCard from "@/components/CaseStudiesCard";
import AGMSummaryCard from "@/components/AGMSummaryCard";
import { setIsCompanySelected } from "@/stores/authenticationSlice";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const { isCompanySelected } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  useEffect(() => {
    dispatch(setIsCompanySelected(false));
  }, [isCompanySelected])
  
  return (
    <>
      {/* <Helmet>
        <title>Investor Dashboard - ZMH Analytics</title>
      </Helmet> */}

    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12 xl:col-span-12">
         <InvestorCard />
      </div>

      <div className="col-span-12 xl:col-span-12">
         <AGMSummaryCard />
      </div>

      <div className="col-span-12 xl:col-span-12">
        <CaseStudiesCard />
      </div>
    </div>
    </>
  );
}

export default Main;
