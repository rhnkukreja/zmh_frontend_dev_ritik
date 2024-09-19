import Lucide from "@/components/Base/Lucide";
import { Menu, Popover, Tab } from "@/components/Base/Headless";
import { FormSelect } from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchInvestersProfiles,
  resetFilter,
  resetInvestorProfiles,
  resetPage,
  setPage,
} from "@/stores/investersProfileSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { InvestersProfile } from "@/types/investerProfiles";
import { useNavigate } from "react-router-dom";
import { setFilter } from "@/stores/investersProfileSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import AddNewInvesterProfile from "./components/AddNewInvester";
import Tippy from "@/components/Base/Tippy";
import { FilterX, FolderSearch2, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { toast } from "react-toastify";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] =
    useState<boolean>(false);
  const [tab, setTab] = useState<"investor" | "equity">("investor");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  const {
    loading,
    investersProfile,
    page,
    totalPages,
    filters,
    investerProfileFilterOption,
  } = useAppSelector((state) => state.investersProfile);
  const { user } = useAppSelector((state) => state.authentiction);

  console.log({ user });

  useEffect(() => {
    if (filters.institution_name.length > 0) {
      dispatch(
        fetchInvestersProfiles(
          createDynamicURL(`${baseURL}/investor_profile/`, filters, {
            type: tab,
          })
        )
      );
    } else {
      dispatch(
        fetchInvestersProfiles(
          createDynamicURL(
            `${baseURL}/investor_profile/`,
            filters,
            { type: tab },
            page
          )
        )
      );
    }
  }, [page, filters.institution_name, tab]);

  useEffect(() => {
    return () => {
      dispatch(resetPage());
      dispatch(
        setFilter({
          key: "institution_name",
          value: [],
        })
      );
    };
  }, []);

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

  function handleApplyFilter() {
    dispatch(
      fetchInvestersProfiles(
        createDynamicURL(`${baseURL}/investor_profile/`, filters, page)
      )
    );

    dispatch(resetPage());
  }

  const onFilterClear = () => {
    dispatch(resetFilter());
    dispatch(
      fetchInvestersProfiles(
        createDynamicURL(
          `${baseURL}/investor_profile/`,
          undefined,
          { type: tab },
          page
        )
      )
    );
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
    dispatch(
      setFilter({
        key: "institution_name",
        value: [],
      })
    );

    dispatch(
      fetchInvestersProfiles(
        createDynamicURL(
          `${baseURL}/investor_profile/`,
          undefined,
          { type: tab },
          page
        )
      )
    );

    dispatch(
      fetchInvestersProfiles(
        createDynamicURL(`${baseURL}/investor_profile/`, undefined, page)
      )
    );

    dispatch(resetPage());
  };

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const profile of investersProfile || []) {
        const isValid = await checkImageUrl(profile?.image);
        tempValidImages[profile?.name] = isValid
          ? profile?.image
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [investersProfile]);

  const getFilterCount = useMemo(() => {
    const { institution_name, ...allFilters } = filters;
    return Object.values(allFilters).filter((value) => value !== "").length;
  }, [filters]);

  const handleSearch = (searchTerms: string[]) => {
    dispatch(
      setFilter({
        key: "institution_name",
        value: searchTerms,
      })
    );
    const tempFilter = { institution_name: searchTerms };
    dispatch(
      fetchInvestersProfiles(
        createDynamicURL(
          `${baseURL}/investor_profile/`,
          tempFilter,
          { type: tab },
          1
        )
      )
    );
  };
  useEffect(() => {
    handleSearch(searchTerms);
  }, [searchTerms, searchTerms?.length]);

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Investor Profile"]?.institution]);
    dispatch(
      setFilter({
        key: "region",
        value: user?.saved_search["Investor Profile"]?.region,
      })
    );
  };

  const saveSearch =  async () => {
    const res = await commonService.saveSearches({
      module: "Investor Profile",
      institution: searchTerms,
      region: filters["region"],
    });
    if (res?.Success) {
      dispatch(
        setSavedSearch({
          key: "Investor Profile",
          value: {
            institution: searchTerms,
            region: filters["region"],
          },
        })
      );
      toast.success(
        res?.Success || "Searched saved successfully"
      );
    }
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              Investor Profile
            </div>
            {user?.user_type === "Admin" && (
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
                <Button
                  onClick={() => {
                    setAddNewInvesterModalVisible(true);
                  }}
                  variant="primary"
                  className="bg-theme-2 border-bg-theme-2 group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
                >
                  <Lucide
                    icon="PenLine"
                    className="stroke-[1.3] w-4 h-4 mr-2"
                  />{" "}
                  Add New Investor
                </Button>
              </div>
            )}
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
                <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
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
                    <Button
                      onClick={saveSearch}
                    >
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
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                  <div className="hover:bg-slate-50 ml-2">
                    <Button onClick={getSavedSearches}>
                      Get Last Searches
                    </Button>
                  </div>

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
                            {getFilterCount}
                          </div>
                        </Popover.Button>
                        <Popover.Panel placement="bottom-end">
                          <div className="p-2">
                            <div className="mt-3">
                              <div className="text-left text-slate-500">
                                Region
                              </div>
                              <FormSelect
                                defaultValue={
                                  filters.region.length > 0
                                    ? filters.region
                                    : "Select Region"
                                }
                                className="flex-1 mt-2"
                                onChange={(
                                  e: React.ChangeEvent<HTMLSelectElement>
                                ) => {
                                  dispatch(
                                    setFilter({
                                      key: "region",
                                      value: e.target.value,
                                    })
                                  );
                                }}
                              >
                                <option disabled selected>
                                  Select Region
                                </option>
                                {investerProfileFilterOption.region.map(
                                  (region: string, index: number) => {
                                    return (
                                      <option key={index} value={region}>
                                        {region}
                                      </option>
                                    );
                                  }
                                )}
                              </FormSelect>
                            </div>
                            <div className="flex items-center mt-4">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  close();
                                  onFilterClear();
                                }}
                                className="w-32 ml-auto"
                              >
                                Clear
                              </Button>
                              <Button
                                onClick={handleApplyFilter}
                                variant="primary"
                                className="w-32 ml-2"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

              <div className="overflow-auto xl:overflow-visible px-5">
                <Tab.Group>
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
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
                        {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return (
                                <div className="relative flex items-center justify-between p-4 pl-0 border border-solid rounded-lg pr-5  my-2 shadow-md">
                                  <div className="ml-5 flex items-center">
                                    {/* <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center mr-3 text-xs">
                                      {(page - 1) * 10 + index + 1}
                                    </div> */}

                                    <div className="w-10 h-10 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                      {
                                        <img
                                          alt="Tailwise - Admin Dashboard Template"
                                          src={
                                            validImages[
                                              investersProfile?.name
                                            ] || userLinkedinImage
                                          }
                                        />
                                      }
                                    </div>

                                    <Tippy
                                      content={profile?.institution_name || ""}
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <div className="font-medium text-[0.94rem] truncate max-w-[200px] sm:max-w-[400px] w-full">
                                        {profile?.institution_name}
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
                            }
                          )}
                      </TableWrapper>
                    </Tab.Panel>
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
                        {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return (
                                <div className="relative flex items-center justify-between p-4 pl-0 border border-solid rounded-lg pr-5  my-2 shadow-md">
                                  <div className="ml-5 flex items-center">
                                    <div className="w-10 h-10 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                      {
                                        <img
                                          alt="Tailwise - Admin Dashboard Template"
                                          src={
                                            validImages[
                                              investersProfile?.name
                                            ] || userLinkedinImage
                                          }
                                        />
                                      }
                                    </div>
                                    {/* <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center mr-3 text-xs">
                                      {(page - 1) * 10 + index + 1}
                                    </div> */}
                                    <Tippy
                                      content={profile?.equity_firm_name || ""}
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <div className="font-medium text-[0.94rem] truncate max-w-[200px] sm:max-w-[400px] w-full">
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
                            }
                          )}
                      </TableWrapper>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
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
      </div>
    </>
  );
}

export default Main;
