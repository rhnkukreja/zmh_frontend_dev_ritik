import Lucide from "@/components/Base/Lucide";
import { FormInput } from "@/components/Base/Form";
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect, useCallback } from "react";
import _ from "lodash";
import { fetchCompanyByName } from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { useNavigate } from "react-router-dom";
import { CompanyData } from "@/types/company";
import {
  setDashboardGlobalSearch,
  setFinhub,
  setIsCompanySelected,
  setSavedSearch,
} from "@/stores/authenticationSlice";
import { commonService } from "@/services/common";
import LoadingIcon from "../Base/LoadingIcon";
import localStorageHelper from "@/utils/helper";
import useCompanySearch from "@/hooks/useCompanySearch";

interface MainProps {
  quickSearch: boolean;
  setQuickSearch: (val: boolean) => void;
}

function Main(props: MainProps) {
  const dispatch: AppDispatch = useAppDispatch();
  const { companySearchAndUpdate } = useCompanySearch();
  const [search, setSearch] = useState("");
  const { companyDataList, companySearchLoading, searchCompletion } =
    useAppSelector((state) => state.dashboard);
  const navigate = useNavigate();

  useEffect(() => {
    document.onkeydown = function (evt) {
      if (evt.key === "Escape" || evt.key === "Esc") {
        props.setQuickSearch(false);
      } else if ((evt.ctrlKey || evt.metaKey) && evt.key === "k") {
        props.setQuickSearch(true);
      }
    };
  }, []);

  const [isSearchComplete, setIsSearchComplete] = useState(false);

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    setIsSearchComplete(false);
    const value = event.target.value;
    setSearch(value);
    debouncedFetchResults(value);

    setTimeout(() => {
      setIsSearchComplete(true);
    }, 1000);
  };

  const debouncedFetchResults = useCallback(
    _.debounce((query: string) => {
      dispatch(fetchCompanyByName(query));
    }, 500),
    []
  );

  const lastQuickSearch = async () => {
    const res = await commonService.lastQuickSearches();
    setLastSearch(res);
    // return res;
  };

  const [lastSearch, setLastSearch] = useState([]);

  useEffect(() => {
    lastQuickSearch();
  }, []);

  const handleCompanyClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    company: CompanyData
  ) => {
    event.preventDefault();
    localStorageHelper.setItem("searchCompanyData", company);
    props.setQuickSearch(false);
    await companySearchAndUpdate(company);
    setSearch("");
    const data = { target: { value: "" } };
    handleSearchChange(data);
    lastQuickSearch();
  };

  return (
    <>
      <Transition appear show={props.quickSearch} as={Fragment}>
        <HeadlessDialog
          as="div"
          className="relative z-[60]"
          onClose={props.setQuickSearch}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-50"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gradient-to-b from-theme-1/50 via-theme-2/50 to-black/50 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex justify-center my-2 sm:mt-40">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-50"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in-out duration-100"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <HeadlessDialog.Panel className="sm:w-[600px] lg:w-[700px] w-[95%] relative mx-auto transition-transform">
                  <div className="relative ">
                    <div className="absolute inset-y-0 left-0 flex items-center justify-center w-12">
                      <Lucide
                        icon="Search"
                        className="w-5 h-5 -mr-1.5 text-slate-500 stroke-[1]"
                      />
                    </div>

                    <FormInput
                      className="pl-12 pr-14 py-3.5 text-base rounded-lg focus:ring-0 border-0 shadow-lg "
                      type="text"
                      placeholder="Search by company name, ticker, or symbol"
                      value={search}
                      onChange={handleSearchChange}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center w-14">
                      <div className="px-2 py-1 mr-auto text-xs border rounded-[0.4rem] bg-slate-100 text-slate-500/80">
                        ESC
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 pb-1 mt-1 bg-white rounded-lg shadow-lg max-h-[468px] sm:max-h-[615px] overflow-y-auto">
                    {/* {search?.length > 0 && companySearchLoading && <LoadingIcon
                      color="#800000"
                      icon="three-dots"
                      className="w-16 h-16"
                    />
                    } */}

                    {companyDataList?.length === 0 &&
                    lastSearch?.length > 0 &&
                    search.length === 0 ? (
                      <div>
                        <div className="px-5 py-4">
                          <div className="flex items-center">
                            <div className="text-xs uppercase text-slate-500">
                              Search companies here...
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 border-t border-dashed">
                          <div className="flex items-center ">
                            <div className="text-xs uppercase text-slate-500">
                              Last Company Search
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 mt-3.5">
                            {companyDataList?.length === 0 &&
                              lastSearch?.map(
                                (item: CompanyData, key: number) => (
                                  <a
                                    onClick={(event) =>
                                      handleCompanyClick(event, item)
                                    }
                                    key={key}
                                    className="flex items-center cursor-pointer gap-2.5 hover:bg-slate-50/80 border border-transparent hover:border-slate-100 p-1 rounded-md"
                                  >
                                    <div className="font-medium truncate ">
                                      {item?.name}
                                    </div>
                                  </a>
                                )
                              )}
                          </div>
                        </div>
                      </div>
                    ) : companyDataList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center pt-20 pb-28">
                        {search?.length > 0 &&
                          companySearchLoading &&
                          companyDataList.length === 0 && (
                            <Lucide
                              icon="SearchX"
                              className="w-20 h-20 text-theme-1/20 fill-theme-1/5 stroke-[0.5]"
                            />
                          )}

                        {search?.length > 0 &&
                          !companySearchLoading &&
                          isSearchComplete &&
                          companyDataList.length === 0 && (
                            <Lucide
                              icon="SearchX"
                              className="w-20 h-20 text-theme-1/20 fill-theme-1/5 stroke-[0.5]"
                            />
                          )}
                        <div className="mt-5 text-xl font-medium">
                          {search?.length > 0 &&
                            companySearchLoading &&
                            companyDataList.length === 0 &&
                            "Loading..."}
                          {search?.length > 0 &&
                            !companySearchLoading &&
                            isSearchComplete &&
                            companyDataList.length === 0 &&
                            "No Record Found..."}
                        </div>

                        {/* {search.length > 0 && !loading && (
                          <div className="w-2/3 mt-3 leading-relaxed text-center text-slate-500">
                            No results found for
                            <span className="italic font-medium">
                              "{search}
                            </span>
                            ". Please try a different search term or check your
                            spelling.
                          </div>
                        )} */}
                      </div>
                    ) : (
                      <div>
                        <div className="px-5 py-4">
                          <div className="flex items-center">
                            <div className="text-xs uppercase text-slate-500">
                              Search companies here...
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 border-t border-dashed">
                          <div className="flex items-center ">
                            <div className="text-xs uppercase text-slate-500">
                              Company
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 mt-3.5">
                            {companyDataList?.map(
                              (item: CompanyData, key: number) => (
                                <a
                                  onClick={(event) =>
                                    handleCompanyClick(event, item)
                                  }
                                  key={key}
                                  className="flex items-center cursor-pointer gap-2.5 hover:bg-slate-50/80 border border-transparent hover:border-slate-100 p-1 rounded-md"
                                >
                                  <div className="font-medium truncate ">
                                    {item?.name}
                                  </div>
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </HeadlessDialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </HeadlessDialog>
      </Transition>
    </>
  );
}

export default Main;
