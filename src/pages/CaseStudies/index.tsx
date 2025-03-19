import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormInput, FormSwitch } from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { convertToTitleCase, countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
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
import { useNavigate, useSearchParams } from "react-router-dom";

import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import { modifyRoute } from "@/stores/themeSlice";
import AddNewCaseStudies from "./Components/AddEditCaseStudies";
import { setInstitution } from "@/stores/dashboardSlice";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import useCaseStudyDropdowns from "@/hooks/useGetCaseStudiesDropdownValues";
import clsx from "clsx";
import FilterChips from "@/components/FilterChips";

interface CaseStudyFilter {
  keyword: string;
  market: string[];
  sector: string[];
  year: string[];
  institution_name?: string[];
  global_search?: any[];
  themes: string[];
  proposal_type: string[];
  vote: string[];
  company_name?: string[];
  approval_status: string;
  caspio_company_name: string;
  [key: string]: any;
  index?: string;
}
function CaseStudies() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    loading,
    caseStudies,
    page,
    totalPages,
    filters,
    count,
    isAllCompanySelected,
  } = useAppSelector((state) => state.caseStudies);

  const { apiDropdownOptions, loading: getDropdownLoader } =
    useCaseStudyDropdowns();
  const [searchParams] = useSearchParams();

  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const { instituteName: InstituteName } = useAppSelector(
    (state) => state.dashboard
  );

  const [searchTerms, setSearchTerms] = useState<string[]>(
    searchParams.get("institution_name")
      ? [searchParams.get("institution_name")]
      : filters.institution_name.length > 0
      ? filters.institution_name
      : []
  );

  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState<any | null>(
    null
  );

  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [addNewCaseStudyModalVisible, setAddNewCaseStudyModalVisible] =
    useState<boolean>(false);

  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);

  const {
    handleSubmit,
    control,

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
      approval_status: filters?.approval_status,
      caspio_company_name: filters?.caspio_company_name,
      index: filters?.index ?? " "
    },
  });

  const resetFormValues = () => {
    setValue("themes", []);
    setValue("keyword", "");
    setValue("market", []);
    setValue("sector", []);
    setValue("year", []);
    setValue("global_search", []);
    setValue("proposal_type", []);
    setValue("vote", []);
    setValue("approval_status", "");
    setValue("caspio_company_name", "");
    setValue("index", " ");
  };

  useEffect(() => {
    dispatch(
      setFilters({
        key: "global_search",
        value: isAllCompanySelected ? [] : [companyGlobalSearchName],
      })
    );

    dispatch(
      modifyRoute({
        route: "case-studies",
        type: isAllCompanySelected === true ? true : false,
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }

    const dynamicURL = createDynamicURL(
      `${baseURL}/case_studies/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchCaseStudies(dynamicURL));

    const { institution_name, global_search, ...restFilters } = filters;
    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );

    // const selectedChips = generateFilterChips(restFilters);
    setSelectedChipFilters(generateFilterChips(restFilters));

  }, [page, filters, InstituteName]);

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
    resetFormValues();
    dispatch(resetFilters());
    dispatch(resetPage());
    dispatch(
      setFilters({ key: "global_search", value: [companyGlobalSearchName] })
    );
  };

  const handleClearAllFilter = () => {
    setSearchTerms([]);
    // resetFormValues();
    // dispatch(resetFilters());
    dispatch(resetPage());
    dispatch(
      setFilters({ key: "global_search", value: [companyGlobalSearchName] })
    );
    dispatch(setInstitution(""));
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilters({ key: "institution_name", value: searchTerms }));

    dispatch(setInstitution(searchTerms[0]));
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
          ? Array.isArray(caseStudyFilters?.global_search) &&
            caseStudyFilters?.global_search.length > 0
            ? caseStudyFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );
    setIsFilterCollapse(!isFilterCollapse);
    dispatch(resetPage());
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
      setValue("approval_status", savedSearch.approval_status || "");
      setValue("caspio_company_name", savedSearch?.caspio_company_name || "");
      setValue("proposal_type", savedSearch?.proposal_type || []);
      setValue("vote", savedSearch?.vote || []);
      setValue("index", user?.saved_search?.index || "");
      dispatch(
        setAllFilters({
          keyword: savedSearch?.keyword || "",
          market: savedSearch?.market || [],
          sector: savedSearch?.sector || [],
          year: savedSearch?.year || [],
          themes: savedSearch?.themes || [],
          approval_status: savedSearch?.approval_status || "",
          caspio_company_name: savedSearch?.caspio_company_name || "",
          proposal_type: savedSearch?.proposal_type || [],
          vote: savedSearch?.vote || [],
          global_search: savedSearch?.global_search,
        index: user?.saved_search?.index,

        })
      );
      setIsFilterCollapse(true);
    }
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Case Studies",
      institution: searchTerms,
      market: filters.market || [],
      sector: filters.sector || [],
      themes: filters.themes || [],
      approval_status: filters.approval_status || "",
      caspio_company_name: filters.caspio_company_name || "",
      proposal_type: filters.proposal_type || [],
      vote: filters.vote || [],
      year: filters.year || [],
      keyword: filters.keyword || "",
      global_search: [companyGlobalSearchName],
      index: filters.index || "",

    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Case Studies",
          value: {
            institution: searchTerms,
            market: filters.market || [],
            sector: filters.sector || [],
            themes: filters.themes || [],
            approval_status: filters.approval_status || "",
            caspio_company_name: filters.caspio_company_name || "",
            proposal_type: filters.proposal_type || [],
            vote: filters.vote || [],
            year: filters.year || [],
            keyword: filters.keyword || "",
            index: filters.index || "",
            global_search: [companyGlobalSearchName],
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const onEditCaseStudiesClickHandler = (caseStudy: any) => {
    setSelectedCaseStudies(caseStudy);
    setAddNewCaseStudyModalVisible(true);
  };

  const multSearchUrl = useMemo(() => {
    if (isAllCompanySelected) {
      return `/get_case_studies_dropdown_values/`;
    } else {
      return `/get_case_studies_dropdown_values/?global_search=${
        companyGlobalSearchName || filters?.global_search?.[0]
      }`;
    }
  }, [isAllCompanySelected, companyGlobalSearchName, filters]);

  const handleViewAllChange = async (event: any) => {
    if(event?.target?.checked){
      setValue("year", ["2024"]);
      setValue("market", ["USA"]); 
      dispatch(
        setAllFilters({
          year: [2024],
          market: ["USA"],
        })
      );
      
    }
    else {
      setValue("year", []);
      setValue("market", []); 
      dispatch(
        setAllFilters({
          market: [],
          year: [],
          global_search: [],
        })
      );
    }
    try {
      dispatch( selectUnSelectAllCompany(!isAllCompanySelected));
    } catch (error) {}
  }

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...filters };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      if(removeKey === "index"){
        updatedFilters[removeKey] = " ";
      }else {
        updatedFilters[removeKey] = "";
      }
    }

    setValue(removeKey, updatedFilters[removeKey]);
    dispatch(setAllFilters(updatedFilters));
  }

  const handleFieldChange = (event, field) => {
    // let updatedFilters = { ...filters };
    // updatedFilters[field.name] = event?.target?.value;
    // dispatch(setAllFilters(updatedFilters));
    return field.onChange(event);
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
            {isAllCompanySelected === true ? (
              <div className="font-semibold text-xl">All Case Studies</div>
            ) : (
              <div className="font-semibold text-xl">Case Studies</div>
            )}

            <div className="flex items-center justify-center">
              <Tippy
                content="All Companies"
                options={{
                  theme: "light",
                }}
              >
                <div className="">
                  <FormSwitch>
                    <label className="text-md mr-3 font-semibold">
                      View All
                    </label>
                    <FormSwitch.Input
                      id="checkbox-switch-7"
                      type="checkbox"
                      checked={isAllCompanySelected}
                      onChange={async (e) => {
                        handleViewAllChange(e)
                      }}
                    />
                    <FormSwitch.Label htmlFor="checkbox-switch-7"></FormSwitch.Label>
                  </FormSwitch>
                </div>
              </Tippy>
              {user?.user_type === "Admin" && (
                <div className="flex justify-end my-3">
                  <Button
                    onClick={() => {
                      setSelectedCaseStudies(null);
                      setAddNewCaseStudyModalVisible(true);
                    }}
                    variant="primary"
                    className="bg-theme-2 border-bg-theme-2 "
                  >
                    <Lucide
                      icon="PenLine"
                      className="stroke-[1.3] w-4 h-4 mr-2"
                    />
                    Add New Case Studies
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col px-5 pt-5 sm:flex-row gap-y-2">
                <div className="flex">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    onSearchSelect={() => {
                      dispatch(resetPage());
                    }}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url={multSearchUrl}
                    getOptionKey="institution_name"
                    placeHolder="Search Institution"
                    onSearchChange={resetPage}
                    isSingle={true}
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

              {
                selectedChipFilters?.length > 0 &&
                <>
                  <FilterChips filters={selectedChipFilters} onRemove={handleRemoveChip} />
                </>
              }

            {count > 0 && (
                <h2 className="flex items-end font-semibold justify-end my-2 text-[13px] md:ml-auto mx-5 mb-1">
                  Count: {count}
                </h2>
              )}
              
              {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="filter-section mb-5">
                    <div className="flex items-center justify-end mt-2 mb-4">
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
                    <div
                      className={`grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 ${
                        isAllCompanySelected
                          ? "md:grid-cols-3"
                          : " md:grid-cols-2"
                      }`}
                    >
                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                        <span className="font-semibold">Year</span>
                          
                          {apiDropdownOptions.year.length > 0 && (
                            <FormCheck className="mr-2">
                              <FormCheck.Label>Select All</FormCheck.Label>
                              <FormCheck.Input
                                className="ml-1"
                                id="year"
                                checked={
                                  apiDropdownOptions.year.length ===
                                  watch("year")?.length
                                }
                                type="checkbox"
                                onChange={(e) =>
                                  e.target.checked
                                    ? setValue("year", apiDropdownOptions.year)
                                    : setValue("year", [])
                                }
                              />
                            </FormCheck>
                          )}
                        </div>
                        <Controller
                          name="year"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => handleFieldChange(value, field)}
                              options={{ placeholder: "Select Year" }}
                              className="w-full"
                              multiple
                            
                            >
                              {getDropdownLoader ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                apiDropdownOptions.year.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Index</span>
                        </div>
                        <Controller
                          name="index"
                          control={control}
                          defaultValue={""}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || ""}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Index",
                              }}
                              className="w-full"
                              multiple={false}
                            >
                              {getDropdownLoader ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.index?.map(
                                    (index: string) => {
                                      return (
                                        <option value={index}>
                                          {index}
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

                      

                      {isAllCompanySelected === true && (
                        <div className="w-full mx-2">
                          <div className="w-full">
                            <div className="text-left text-slate-500 ">
                            <span className="font-semibold">Select Companies</span>
                            </div>
                            <div className=" mt-1">
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
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {isAllCompanySelected && (
                        <div className="mx-2">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Country</span>
                            {apiDropdownOptions.market.length > 0 && (
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="market"
                                  checked={
                                    apiDropdownOptions.market.length ===
                                    watch("market")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) =>
                                    e.target.checked
                                      ? setValue(
                                          "market",
                                          apiDropdownOptions.market
                                        )
                                      : setValue("market", [])
                                  }
                                />
                              </FormCheck>
                            )}
                          </div>
                          <Controller
                            name="market"
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                              <TomSelect
                                value={field.value || []}
                                // onChange={(value) => field.onChange(value)}
                                onChange={(value) => handleFieldChange(value, field)}
                                options={{ placeholder: "Select Country" }}
                                className="w-full"
                                multiple
                              >
                                {getDropdownLoader ? (
                                  <option value="--" disabled>
                                    Loading...
                                  </option>
                                ) : (
                                  apiDropdownOptions.market.map((market) => (
                                    <option key={market} value={market}>
                                      {market}
                                    </option>
                                  ))
                                )}
                              </TomSelect>
                            )}
                          />
                        </div>
                      )}

                      {isAllCompanySelected === true && (
                        <div className="mx-2">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Sector</span>
                            {apiDropdownOptions.sector.length > 0 && (
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="sector"
                                  checked={
                                    apiDropdownOptions.sector.length ===
                                    watch("sector")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) =>
                                    e.target.checked
                                      ? setValue(
                                          "sector",
                                          apiDropdownOptions.sector
                                        )
                                      : setValue("sector", [])
                                  }
                                />
                              </FormCheck>
                            )}
                          </div>
                          <Controller
                            name="sector"
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                              <TomSelect
                                value={field.value || []}
                                // onChange={(value) => field.onChange(value)}
                                onChange={(value) => handleFieldChange(value, field)}
                                options={{ placeholder: "Select Sector" }}
                                className="w-full"
                                multiple
                              >
                                {getDropdownLoader ? (
                                  <option value="--" disabled>
                                    Loading...
                                  </option>
                                ) : (
                                  apiDropdownOptions.sector.map((sector) => (
                                    <option key={sector} value={sector}>
                                      {sector}
                                    </option>
                                  ))
                                )}
                              </TomSelect>
                            )}
                          />
                        </div>
                      )}

                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Themes</span>
                          {apiDropdownOptions.themes.length > 0 && (
                            <FormCheck className="mr-2">
                              <FormCheck.Label>Select All</FormCheck.Label>
                              <FormCheck.Input
                                className="ml-1"
                                id="themes"
                                checked={
                                  apiDropdownOptions.themes.length ===
                                  watch("themes")?.length
                                }
                                type="checkbox"
                                onChange={(e) =>
                                  e.target.checked
                                    ? setValue(
                                        "themes",
                                        apiDropdownOptions.themes
                                      )
                                    : setValue("themes", [])
                                }
                              />
                            </FormCheck>
                          )}
                        </div>
                        <Controller
                          name="themes"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              // onChange={(value) => field.onChange(value)}
                              onChange={(value) => handleFieldChange(value, field)}
                              options={{ placeholder: "Select Themes" }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                apiDropdownOptions.themes.map((theme) => (
                                  <option key={theme} value={theme}>
                                    {theme}
                                  </option>
                                ))
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      {user?.user_type === "Admin" && (
                        <div className="mx-2">
                          <div className="w-full">
                            <div className="text-left text-slate-500 ">
                          <span className="font-semibold">Alternate Companies</span>
                            </div>
                            <div className=" mt-1">
                              <Controller
                                name="caspio_company_name"
                                control={control}
                                render={({ field }) => (
                                  <FormInput
                                    placeholder="Enter Alternate Company Name"
                                    {...field}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {user.user_type === "Admin" && (
                        <>
                          <div className="mx-2">
                            <div className="flex-1 w-full text-slate-500">
                          <span className="font-semibold">Approval Status</span>
                              <div className="mt-2 flex flex-col sm:flex-row">
                                <Controller
                                  name="approval_status"
                                  control={control}
                                  render={({ field }) => (
                                    <>
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="radio-switch-4"
                                          type="radio"
                                          {...field}
                                          value="Approved"
                                          checked={field.value === "Approved"}
                                          onChange={(e) =>
                                            field.onChange("Approved")
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="radio-switch-4"
                                          className="ml-2"
                                        >
                                          Approved
                                        </FormCheck.Label>
                                      </FormCheck>
                                      <FormCheck className="flex items-center mt-2 sm:mt-0 mr-2">
                                        <FormCheck.Input
                                          id="radio-switch-5"
                                          type="radio"
                                          {...field}
                                          value="Pending"
                                          checked={field.value === "Pending"}
                                          onChange={(e) =>
                                            field.onChange("Pending")
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="radio-switch-5"
                                          className="ml-2"
                                        >
                                          Pending
                                        </FormCheck.Label>
                                      </FormCheck>
                                      <FormCheck className="flex items-center mt-2 sm:mt-0">
                                        <FormCheck.Input
                                          id="radio-switch-5"
                                          type="radio"
                                          {...field}
                                          value="Return To Analyst"
                                          checked={
                                            field.value === "Return To Analyst"
                                          }
                                          onChange={(e) =>
                                            field.onChange("Return To Analyst")
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="radio-switch-5"
                                          className="ml-2"
                                        >
                                          Returned to Analyst
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}


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
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Year
                          </Table.Td>
                          {isAllCompanySelected && (
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                              Company
                            </Table.Td>
                          )}
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Theme
                          </Table.Td>

                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Industry
                          </Table.Td>
                          <Table.Td className="py-2 flex items-center justify-center font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Details
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {caseStudies?.length > 0 &&
                          caseStudies?.map((item: any) => {
                            return (
                              <Table.Tr
                                key={item?.id}
                                className="[&_td]:last:border-b-0"
                              >
                                <Table.Td>
                                  <div className="w-full flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                    {item?.institution_logo_url ? (
                                      <>
                                        {/* <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                          <img
                                            alt="Institution Logo"
                                            className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                            src={item?.institution_logo_url}
                                            content={
                                              item?.institution_name || ""
                                            }
                                          />
                                        </div> */}

                                        <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]">
                                          <img
                                            alt="Institution Logo"
                                            className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                            src={item?.institution_logo_url}
                                            content={
                                              item?.institution_name || ""
                                            }
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                        <img
                                          alt="ZMH Analytics"
                                          className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={investorIcon}
                                        />
                                        <a
                                          href=""
                                          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full w-7 h-7"
                                        ></a>
                                      </div>
                                    )}
                                    <div className="ml-4 ">
                                      <p className="font-medium whitespace-normal line-clamp-2 text-wrap w-30">
                                        {item?.institution_name}
                                      </p>
                                    </div>
                                  </div>
                                </Table.Td>
                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                  {item?.year}
                                </Table.Td>
                                {isAllCompanySelected && (
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                    {item?.company_name ||
                                      item?.caspio_company_name}
                                  </Table.Td>
                                )}
                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                  {item?.esg_themes}
                                </Table.Td>

                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                  {item?.company_sector}
                                </Table.Td>
                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 ">
                                  <div className="flex gap-3 justify-center">
                                    <Tippy
                                      content="See Details"
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

                                    {user?.user_type === "Admin" && (
                                      <Tippy
                                        content="Edit"
                                        options={{ theme: "light" }}
                                      >
                                        <Lucide
                                          onClick={() =>
                                            onEditCaseStudiesClickHandler(item)
                                          }
                                          icon="PenLine"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                        />
                                      </Tippy>
                                    )}
                                  </div>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                      </Table.Tbody>
                      {caseStudies?.length === 0 && (
                        <div className="w-full">
                          <h1 className="mt-3">No Records Found..</h1>
                        </div>
                      )}
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

                {addNewCaseStudyModalVisible && (
                  <AddNewCaseStudies
                    addNewCaseStudyModalVisible={addNewCaseStudyModalVisible}
                    setAddNewCaseStudyModalVisible={
                      setAddNewCaseStudyModalVisible
                    }
                    selectedCaseStudies={selectedCaseStudies}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CaseStudies;
