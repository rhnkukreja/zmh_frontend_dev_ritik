import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormInput, FormSwitch } from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import Table from "@/components/Base/Table";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import {
  fetchCaseStudies,
  setFilters,
  setPage,
  resetFilters,
  setAllFilters,
  selectUnSelectAllCompany,
  resetPage,
} from "@/stores/caseStudySlice";
import { useNavigate } from "react-router-dom";
import { caseStudiesService } from "@/services/caseStudies";
import { FlterDropdown } from "@/types/casestudy";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";

function CaseStudies() {
  interface CaseStudyFilter {
    keyword: string;
    market: string[];
    sector: string[];
    year: string[];
    institution_name?: string[];
    global_search?: string[];
    themes: string[];
    proposal_type: string[];
    vote: string[];
    company_name?: string[];
    [key: string]: any;
  }

  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [apiDropdownOptions, setApiDropdownOptions] = useState<FlterDropdown>({
    institution: [],
    market: [],
    proposal_type: [],
    sector: [],
    themes: [],
    vote: [],
    year: [],
  });

  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);

  const [filtersLength, setFiltersLength] = useState<number>(0);

  const {
    loading,
    caseStudies,
    page,
    totalPages,
    filters,
    isAllCompanySelected,
  } = useAppSelector((state) => state.caseStudies);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CaseStudyFilter>({
    defaultValues: {
      themes: filters?.themes,
      keyword: filters?.keyword,
      market: filters?.market,
      sector: filters?.sector,
      year: filters?.year,
      institution_name: filters?.institution_name,
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
      proposal_type: filters?.proposal_type,
      vote: filters?.vote,
    },
  });

  const getAllCaseStudyDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res = await caseStudiesService.getCaseStudiesDropdownValues();
      if (res.result) {
        setApiDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    dispatch(
      setFilters({
        key: "global_search",
        value: isAllCompanySelected
          ? [...filters?.global_search]
          : [companyGlobalSearchName],
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  useEffect(() => {
    getAllCaseStudyDropdowns();
  }, []);

  useEffect(() => {
    if (!filters?.global_search) return;
    dispatch(
      fetchCaseStudies(
        createDynamicURL(`${baseURL}/case_studies/`, filters, undefined, page)
      )
    );
    setFiltersLength(countValidFilters(filters));
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
    dispatch(resetFilters());
    dispatch(
      setFilters({ key: "global_search", value: [companyGlobalSearchName] })
    );
  };

  const handleClearAllFilter = () => {
    setSearchTerms([]);
    reset();
    dispatch(resetFilters());
    dispatch(resetPage());
    dispatch(
      setFilters({ key: "global_search", value: [companyGlobalSearchName] })
    );
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilters({ key: "institution_name", value: searchTerms }));
  };

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const onSubmit = async (caseStudyFilters: CaseStudyFilter) => {
    dispatch(
      setAllFilters({
        ...caseStudyFilters,
        institution_name: searchTerms,
        global_search: isAllCompanySelected
          ? Array.isArray(caseStudyFilters?.global_search)
            ? caseStudyFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );
    setFiltersLength(countValidFilters(filters));
  };

  const getSavedSearches = () => {
    if (user?.saved_search["Case Studies"]) {
      const savedSearch = user.saved_search["Case Studies"];

      setSearchTerms([...savedSearch?.institution]);
      setValue("keyword", savedSearch?.keyword || "");
      setValue("market", savedSearch?.market || []);
      setValue("sector", savedSearch?.sector || []);
      setValue("year", savedSearch?.year || []);
      setValue("themes", savedSearch.themes || []);
      setValue("proposal_type", savedSearch?.proposal_type || []);
      setValue("vote", savedSearch?.vote || []);
      setAllFilters({
        keyword: savedSearch?.keyword || "",
        market: savedSearch?.market || [],
        sector: savedSearch?.sector || [],
        year: savedSearch?.year || [],
        themes: savedSearch?.themes || [],
        proposal_type: savedSearch?.proposal_type || [],
        vote: savedSearch?.vote || [],
        global_search: savedSearch?.global_search,
      });
    }
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Case Studies",
      institution: searchTerms,
      market: watch("market") || [],
      sector: watch("sector") || [],
      themes: watch("themes") || [],
      proposal_type: watch("proposal_type") || [],
      vote: watch("vote") || [],
      year: watch("year") || [],
      keyword: watch("keyword") || "",
      global_search: [companyGlobalSearchName],
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Case Studies",
          value: {
            institution: searchTerms,
            market: watch("market") || [],
            sector: watch("sector") || [],
            themes: watch("themes") || [],
            proposal_type: watch("proposal_type") || [],
            vote: watch("vote") || [],
            year: watch("year") || [],
            keyword: watch("keyword") || "",
            global_search: [companyGlobalSearchName],
          },
        })
      );
      toast.success("Searched saved successfully");
    }
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
            <div className="font-semibold text-xl">Case Studies</div>

            <div className="flex items-center">
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
                    url="/case_studies/"
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
                  {user?.saved_search?.["Case Studies"] !== undefined && (
                    <div className="hover:bg-slate-50 ">
                      <Button onClick={getSavedSearches}>
                        Previous Search
                      </Button>
                    </div>
                  )}
                  <Popover className="inline-block">
                    <>
                      <Popover.Button
                        as={Button}
                        variant="outline-secondary"
                        className="w-full sm:w-auto"
                        onClick={handleCollapseFilter}
                      >
                        <Lucide
                          icon="ArrowDownWideNarrow"
                          className="stroke-[1.3] w-4 h-4 mr-2"
                        />
                        Filters
                        <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                          {filtersLength}
                        </div>
                      </Popover.Button>
                    </>
                  </Popover>
                </div>
              </div>

              {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="filter-section mb-5">
                    <div className="flex items-center justify-between xs:flex-col md:flex-row">
                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 ">
                          Keyword{" "}
                        </div>
                        <Controller
                          name="keyword"
                          control={control}
                          defaultValue=""
                          render={({ field }) => (
                            <FormInput
                              value={field.value?.toString() || ""}
                              onChange={(value) => field.onChange(value)}
                              type="text"
                              className="col-span-4 flex-1 mt-2"
                              placeholder="Search Keyword"
                              aria-label="default input inline 1"
                            />
                          )}
                        />
                      </div>

                      {isAllCompanySelected === true && (
                        <>
                          <div className=" w-full mx-2">
                            <div className="text-left text-slate-500 flex justify-between mb-1">
                              {" "}
                              Market
                              {apiDropdownOptions?.market?.length > 0 && (
                                <div>
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>
                                      Select All
                                    </FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      id={`market`}
                                      checked={
                                        apiDropdownOptions.market.length ===
                                        watch("market")?.length
                                      }
                                      type="checkbox"
                                      onChange={(e) => {
                                        if (e.target.checked === true) {
                                          setValue(
                                            "market",
                                            apiDropdownOptions.market
                                          );
                                        } else {
                                          setValue("market", []);
                                        }
                                      }}
                                    />
                                  </FormCheck>
                                </div>
                              )}
                            </div>
                            <Controller
                              name="market"
                              control={control}
                              defaultValue={[]}
                              render={({ field }) => (
                                <TomSelect
                                  value={field.value || []}
                                  onChange={(value) => {
                                    field.onChange(value);
                                  }}
                                  options={{
                                    placeholder: "Select Market",
                                  }}
                                  className="w-full"
                                  multiple
                                >
                                  {getDropdownLoader === true ? (
                                    <option value="--" disabled>
                                      Loading...
                                    </option>
                                  ) : (
                                    <>
                                      {apiDropdownOptions?.market?.map(
                                        (market: string) => {
                                          return (
                                            <option value={market} key={market}>
                                              {market}
                                            </option>
                                          );
                                        }
                                      )}
                                    </>
                                  )}
                                </TomSelect>
                              )}
                            />
                          </div>

                          <div className=" w-full mx-2">
                            <div className="text-left text-slate-500 flex justify-between mb-1">
                              Sector
                              {apiDropdownOptions?.sector?.length > 0 && (
                                <div>
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>
                                      Select All
                                    </FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      id={`sector`}
                                      checked={
                                        apiDropdownOptions.sector.length ===
                                        watch("sector")?.length
                                      }
                                      type="checkbox"
                                      onChange={(e) => {
                                        if (e.target.checked === true) {
                                          setValue(
                                            "sector",
                                            apiDropdownOptions.sector
                                          );
                                        } else {
                                          setValue("sector", []);
                                        }
                                      }}
                                    />
                                  </FormCheck>
                                </div>
                              )}
                            </div>
                            <Controller
                              name="sector"
                              control={control}
                              defaultValue={[]}
                              render={({ field }) => (
                                <TomSelect
                                  value={field.value || []}
                                  onChange={(value) => {
                                    field.onChange(value);
                                  }}
                                  options={{
                                    placeholder: "Select Sector",
                                  }}
                                  className="w-full"
                                  multiple
                                >
                                  {getDropdownLoader === true ? (
                                    <option value="--" disabled>
                                      Loading...
                                    </option>
                                  ) : (
                                    <>
                                      {apiDropdownOptions?.sector?.map(
                                        (sector) => (
                                          <option key={sector} value={sector}>
                                            {sector}
                                          </option>
                                        )
                                      )}
                                    </>
                                  )}
                                </TomSelect>
                              )}
                            />
                          </div>
                        </>
                      )}

                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Year
                          {apiDropdownOptions.year.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`year`}
                                  checked={
                                    apiDropdownOptions.year.length ===
                                    watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue("year", apiDropdownOptions.year);
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
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.year?.map(
                                    (year: string) => {
                                      return (
                                        <option value={year}>{year}</option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 xs:flex-col sm:flex-col md:flex-row">
                      {isAllCompanySelected === true && (
                        <div className="w-full mx-2">
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
                                    onChange={(value) => {
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
                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Themes
                          {apiDropdownOptions?.themes?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`themes`}
                                  checked={
                                    apiDropdownOptions.themes.length ===
                                    watch("themes")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "themes",
                                        apiDropdownOptions.themes
                                      );
                                    } else {
                                      setValue("themes", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="themes"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Themes",
                              }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.themes.length > 0 &&
                                    apiDropdownOptions?.themes?.map(
                                      (themes: string) => {
                                        return (
                                          <option value={themes}>
                                            {themes}
                                          </option>
                                        );
                                      }
                                    )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Proposal Type
                          {apiDropdownOptions?.proposal_type?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`proposal_type`}
                                  checked={
                                    apiDropdownOptions?.proposal_type
                                      ?.length ===
                                    watch("proposal_type")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "proposal_type",
                                        apiDropdownOptions.proposal_type
                                      );
                                    } else {
                                      setValue("proposal_type", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="proposal_type"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Proposal Type",
                              }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.proposal_type?.map(
                                    (proposal_type: string) => {
                                      return (
                                        <option value={proposal_type}>
                                          {proposal_type}
                                        </option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Vote
                          {apiDropdownOptions?.vote?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`vote`}
                                  checked={
                                    apiDropdownOptions?.vote?.length ===
                                    watch("vote")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue("vote", apiDropdownOptions.vote);
                                    } else {
                                      setValue("vote", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="vote"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Vote",
                              }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.vote?.map(
                                    (vote: string) => {
                                      return (
                                        <option value={vote}>{vote}</option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-4">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onFilterClear();
                        }}
                        className="w-32 mx-2"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        className="w-32 mx-2"
                        type="submit"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              <div className=" px-5">
                <TableWrapper isLoading={loading}>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Institution Name
                          </Table.Td>
                          {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Company
                          </Table.Td> */}
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Theme
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Year
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Industry
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Actions
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {caseStudies?.length > 0 &&
                          caseStudies?.map((item: any) => (
                            <Table.Tr
                              key={item?.id}
                              className="[&_td]:last:border-b-0"
                            >
                              <Table.Td className="flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                {item?.institution_logo_url ? (
                                  <>
                                    <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                      <img
                                        alt="Institution Logo"
                                        className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                        src={item?.institution_logo_url}
                                        content={item?.institution_name || ""}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                    <Lucide
                                      icon="User"
                                      className="w-[65%] h-[65%] fill-slate-300/70 -mt-1.5 stroke-[0.5] stroke-slate-400/50"
                                    />
                                    <a
                                      href=""
                                      className="absolute bottom-0 right-0 flex items-center justify-center rounded-full w-7 h-7"
                                    ></a>
                                  </div>
                                )}
                                <div className="ml-4 max-w-[150px]">
                                  <p className="font-medium whitespace-normal line-clamp-2">
                                    {item?.institution_name}
                                  </p>
                                </div>
                              </Table.Td>
                              {/* <Table.Td className="py-2 border-dashed text-nowrap dark:bg-darkmode-600">
                                {item?.company_name}
                              </Table.Td> */}
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                {item?.esg_themes}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                {item?.year}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                {item?.industry}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                <div className="flex gap-3 justify-center">
                                  <Tippy
                                    content="View"
                                    options={{ theme: "light" }}
                                  >
                                    <Lucide
                                      onClick={() => {
                                        navigate(`/case-studies/${item?.id}`);
                                      }}
                                      icon="Eye"
                                      className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                    />
                                  </Tippy>
                                </div>
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
        </div>
      </div>
    </>
  );
}

export default CaseStudies;
