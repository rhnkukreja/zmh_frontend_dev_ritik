import Button from "@/components/Base/Button";
import { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchPeerAnalysis,
  resetFilter,
  resetPage,
  setFilter,
  setPage,
} from "@/stores/peerAnalysisSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";

import AddNewInvesterProfile from "../InvestorProfiles/components/AddNewInvester";
import Table from "@/components/Base/Table";
import { TypesPeerAnalysis } from "@/types/peerAnalysis";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import Lucide from "@/components/Base/Lucide";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
TomSelect;

interface PeerAnalysisFilter {
  category: string[];

  year: string[];
}
function PeerAnalysis() {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PeerAnalysisFilter>();
  
  const dispatch: AppDispatch = useAppDispatch();

  const [applyFilters, setApplyFilters] = useState<PeerAnalysisFilter | undefined>(undefined);
  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] = useState<boolean>(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const [apiDropdownOptions] = useState<PeerAnalysisFilter>({
    category: ["Social", "Governance", "Environment"],
    year: ["2023", "2024"],
  });

  const { loading, peerAnalysisData, page, totalPages, filters } = useAppSelector((state) => state.peerAnalysis);
  const { user, companyGlobalSearchName } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
    // Set the global search filter only if the companyGlobalSearchName changes
    if (companyGlobalSearchName) {
      dispatch(setFilter({ key: "global_search", value: [companyGlobalSearchName] }));
    }
  }, [companyGlobalSearchName]);

  useEffect(() => {
    // Fetch peer analysis only if institution_name or global_search filters are present
    if (filters.institution_name.length > 0 || filters.global_search?.length > 0) {
      dispatch(fetchPeerAnalysis(createDynamicURL(`${baseURL}/peer_analysis/`, filters, undefined, page)));
    }
  }, [page, filters?.institution_name, filters?.global_search]);

  useEffect(() => {
    return () => {
      // Reset page and clear filters when the component unmounts
      dispatch(resetPage());
      dispatch(setFilter({ key: "institution_name", value: [] }));
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

  const handleApplyFilter = () => {
    dispatch(fetchPeerAnalysis(createDynamicURL(`${baseURL}/peer_analysis/`, filters, undefined, page)));
    dispatch(resetPage());
  };

  const onFilterClear = () => {
    reset();
    dispatch(resetFilter());
    dispatch(fetchPeerAnalysis(createDynamicURL(`${baseURL}/peer_analysis/`, { ...applyFilters }, undefined , 1)));
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
    dispatch(setFilter({ key: "global_search", value: [companyGlobalSearchName] }));
    dispatch(resetPage());
  };

  const handleSearch = useCallback((searchTerms: string[]) => {
    dispatch(setFilter({ key: "institution_name", value: searchTerms }));
    const updatedFilters = { ...filters, institution_name: searchTerms };
    dispatch(fetchPeerAnalysis(createDynamicURL(`${baseURL}/peer_analysis/`, updatedFilters, undefined, 1)));
  }, [dispatch, filters]);

  useEffect(() => {
    if (searchTerms?.length || filters?.global_search?.length || applyFilters) {
      handleSearch(searchTerms);
    }
  }, [searchTerms, filters?.global_search, applyFilters, handleSearch]);

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Peer Analysis"]?.institution]);
    dispatch(setFilter({ key: "global_search", value: user?.saved_search["Peer Analysis"]?.global_search }));
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Peer Analysis",
      institution: searchTerms,
      global_search: filters["global_search"],
    });

    if (res?.Success) {
      dispatch(
        setSavedSearch({
          key: "Peer Analysis",
          value: {
            institution: searchTerms,
            global_search: filters["global_search"],
          },
        })
      );
      toast.success(res?.Success || "Search saved successfully");
    }
  };

  const onSubmit = async (peerAnalysisFilters: PeerAnalysisFilter) => {
    setApplyFilters({ ...peerAnalysisFilters });
    const validKeysCount = Object.keys(peerAnalysisFilters).filter((key) => {
      const value = peerAnalysisFilters[key as keyof PeerAnalysisFilter];
      return Array.isArray(value) ? value.length !== 0 : value !== undefined && value !== "";
    })?.length;

    setFiltersLength(validKeysCount);
  };
  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="font-semibold text-xl ">Peer Analysis</div>
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
              <div className="flex flex-col p-4 sm:items-center sm:flex-row gap-y-2">
                <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url="/investor_profile/?type=profiles"
                    getOptionKey="institution_name"
                    placeHolder="Search Institution"
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
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                  {user?.saved_search?.["Peer Analysis"] !== undefined && (
                    <div className="hover:bg-slate-50 ml-2">
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
                          // onClick={handleCollapseFilter}
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
                        <Popover.Panel placement="bottom-end">
                          <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="p-2">
                              <div className="mt-3">
                                <div className="w-full  my-2">
                                  <div className="text-left text-slate-500 flex justify-between mb-1">
                                    Year
                                    {apiDropdownOptions?.year?.length > 0 && (
                                      <div>
                                        <FormCheck className="mr-2">
                                          <FormCheck.Label>
                                            Select All
                                          </FormCheck.Label>
                                          <FormCheck.Input
                                            className="ml-1"
                                            id={`year`}
                                            checked={
                                              apiDropdownOptions?.year
                                                ?.length ===
                                              watch("year")?.length
                                            }
                                            type="checkbox"
                                            onChange={(e) => {
                                              if (e.target.checked === true) {
                                                setValue(
                                                  "year",
                                                  apiDropdownOptions?.year
                                                );
                                              } else {
                                                setValue("year", []);
                                              }
                                            }}
                                          />
                                        </FormCheck>
                                      </div>
                                    )}
                                  </div>
                                  <Controller
                                    name="year"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                      <TomSelect
                                        value={field.value || []}
                                        onChange={(value) => {
                                          field.onChange(value);
                                        }}
                                        options={{
                                          placeholder: "Select Year",
                                        }}
                                        className="w-full"
                                        multiple
                                      >
                                        <>
                                          {apiDropdownOptions?.year?.map(
                                            (year: string) => {
                                              return (
                                                <option value={year}>
                                                  {year}
                                                </option>
                                              );
                                            }
                                          )}
                                        </>
                                      </TomSelect>
                                    )}
                                  />
                                </div>

                                <div className="w-full  my-2">
                                  <div className="text-left text-slate-500 flex justify-between mb-1">
                                    Category
                                    {apiDropdownOptions?.category?.length >
                                      0 && (
                                      <div>
                                        <FormCheck className="mr-2">
                                          <FormCheck.Label>
                                            Select All
                                          </FormCheck.Label>
                                          <FormCheck.Input
                                            className="ml-1"
                                            id={`category`}
                                            checked={
                                              apiDropdownOptions.category
                                                .length ===
                                              watch("category")?.length
                                            }
                                            type="checkbox"
                                            onChange={(e) => {
                                              if (e.target.checked === true) {
                                                setValue(
                                                  "category",
                                                  apiDropdownOptions.category
                                                );
                                              } else {
                                                setValue("category", []);
                                              }
                                            }}
                                          />
                                        </FormCheck>
                                      </div>
                                    )}
                                  </div>
                                  <Controller
                                    name="category"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                      <TomSelect
                                        value={field.value || []}
                                        onChange={(value) => {
                                          field.onChange(value);
                                        }}
                                        options={{
                                          placeholder: "Select Category",
                                        }}
                                        className="w-full"
                                        multiple
                                      >
                                        <>
                                          {apiDropdownOptions?.category.length >
                                            0 &&
                                            apiDropdownOptions?.category?.map(
                                              (category: string) => {
                                                return (
                                                  <option value={category}>
                                                    {category}
                                                  </option>
                                                );
                                              }
                                            )}
                                        </>
                                      </TomSelect>
                                    )}
                                  />
                                </div>
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
                          </form>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

              <div className=" px-5">
                <TableWrapper isLoading={loading}>
                  {/* {investersProfile?.length > 0 &&
                          investersProfile.map(
                            (profile: InvestersProfile, index: number) => {
                              return ( */}
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Institution Name
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Year
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Company
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Country
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Sector
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Govt. List
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Env. List
                          </Table.Td>

                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Social List
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {peerAnalysisData?.length > 0 &&
                          peerAnalysisData?.map((peer: TypesPeerAnalysis) => (
                            <Table.Tr key={peer?.id}>
                              <Table.Td>
                                <div className=" flex flex-row justify-start items-center ">
                                  {peer?.institution_logo_url ? (
                                    <>
                                      <div className="w-8 h-8 image-fit zoom-in object-contain">
                                        <Tippy
                                          as="img"
                                          alt="Tailwise - Admin Dashboard Template"
                                          className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={peer?.institution_logo_url}
                                          content={peer?.institution_name || ""}
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

                                  <div className="ml-4">
                                    <p className="font-medium whitespace-nowrap">
                                      {peer?.institution_name}
                                    </p>
                                  </div>
                                </div>
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.year}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.company_name}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.caspio_company_country}
                              </Table.Td>

                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                {peer?.company_sector}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.gov_list}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.env_list}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.soc_list}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                </TableWrapper>
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

export default PeerAnalysis;
