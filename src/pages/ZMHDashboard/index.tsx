import { useEffect } from "react";
import _ from "lodash";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyDashboard,
  getBoardDirectorMembers,
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
import BoardDirectorMembers from "@/components/BoardDirectorMembers";
import LoadingIcon from "@/components/Base/LoadingIcon";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const { isCompanySelected } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  useEffect(() => {
    dispatch(setIsCompanySelected(false));
  }, [isCompanySelected]);

  const { investorCardLoading } = useAppSelector((state) => state.dashboard);



  return (
    <>
      {
        investorCardLoading && <div className=" h-96 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      }
      {
        <>
          <section className={investorCardLoading ? 'hidden' : 'block'}>
            <div className="grid grid-cols-12 gap-y-10 gap-x-6">
              <div className="col-span-12 xl:col-span-12">
                <InvestorCard />
              </div>

              <BoardDirectorMembers />

              <div className="col-span-12 xl:col-span-12">
                <AGMSummaryCard />
              </div>

              <div className="col-span-12 xl:col-span-12">
                <CaseStudiesCard />
              </div>
            </div>
          </section>
        </>
      }
    </>
  );
}

export default Main;
