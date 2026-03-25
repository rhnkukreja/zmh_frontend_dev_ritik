import Lucide from "@/components/Base/Lucide";
import { Menu, Popover, Tab } from "@/components/Base/Headless";
import { FormCheck, FormSelect } from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchInvestersProfiles,
  resetFilter,
  resetPage,
  setPage,
  setFilter,
} from "@/stores/investersProfileSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { InvestersProfile } from "@/types/investerProfiles";
import { useNavigate } from "react-router-dom";

import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import AddNewInvesterProfile from "./components/AddNewInvester";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import { toast } from "react-toastify";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import FilterChips from "@/components/FilterChips";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { FaSearch } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";

interface InvestorProfileFilter {
  region: string[];
}
function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    loading,
    investersProfile,
    page,
    totalPages,
    filters,
    count,
    investerProfileFilterOption,
  } = useAppSelector((state) => state.investersProfile);

  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] =
    useState<boolean>(false);
  const [tab, setTab] = useState<"investor" | "equity">("investor");
  const [searchTerms, setSearchTerms] = useState<string[]>(
    filters?.institution_name?.length > 0 ? filters?.institution_name : []
  );
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const { user } = useAppSelector((state) => state.authentiction);

  const { handleSubmit, control, reset, setValue, watch } =
    useForm<InvestorProfileFilter>({
      defaultValues: {
        region: [...filters.region],
      },
    });

  const resetFormValues = () => {
    setValue("region", []);
  };

  useEffect(() => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/investor_profile/`,
      filters,
      { type: tab },
      page
    );

    dispatch(fetchInvestersProfiles(dynamicURL));
    const { institution_name, ...restFilters } = filters;
    setFiltersLength(countValidFilters(restFilters));
    
    // Include institution_name in filter chips with proper formatting
    const filtersWithInstitution = {
      ...restFilters,
      ...(institution_name && institution_name.length > 0 && { institution_name })
    };
    
    setSelectedChipFilters(generateFilterChips(filtersWithInstitution));
  }, [page, filters, tab]);

  const onFilterClear = () => {
    reset();
    dispatch(resetFilter());
    dispatch(resetPage());
  };

  const handleClearAllFilter = () => {
    setSearchTerms([]);
    reset();
    resetFormValues();
    dispatch(resetFilter());
    dispatch(resetPage());
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilter({ key: "institution_name", value: searchTerms }));
  };

  const onSubmit = async (investorProfileFilter: InvestorProfileFilter) => {
    Object.entries(investorProfileFilter).forEach(([key, value]) => {
      dispatch(setFilter({ key: key as any, value }));
    });

    dispatch(resetPage());
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      dispatch(setPage(page + 1));
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      dispatch(setPage(page - 1));
    }
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  const gotoDetailPage = (id: number) => {
    const data = { currentPage: page };
    navigate(`/investor-profile/${tab}/${id}`, { state: data });
  };

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Investor Profile"]?.institution]);
    dispatch(
      setFilter({
        key: "region",
        value: user?.saved_search["Investor Profile"]?.region,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Investor Profile",
      institution: searchTerms,
      region: filters["region"],
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Investor Profile",
          value: {
            institution: searchTerms,
            region: filters["region"],
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters: InvestorProfileFilter = { ...filters };
    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      updatedFilters[removeKey] = "";
    }

    setValue(removeKey, updatedFilters[removeKey]);
    Object.entries(updatedFilters).forEach(([key, value]) => {
      dispatch(setFilter({ key: key as any, value }));
    });
  }


  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="w-full sticky z-30 header-card transition-[margin,width,opacity] duration-1000 ease-in-out bg-white shadow" style={{ top: '4rem', minHeight: '64px' }}>
            <div className="bg-white px-4 mb-4 flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center h-[64px]">
                <h1 className="text-xl font-semibold flex items-center gap-2">Investor Profile</h1>
              </div>
              {/* <div className="flex gap-3 px-4 py-4 dark:bg-darkmode-800">
                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                  <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
                    <Button
                      onClick={() => {
                        setAddNewInvesterModalVisible(true);
                      }}
                      variant="primary"
                      className="bg-theme-2 border-bg-theme-2"
                    >
                      <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />
                      Add New Investor
                    </Button>
                  </div>
                )}
              </div> */}
            </div>
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col px-5 pt-5 sm:flex-row gap-y-2 items-center">
                <div className="flex">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    onSearchSelect={() => {
                      dispatch(resetPage());
                    }}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url="/investor_profile/"
                    getOptionKey="institution_name"
                    placeHolder="Search Institution"
                    onSearchChange={resetPage}
                    showPills={false}
                  />

                  <div className="hover:bg-slate-50">
                    <Button onClick={handleClearAllFilter}>
                      <Tippy
                        content="Clear Filters"
                        options={{ theme: "light" }}
                      >
                        <FilterX
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer"
                        />
                      </Tippy>
                      {/* <span className="text-slate-500">Clear Filters</span> */}
                    </Button>
                  </div>

                  <div className="hover:bg-slate-50 ml-2">
                    <Button onClick={saveSearch}>
                      <Tippy
                        content="Save Searches"
                        options={{ theme: "light" }}
                      >
                        <SaveAll
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer	"
                        />
                      </Tippy>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto mb-7">
                  {user?.saved_search?.["Investor Profile"] !== undefined && (
                    <div className="hover:bg-slate-50 ">
                      <Button onClick={getSavedSearches}>
                        Previous Search
                      </Button>
                    </div>
                  )}

                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                        >
                          <Lucide
                            icon="ArrowDownWideNarrow"
                            className="stroke-[1.3] w-4 h-4 mr-2"
                          />
                          Filter
                          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                            {filtersLength}
                          </div>
                        </Popover.Button>
                        <Popover.Panel className="w-[300px]">
                          <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="p-2">
                              {/* Filter Content */}
                              <div className="mb-4">
                                <h4 className="text-base font-semibold text-slate-700 mb-4">Filters</h4>
                              </div>
                              <div>
                                <div className="w-full my-2">
                                  {/* Clear and Apply buttons outside filter */}
                                  <div className="w-full">
                                    <Button
                                      variant="outline-secondary"
                                      onClick={() => {
                                        onFilterClear();
                                      }}
                                      className="w-full flex items-center gap-2 mb-2"
                                    >
                                      <MdOutlineClear className="text-lg" />
                                      Clear
                                    </Button>

                                    <Button
                                      variant="primary"
                                      onClick={handleSubmit(onSubmit)}
                                      className="w-full flex items-center gap-2 mb-4"
                                    >
                                      <FaSearch className="text-sm" />
                                      Apply
                                    </Button>
                                  </div>
                                  <div className="text-left text-slate-500 flex justify-between mb-1">
                                    <span className="font-semibold">Region</span>
                                    {investerProfileFilterOption?.region
                                      ?.length > 0 && (
                                        <div>
                                          <FormCheck className="mr-2">
                                            <FormCheck.Label>
                                              Select All
                                            </FormCheck.Label>
                                            <FormCheck.Input
                                              className="ml-1"
                                              id={`region`}
                                              checked={
                                                investerProfileFilterOption.region
                                                  .length ===
                                                watch("region")?.length
                                              }
                                              type="checkbox"
                                              onChange={(e) => {
                                                if (e.target.checked === true) {
                                                  setValue(
                                                    "region",
                                                    investerProfileFilterOption.region
                                                  );
                                                } else {
                                                  setValue("region", []);
                                                }
                                              }}
                                            />
                                          </FormCheck>
                                        </div>
                                      )}
                                  </div>
                                  <Controller
                                    name="region"
                                    control={control}
                                    render={({ field }) => (
                                      <MultiSelectDropdown
                                        data={investerProfileFilterOption?.region}
                                        placeholder="Select Region"
                                        loading={investerProfileFilterOption?.region
                                          .length === 0}
                                        onChange={(selectedOptions) => {
                                          const selectedValues = selectedOptions.map((option) => option.value);
                                          field.onChange(selectedValues);


                                        }}
                                        selectedOption={field.value || []}
                                      />
                                      // <TomSelect
                                      //   value={field.value || []}
                                      //   onChange={(value) => {
                                      //     field.onChange(value);
                                      //   }}
                                      //   options={{
                                      //     placeholder: "Select region",
                                      //   }}
                                      //   className="w-full"
                                      //   multiple
                                      // >
                                      //   <>
                                      //     {investerProfileFilterOption?.region
                                      //       .length > 0 &&
                                      //       investerProfileFilterOption?.region?.map(
                                      //         (region: string) => {
                                      //           return (
                                      //             <option value={region}>
                                      //               {region}
                                      //             </option>
                                      //           );
                                      //         }
                                      //       )}
                                      //   </>
                                      // </TomSelect>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </form>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

              {
                selectedChipFilters?.length > 0 &&
                <>
                  <FilterChips filters={selectedChipFilters} onRemove={handleRemoveChip} />
                </>
              }
              {count > 0 && (
                <h2 className="flex items-end font-semibold justify-end my-2 text-[13px] md:ml-auto mx-5 mb-1">
                  Count: {count.toLocaleString()}
                </h2>
              )}

              <div className="overflow-auto xl:overflow-visible px-5">
                <TableWrapper 
                  isLoading={loading}
                  skeleton={
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                          <div className="flex space-x-2">
                            <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                >
                  {investersProfile?.length > 0 &&
                    investersProfile.map((profile: InvestersProfile) => {
                      return (
                        <div className="relative flex items-center justify-between p-4 pl-0 border border-solid rounded-lg pr-5  my-2 shadow-md">
                          <div className="ml-5 flex items-center">
                            <span
                              onClick={() => {
                                gotoDetailPage(profile.id);
                              }}
                            >
                              <div className="font-semibold text-[0.94rem] truncate max-w-[200px] sm:max-w-[400px] w-full cursor-pointer hover:text-primary transition-colors">
                                {profile?.institution_name}
                              </div>
                            </span>
                            {/* </Tippy> */}
                          </div>

                          <Tippy
                            content="See Details"
                            options={{
                              theme: "light",
                            }}
                          >
                            <Lucide
                              onClick={() => {
                                gotoDetailPage(profile.id);
                              }}
                              icon="Eye"
                              className="w-4 h-4 mr-1.5 stroke-[1.3] cursor-pointer"
                            />
                          </Tippy>
                        </div>
                      );
                    })}
                </TableWrapper>
                {/* <Tab.Group>
                  <Tab.List variant="link-tabs">
                    <Tab>
                      <Tab.Button
                        className="w-full py-2"
                        as="button"
                        onClick={() => {
                          setTab("investor");
                          dispatch(resetInvestorProfiles());
                        }}
                      >
                        Institutional Investors
                      </Tab.Button>
                    </Tab>
                    <Tab>
                      <Tab.Button
                        className="w-full py-2"
                        as="button"
                        onClick={() => {
                          setTab("equity");
                          dispatch(resetInvestorProfiles());
                        }}
                      >
                        Private Equity
                      </Tab.Button>
                    </Tab>
                  </Tab.List>
                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed"></Tab.Panel>
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper 
                        isLoading={loading}
                        skeleton={
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                <div className="flex space-x-2">
                                  <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                  <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        }
                      >
                        {investersProfile?.length > 0 &&
                          investersProfile.map((profile: InvestersProfile) => {
                            return (
                              <div className="relative flex items-center justify-between p-4 pl-0 border border-solid rounded-lg pr-5  my-2 shadow-md">
                                <div className="ml-5 flex items-center">
                                  {profile?.institution_logo_url ? (
                                    <>
                                      <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                        <Tippy
                                          as="img"
                                          alt="ZMH Analytics"
                                          className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={profile?.institution_logo_url}
                                          content={
                                            profile?.equity_firm_name || ""
                                          }
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div className=" flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                      <Lucide
                                        icon="User"
                                        className="w-[65%] h-[65%] fill-slate-300/70 -mt-1.5 stroke-[0.5] stroke-slate-400/50"
                                      />
                                      <a
                                        href=""
                                        className="absolute bottom-0 right-0 flex items-center justify-center rounded-full  w-7 h-7"
                                      ></a>
                                    </div>
                                  )}
                                  <Tippy
                                    content={profile?.equity_firm_name || ""}
                                    options={{
                                      theme: "light",
                                    }}
                                  >
                                    <div className="font-medium text-[0.94rem] truncate max-w-[200px] sm:max-w-[400px] w-full ml-4">
                                      {profile?.equity_firm_name || ""}
                                    </div>
                                  </Tippy>
                                </div>

                                <Tippy
                                  content="View"
                                  options={{
                                    theme: "dark",
                                  }}
                                >
                                  <Lucide
                                    onClick={() => {
                                      gotoDetailPage(profile.id);
                                    }}
                                    icon="Eye"
                                    className="w-4 h-4 mr-1.5 stroke-[1.3] cursor-pointer"
                                  />
                                </Tippy>
                              </div>
                            );
                          })}
                      </TableWrapper>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group> */}
              </div>
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                <CPagination
                  page={page}
                  totalPages={totalPages}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />

                {/* <FormSelect className="sm:w-20 rounded-[0.5rem]">
                <option>10</option>
                <option>25</option>
                <option>35</option>
                <option>50</option>
              </FormSelect> */}
              </div>
            </div>
          </div>
          {addNewInvesterModalVisible && (
            <AddNewInvesterProfile
              addNewInvesterModalVisible={addNewInvesterModalVisible}
              setAddNewInvesterModalVisible={setAddNewInvesterModalVisible}
            />
          )}
        </div>
      </div >
    </>
  );
}

export default Main;
