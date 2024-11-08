import Button from "@/components/Base/Button";
import { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchPeerAnalysis,
  resetFilter,
  resetPage,
  selectUnSelectAllCompany,
  setAllFilters,
  setFilter,
  setPage,
} from "@/stores/peerAnalysisSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL } from "@/utils/helper";
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

import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormSwitch } from "@/components/Base/Form";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import CompanySelect from "@/components/ReactSelectAsync";

interface PeerAnalysisFilter {
  category: string[];
  year: string[];
  institution_name?: string[];
  global_search?: string[];
}

function PeerAnalysis() {
  const dispatch: AppDispatch = useAppDispatch();

  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] =
    useState<boolean>(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const [apiDropdownOptions] = useState<PeerAnalysisFilter>({
    category: ["Social", "Governance", "Environment"],
    year: ["2023", "2024"],
  });

  const {
    loading,
    peerAnalysisData,
    page,
    totalPages,
    filters,
    isAllCompanySelected,
  } = useAppSelector((state) => state.peerAnalysis);
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PeerAnalysisFilter>({
    defaultValues: {
      year: filters?.year,
      institution_name: filters?.institution_name,
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
      category: filters.category,
    },
  });

  const resetFormValues = () => {
    setValue("year", []);
    setValue("category", []);
    setValue("global_search", []);
  };

  useEffect(() => {
    dispatch(
      setFilter({
        key: "global_search",
        value: isAllCompanySelected ? [] : [companyGlobalSearchName],
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }

    const dynamicURL = createDynamicURL(
      `${baseURL}/peer_analysis/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchPeerAnalysis(dynamicURL));
    const { institution_name, global_search, ...restFilters } = filters;
    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );
  }, [page, filters]);

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

  const onFilterClear = () => {
    reset();
    resetFormValues();
    dispatch(resetFilter());
    dispatch(
      setFilter({ key: "global_search", value: [companyGlobalSearchName] })
    );
    dispatch(resetPage());
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    resetFormValues();
    reset();
    setSearchTerms([]);
    dispatch(
      setFilter({ key: "global_search", value: [companyGlobalSearchName] })
    );
    dispatch(resetPage());
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilter({ key: "institution_name", value: searchTerms }));
    dispatch(resetPage());
  };

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Peer Analysis"]?.institution]);
    setValue("year", user?.saved_search?.year || []);
    setValue("category", user?.saved_search?.category || []);
    dispatch(
      setAllFilters({
        year: user?.saved_search?.year || [],
        category: user?.saved_search?.category || [],
        global_search: user?.saved_search?.global_search,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Peer Analysis",
      institution: searchTerms,
      global_search: filters["global_search"],
      year: watch("year") || [],
      category: watch("category") || [],
    });

    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Peer Analysis",
          value: {
            institution: searchTerms,
            global_search: filters["global_search"],
            year: watch("year") || [],
            category: watch("category") || [],
          },
        })
      );
      toast.success(res?.user_id || "Search saved successfully");
    }
  };

  const onSubmit = async (peerAnalysisFilters: PeerAnalysisFilter) => {
    dispatch(
      setAllFilters({
        ...peerAnalysisFilters,
        institution_name: searchTerms,
        global_search: isAllCompanySelected
          ? Array.isArray(peerAnalysisFilters?.global_search)
            ? peerAnalysisFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );
    dispatch(resetPage());
  };
  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
            <div className="font-semibold text-xl">Engagement Detail</div>

            <div className="flex items-center">
            <h3 className="text-md mr-3 font-semibold">View All</h3>

              <Tippy
                content="All Companies"
                options={{
                  theme: "light",
                }}
              >
                <div className="mt-2">
                  <FormSwitch>
                    <FormSwitch.Input
                      id="checkbox-switch-7"
                      type="checkbox"
                      checked={isAllCompanySelected}
                      onChange={async (e) => {
                        try {
                          dispatch(
                            selectUnSelectAllCompany(!isAllCompanySelected)
                          );
                        } catch (error) {}
                      }}
                    />
                    <FormSwitch.Label htmlFor="checkbox-switch-7"></FormSwitch.Label>
                  </FormSwitch>
                </div>
              </Tippy>
            </div>
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col p-4 sm:items-center sm:flex-row gap-y-2">
                <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url="/peer_analysis/"
                    getOptionKey="institution_name"
                    placeHolder="Search Institution"
                    onSearchChange={resetPage}
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

                                <div className="w-full  my-2">
                                  {isAllCompanySelected === true && (
                                    <div className="w-full ">
                                      <div className="w-full mt-1">
                                        <div className="text-left text-slate-500 ">
                                          Select Comapnies
                                        </div>
                                        <div className=" mt-2">
                                          <Controller
                                            name="global_search"
                                            control={control}
                                            render={({ field }) => (
                                              <CompanySelect
                                                value={field.value}
                                                onChange={(value: any) => {
                                                  field.onChange(value);
                                                }}
                                                isMulti={true}
                                                className="any"
                                              />
                                            )}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
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
                                  variant="primary"
                                  className="w-32 ml-2"
                                  type="submit"
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
                          {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Company
                          </Table.Td> */}
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
                                      <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                        <img
                                          alt="ZMH Analytics"
                                          className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={peer?.institution_logo_url}
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
                              {/* <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {peer?.company_name}
                              </Table.Td> */}
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
