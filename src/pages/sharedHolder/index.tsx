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
  resetInvestorProfiles,
  resetPage,
  setPage,
} from "@/stores/investersProfileSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { InvestersProfile } from "@/types/investerProfiles";
import { useLocation, useNavigate } from "react-router-dom";
import { setFilter } from "@/stores/investersProfileSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import AddNewInvesterProfile from "../InvestorProfiles/components/AddNewInvester";
import Table from "@/components/Base/Table";

function ShareHolderProposal() {

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

  useEffect(() => {
    if (filters.institution_name.length > 0) {
      dispatch(
        fetchInvestersProfiles(
          createDynamicURL(`${baseURL}/investor_profile/`, filters, { type: tab })
        )
      );
    } else {
      dispatch(
        fetchInvestersProfiles(
          createDynamicURL(`${baseURL}/investor_profile/`, filters, { type: tab }, page)
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
        createDynamicURL(`${baseURL}/investor_profile/`, undefined, { type: tab }, page)
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
        createDynamicURL(`${baseURL}/investor_profile/`, undefined, { type: tab }, page)
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
        createDynamicURL(`${baseURL}/investor_profile/`, tempFilter, { type: tab }, 1)
      )
    );
  };
  useEffect(() => {
    handleSearch(searchTerms)
  }, [searchTerms, searchTerms?.length])

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              Shareholder Proposal
            </div>
            {/* {user?.user_type === "Admin" && (
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
                  />
                  Add New Investor
                </Button>
              </div>
            )} */}
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
                <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    placeHolder="Search Company"
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
                          className="text-slate-500 cursor-pointer	"
                        />
                      </Tippy>
                      {/* <span className="text-slate-500">Clear Filters</span> */}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
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
                        <Popover.Panel placement="bottom-end" className="sm:w-[350px] lg:w-[400px] ">
                          <div className="p-2">
                            <div className="">
                              <label className="font-bold">Year</label>
                              <div className="flex items-center justify-between mt-2 sm:flex-row">
                                <FormCheck className="mr-2">
                                  <FormCheck.Input id="checkbox-switch-4" type="checkbox" value="" />
                                  <FormCheck.Label htmlFor="checkbox-switch-4">
                                    2024
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="checkbox-switch-5" type="checkbox" value="" />
                                  <FormCheck.Label htmlFor="checkbox-switch-5">
                                    2023
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="checkbox-switch-6" type="checkbox" value="" />
                                  <FormCheck.Label htmlFor="checkbox-switch-6">
                                    2022
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="checkbox-switch-6" type="checkbox" value="" />
                                  <FormCheck.Label htmlFor="checkbox-switch-6">
                                    2021
                                  </FormCheck.Label>
                                </FormCheck>
                              </div>
                            </div>

                            <hr className="my-5" />

                            <div className="">
                              <label className="font-bold">Status</label>
                              <div className="flex items-center justify-between mt-2 sm:flex-row">
                                <FormCheck className="mr-2">
                                  <FormCheck.Input id="radio-switch-4" type="radio" name="horizontal_radio_button" value="horizontal-radio-chris-evans" />
                                  <FormCheck.Label htmlFor="radio-switch-4">
                                    All
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="radio-switch-5" type="radio" name="horizontal_radio_button" value="horizontal-radio-liam-neeson" />
                                  <FormCheck.Label htmlFor="radio-switch-5">
                                    Pass
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="radio-switch-6" type="radio" name="horizontal_radio_button" value="horizontal-radio-daniel-craig" />
                                  <FormCheck.Label htmlFor="radio-switch-6">
                                    Fail
                                  </FormCheck.Label>
                                </FormCheck>
                                <FormCheck className="mt-2 mr-2 sm:mt-0">
                                  <FormCheck.Input id="radio-switch-6" type="radio" name="horizontal_radio_button" value="horizontal-radio-daniel-craig" />
                                  <FormCheck.Label htmlFor="radio-switch-6">
                                    Withdrawn
                                  </FormCheck.Label>
                                </FormCheck>
                              </div>
                            </div>
                            <hr className="my-3" />
                            <div className="flex items-center justify-between">
                              <div className="w-full mr-2 ">
                                <div className="mt-3">
                                  <div className="text-left text-slate-500"> Proponent </div>
                                  <FormSelect
                                    defaultValue={filters.region.length > 0 ? filters.region : "Select Region"}
                                    className="flex-1 mt-2"
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                      dispatch(setFilter({ key: "region", value: e.target.value }));
                                    }} >

                                    <option disabled selected>
                                      Select Proponent
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
                                <div className="mt-3">
                                  <div className="text-left text-slate-500"> Category </div>
                                  <FormSelect
                                    defaultValue={filters.region.length > 0 ? filters.region : "Select Region"}
                                    className="flex-1 mt-2"
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                      dispatch(setFilter({ key: "region", value: e.target.value }));
                                    }} >

                                    <option disabled selected>
                                      Select Category
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
                              </div>

                              <div className="w-full mr-2">
                                <div className="mt-3">
                                  <div className="text-left text-slate-500"> Sub Category </div>
                                  <FormSelect
                                    defaultValue={filters.region.length > 0 ? filters.region : "Select Region"}
                                    className="flex-1 mt-2"
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                      dispatch(setFilter({ key: "region", value: e.target.value }));
                                    }} >

                                    <option disabled selected>
                                      Select Sub Category
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
                                <div className="mt-3">
                                  <div className="text-left text-slate-500"> Keyword </div>
                                  <FormSelect
                                    defaultValue={filters.region.length > 0 ? filters.region : "Select Region"}
                                    className="flex-1 mt-2"
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                      dispatch(setFilter({ key: "region", value: e.target.value }));
                                    }} >

                                    <option disabled selected>
                                      Select Keyword
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
                              </div>
                            </div>

                            <div className="flex items-center justify-evenly mt-4">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  close();
                                  onFilterClear();
                                }}
                                className="w-full mx-2"
                              >
                                Clear
                              </Button>
                              <Button
                                onClick={handleApplyFilter}
                                variant="primary"
                                className="w-full mx-2"
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
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("investor")
                        dispatch(resetInvestorProfiles())
                      }}>
                        Shareholder Proposals Year
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("investor")
                        dispatch(resetInvestorProfiles())
                      }}>
                        No Action Letter Year
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("investor")
                        dispatch(resetInvestorProfiles())
                      }}>
                        Withdrawn Year
                      </Tab.Button>
                    </Tab>

                  </Tab.List>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
                        {/* {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return ( */}
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Year
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Company
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Category
                              </Table.Td>
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Sub Category
                                </Table.Td>
                              )}
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proponent
                                </Table.Td>
                              )}
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proposal Name
                                </Table.Td>
                              )}
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Outcome/Percentage for
                                </Table.Td>
                              )}

                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            <Table.Tr key={1} className="[&_td]:last:border-b-0">
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                2024
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Apple Inc.
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Social
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Diversity
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                National Center for Public
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                EEO policy
                              </Table.Td>

                              <Table.Td className=" flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                Fall 0.94%
                              </Table.Td>

                            </Table.Tr>
                          </Table.Tbody>
                        </Table>
                      </TableWrapper>
                    </Tab.Panel>

                  </Tab.Panels>


                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
                        {/* {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return ( */}
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Year
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Company
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Category
                              </Table.Td>
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Sub Category
                                </Table.Td>
                              )}
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proponent
                                </Table.Td>
                              )}

                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Outcome
                                </Table.Td>
                              )}

                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            <Table.Tr key={1} className="[&_td]:last:border-b-0">
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                2024
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Fortune Brands Innovations, Inc.
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Corporate Governance
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Simple Majority Voting
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                John Chevedden
                              </Table.Td>

                              <Table.Td className=" flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                Exclude under 14a-8f
                              </Table.Td>

                            </Table.Tr>
                          </Table.Tbody>
                        </Table>
                      </TableWrapper>
                    </Tab.Panel>

                  </Tab.Panels>




                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
                        {/* {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return ( */}
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Year
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Company
                              </Table.Td>
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proponent
                                </Table.Td>
                              )}
                              {user?.user_type === "Admin" && (
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Outcome
                                </Table.Td>
                              )}
                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            <Table.Tr key={1} className="[&_td]:last:border-b-0">
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                2021
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Bank of America Corp
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Trillium Asset Management
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                Withdrwan
                              </Table.Td>

                              {/* <Table.Td className=" flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                    Fall 0.94%
                    </Table.Td>
                     */}
                            </Table.Tr>
                          </Table.Tbody>
                        </Table>
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
  )
}

export default ShareHolderProposal;
