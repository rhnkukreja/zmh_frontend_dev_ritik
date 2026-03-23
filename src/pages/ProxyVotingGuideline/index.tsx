import Lucide from "@/components/Base/Lucide";
import { Popover, Dialog } from "@/components/Base/Headless";
import { proxyVotingGuidelineService } from "@/services/proxyVotingGuideline";

import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import React, { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchProxyVotingGuidelines,
  resetFilter,
  resetPage,
  setPage,
  setFilter,
  setAllFilters,
} from "@/stores/proxyVotingGuidelineSlice";
import TomSelect from "@/components/Base/TomSelect";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";

import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import { AddEditPolicyGuideline } from "./components/AddEditProxyVotingGuideline";
import PdfViewer from "@/components/PdfView";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { Controller, useForm } from "react-hook-form";
import { FormCheck } from "@/components/Base/Form";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import aiIcon from "../../assets/images/zmh-images/ai-Icon.png";
import { useNavigate } from "react-router-dom";
import UploadFile from "@/components/UploadFile";
import FilterChips from "@/components/FilterChips";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Pill from "@/components/Pill";
import MultiSelectDropdown from "@/components/Base/MultiSelect";

interface ProxyGuidelineFilter {
  year: string[];
  region: string[];
}

function ProxyGuideline() {
  const dispatch: AppDispatch = useAppDispatch();

  const {
    loading,
    proxyVotingGuidelines,
    count,
    page,
    totalPages,
    filters,
    guidelineFilterOptions,
  } = useAppSelector((state) => state.proxyVotingGuideline);
  const { user } = useAppSelector((state) => state.authentiction);

  const { handleSubmit, reset, setValue, watch, control } =
    useForm<ProxyGuidelineFilter>({
      defaultValues: {
        year: [...filters.year],
        region: [...filters.region],
      },
    });
  const resetFormValues = () => {
    setValue("year", []);
    setValue("region", []);
  };

  const [
    addNewProxyVotingGuidelineVisible,
    setAddNewProxyVotingGuidelineVisible,
  ] = useState<boolean>(false);
  const [selectedProxyVotingGuideline, setSelectedProxyVotingGuideline] =
    useState<ProxyVotingGuideline | null>(null);

  const [pdfVisible, setPdfVisible] = useState<boolean>(false);
  const [uploadFileVisible, setUploadFileVisible] = useState<boolean>(false);
  const [proxyId, setProxyId] = useState<number>(0);

  const [currentPdfDoc, setCurrentPdfDoc] = useState<string>("");
  const [currentPdfName, setCurrentPdfName] = useState<string>("");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(new Set());

  // Auto-expand all institutions with multiple policies on mount
  useEffect(() => {
    const autoExpand = new Set<string>();
    groupedGuidelines.forEach((guidelines, institutionName) => {
      if (guidelines.length > 1) {
        autoExpand.add(institutionName);
      }
    });
    setExpandedInstitutions(autoExpand);
  }, [proxyVotingGuidelines]);
  const [documentsModalVisible, setDocumentsModalVisible] = useState<boolean>(false);
  const [keyChangesModalVisible, setKeyChangesModalVisible] = useState<boolean>(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [selectedKeyChanges, setSelectedKeyChanges] = useState<string>("");
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [institutionDocuments, setInstitutionDocuments] = useState<any[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/proxy_voting_guidelines/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchProxyVotingGuidelines(dynamicURL));

    const { institution_name_raw, ...restFilters } = filters;
    setFiltersLength(countValidFilters(restFilters));
    setSelectedChipFilters(generateFilterChips(filters));

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

  const gotoDetailPage = (pdf: string, pdf_name: string) => {
    setCurrentPdfDoc(pdf);
    setCurrentPdfName(pdf_name);
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(
      setFilter({
        key: "institution_name_raw",
        value: searchTerms,
      })
    );
  };

  const onFilterClear = () => {
    resetFormValues();
    dispatch(resetFilter());
    dispatch(resetPage());
    // reset();
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
    resetFormValues();
    dispatch(resetPage());
    // reset();
  };

  useEffect(() => {
    if (!addNewProxyVotingGuidelineVisible) {
      setSelectedProxyVotingGuideline(null);
    }
  }, [addNewProxyVotingGuidelineVisible]);

  const onEditClickHandler = (guideline: ProxyVotingGuideline) => {
    setSelectedProxyVotingGuideline(guideline);
    setAddNewProxyVotingGuidelineVisible(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await proxyVotingGuidelineService.deleteProxyVotingGuideline(itemToDelete.id);

      toast.success("Voting Guideline deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);

      // Refresh data
      const dynamicURL = createDynamicURL(
        `${baseURL}/proxy_voting_guidelines/`,
        filters,
        undefined,
        page
      );
      dispatch(fetchProxyVotingGuidelines(dynamicURL));
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Something went wrong!");
    } finally {
      setIsDeleting(false);
    }
  };

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Voting Guidelines"]?.institution]);
    setValue("year", user?.saved_search?.year || []);
    setValue("region", user?.saved_search?.region || []);
    dispatch(
      setFilter({
        key: "year",
        value: user?.saved_search["Voting Guidelines"]?.year,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Voting Guidelines",
      institution: searchTerms,
      year: filters["year"],
      region: filters["region"],
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Voting Guidelines",
          value: {
            institution: searchTerms,
            year: filters["year"],
            // region: filters["region"],
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const onSubmit = async (ProxyGuideline: ProxyGuidelineFilter) => {
    dispatch(
      setAllFilters({ ...ProxyGuideline, institution_name_raw: searchTerms })
    );

    dispatch(resetPage());
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...filters };

    // Handle institution_name_raw removal specially
    if (removeKey === "institution_name_raw") {
      const updatedSearchTerms = searchTerms.filter(term => term !== removeValue);
      setSearchTerms(updatedSearchTerms);
      updatedFilters[removeKey] = updatedSearchTerms;
    } else {
      if (Array.isArray(updatedFilters[removeKey])) {
        updatedFilters[removeKey] = updatedFilters[removeKey].filter(
          (item) => item !== removeValue
        );
      } else if (updatedFilters[removeKey] === removeValue) {
        updatedFilters[removeKey] = "";
      }
      setValue(removeKey, updatedFilters[removeKey]);
    }

    dispatch(setAllFilters(updatedFilters));
  }
  // Group guidelines by institution_name_raw
  const groupedGuidelines = useMemo(() => {
    const grouped = new Map<string, ProxyVotingGuideline[]>();
    
    proxyVotingGuidelines.forEach((guideline) => {
      const key = guideline.institution_name_raw;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(guideline);
    });
    
    return grouped;
  }, [proxyVotingGuidelines]);
  
  const toggleInstitutionExpand = (institutionName: string) => {
    setExpandedInstitutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(institutionName)) {
        newSet.delete(institutionName);
      } else {
        newSet.add(institutionName);
      }
      return newSet;
    });
  };
  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex justify-between items-center bg-white px-4 py-4 pl-6 bg-white shadow sticky top-16 z-40">
            <div className="font-semibold text-xl">Voting Guidelines</div>
            <div className="flex gap-3">
              <a
                className="p-2 bg-primary border-white border-2 text-white rounded-md"
                href="https://ai.zmhadvisors.com/ai-assistant/voting-guidelines"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center justify-center cursor-pointer">
                  <img src={aiIcon} alt="ai icon" className="w-4 h-4" />
                  <span className="ml-2 font-semibold hidden xl:flex">
                    AI Assistant: Voting Guidelines
                  </span>
                </div>
              </a>
              <a
                className="p-2 bg-primary
                     border-white border-2 text-white rounded-md"

                onClick={() => {
                  gotoDetailPage(
                    'https://zmh-official-website-media-bucket.s3.us-east-2.amazonaws.com/ZMH_Overboarding_Document/Overboarding+Policy+for+Top+Investors+2025.pdf',
                    'Key Overboarding Policies'
                  );

                  setPdfVisible(true);
                }}
              // onClick={(event: React.MouseEvent) => {
              //   event.preventDefault();
              //   window.open('')
              // }}
              >
                <div className="flex items-center justify-center cursor-pointer" >
                  <Lucide
                    icon="File"
                    className="stroke-[2] w-4 h-4 text-white "
                  />
                  <span className="ml-2 font-semibold hidden xl:flex">
                    Key Overboarding Policies
                  </span>
                </div>
              </a>
            </div>
            {/* {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
                <Button
                  onClick={() => {
                    setAddNewProxyVotingGuidelineVisible(true);
                  }}
                  variant="primary"
                  className="bg-theme-2 border-bg-theme-2"
                >
                  <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />
                  Add New Proxy Voting Guideline
                </Button>
              </div>
            )} */}
          </div>

          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col px-5 pt-5  sm:flex-row gap-y-2 items-center">
                <div className="flex">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    onSearchSelect={() => {
                      dispatch(resetPage());
                    }}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url="/proxy_voting_guidelines/"
                    getOptionKey="institution_name_raw"
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
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto mb-7">
                  {user?.saved_search?.["Voting Guidelines"] !== undefined && (
                    <div className="hover:bg-slate-50 ">
                      <Button onClick={getSavedSearches}>
                        Previous Search
                      </Button>
                    </div>
                  )}

                  {/* Clear and Apply buttons outside filter */}

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
                            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                              {/* Filter Content */}
                              <div className="mb-6">
                                <h4 className="text-base font-semibold text-slate-700">Filters</h4>
                              </div>
                              <div className="w-full">
                                <Button
                                  variant="outline-secondary"
                                  onClick={() => {
                                    onFilterClear();
                                  }}
                                  className="w-full flex items-center gap-2 mb-3"
                                  type="button"
                                >
                                  <MdOutlineClear className="text-lg mr-1" /> Clear
                                </Button>

                                <Button
                                  variant="primary"
                                  onClick={handleSubmit(onSubmit)}
                                  className="w-full flex items-center gap-2 mb-4"
                                >
                                  <FaSearch className="text-lg" /> Apply
                                </Button>
                              </div>
                              <div>
                                <div className="w-full  my-2">
                                  <div className="text-left text-slate-500 flex justify-between mb-1">
                                    <span className="flex items-center gap-2 text-slate-600 font-semibold">
                                      <FaCalendarAlt className="text-gray-400" /> Year
                                    </span>
                                    {guidelineFilterOptions?.year?.length >
                                      0 && (
                                        <div>
                                          <FormCheck className="mr-2">
                                            <FormCheck.Label>
                                              Select All
                                            </FormCheck.Label>
                                            <FormCheck.Input
                                              className="ml-1"
                                              id={`year`}
                                              checked={
                                                guidelineFilterOptions?.year
                                                  ?.length ===
                                                watch("year")?.length
                                              }
                                              type="checkbox"
                                              onChange={(e) => {
                                                if (e.target.checked === true) {
                                                  setValue(
                                                    "year",
                                                    guidelineFilterOptions?.year
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
                                      <MultiSelectDropdown
                                        data={guidelineFilterOptions?.year}
                                        placeholder="Select Year"
                                        loading={guidelineFilterOptions?.year?.length === 0}
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
                                      //     placeholder: "Select Year",
                                      //   }}
                                      //   className="w-full"
                                      //   multiple
                                      // >
                                      //   <>
                                      //     {guidelineFilterOptions?.year?.map(
                                      //       (year: string) => {
                                      //         return (
                                      //           <option value={year}>
                                      //             {year}
                                      //           </option>
                                      //         );
                                      //       }
                                      //     )}
                                      //   </>
                                      // </TomSelect>
                                    )}
                                  />
                                </div>
                                <div className="w-full  my-2">
                                  <div className="text-left text-slate-500 flex justify-between mb-1">
                                    <span className="flex items-center gap-2 text-slate-600 font-semibold">
                                      <FaLayerGroup className="text-gray-400" /> Region
                                    </span>
                                    {guidelineFilterOptions?.region?.length >
                                      0 && (
                                        <div>
                                          <FormCheck className="mr-2">
                                            <FormCheck.Label>
                                              Select All
                                            </FormCheck.Label>
                                            <FormCheck.Input
                                              className="ml-1"
                                              id={`region`}
                                              checked={
                                                guidelineFilterOptions.region
                                                  .length ===
                                                watch("region")?.length
                                              }
                                              type="checkbox"
                                              onChange={(e) => {
                                                if (e.target.checked === true) {
                                                  setValue(
                                                    "region",
                                                    guidelineFilterOptions.region
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
                                        data={guidelineFilterOptions?.region}
                                        placeholder="Select Region"
                                        loading={guidelineFilterOptions?.region?.length === 0}
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
                                      //     placeholder: "Select Region",
                                      //   }}
                                      //   className="w-full"
                                      //   multiple
                                      // >
                                      //   <>
                                      //     {guidelineFilterOptions?.region
                                      //       .length > 0 &&
                                      //       guidelineFilterOptions?.region?.map(
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

                <TableWrapper isLoading={loading}>
                  <div className="overflow-auto max-h-[400px] rounded-lg">
                    <Table>
                      <Table.Thead>
                        <Table.Tr className="bg-primary text-white">
                          <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                            Year
                          </Table.Td>
                          <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                            Institution
                          </Table.Td>
                          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                            <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                              Category
                            </Table.Td>
                          )}
                          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                            <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                              Sub Category
                            </Table.Td>
                          )}
                          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                            <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                              Section
                            </Table.Td>
                          )}
                          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                            <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                              Policy Guideline
                            </Table.Td>
                          )}
                          {/* <Table.Td className="py-2 font-medium bg-slate-50   text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Active
                        </Table.Td> */}

                          <Table.Td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px', width: '60px'}}>
                            Key Changes
                          </Table.Td>
                          <Table.Td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px', width: '60px'}}>
                            Voting Guidelines
                          </Table.Td>
                          <Table.Td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px', width: '60px'}}>
                            All Documents
                          </Table.Td>
                          {/* <Table.Td className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>
                            Actions
                          </Table.Td> */}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Array.from(groupedGuidelines.entries()).map(([institutionName, guidelines]) => {
                          const isExpanded = expandedInstitutions.has(institutionName);
                          const firstGuideline = guidelines[0];
                          
                          return (
                            <React.Fragment key={institutionName}>
                              {/* Main Institution Row */}
                              <Table.Tr
                                className="border-b border-slate-200 dark:border-slate-600 transition-all hover:bg-primary/5 cursor-pointer bg-slate-50"
                              >
                                <Table.Td className="py-2 px-3">
                                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                    {firstGuideline?.year}
                                  </span>
                                </Table.Td>
                                <Table.Td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    {guidelines.length > 1 && (
                                      <Lucide
                                        icon={isExpanded ? "ChevronDown" : "ChevronRight"}
                                        className="w-4 h-4 cursor-pointer text-slate-600"
                                        onClick={() => toggleInstitutionExpand(institutionName)}
                                      />
                                    )}
                                    <p className="font-medium">
                                      {firstGuideline?.institution_name.split(' - ')[0]}
                                    </p>
                                  </div>
                                </Table.Td>
                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <Table.Td className="py-2 px-3" colSpan={4}>
                                  </Table.Td>
                                )}
                                {/* Key Changes Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center">
                                    {firstGuideline?.voting_guidelines_key_changes ? (
                                      <div 
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-slate-900 cursor-pointer"
                                        onClick={() => {
                                          setSelectedKeyChanges(firstGuideline.voting_guidelines_key_changes);
                                          setSelectedPolicyName(firstGuideline?.institution_name || "");
                                          setSelectedYear(firstGuideline?.year || "");
                                          setKeyChangesModalVisible(true);
                                        }}
                                      >
                                        <Lucide icon="GitCompare" className="w-4 h-4" />
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </div>
                                </Table.Td>
                                {/* Voting Guidelines Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {guidelines.length === 1 && (
                                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 cursor-pointer">
                                        <Lucide
                                          onClick={() => {
                                            gotoDetailPage(
                                              firstGuideline?.voting_guidelines_pdf_url!,
                                              firstGuideline?.voting_guidelines_pdf_name!
                                            );
                                            setPdfVisible(true);
                                          }}
                                          icon="Eye"
                                          className="w-4 h-4"
                                        />
                                      </div>
                                    )}
                                    {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                      <>
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 cursor-pointer">
                                          <Lucide
                                            onClick={() => {
                                              setUploadFileVisible(true);
                                              setProxyId(firstGuideline?.id);
                                            }}
                                            icon="Upload"
                                            className="w-4 h-4"
                                          />
                                        </div>
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 cursor-pointer">
                                          <Lucide
                                            onClick={() => {
                                              onEditClickHandler(firstGuideline);
                                            }}
                                            icon="PenLine"
                                            className="w-4 h-4"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </Table.Td>
                                {/* All Documents Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 cursor-pointer"
                                      onClick={() => {
                                        window.open(`/investor-company-details/${firstGuideline.institution}`, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      <Lucide icon="FileText" className="w-4 h-4" />
                                    </div>
                                  </div>
                                </Table.Td>
                              </Table.Tr>
                              
                              {/* Expanded Sub-Rows */}
                              {isExpanded && guidelines.map((guideline: ProxyVotingGuideline, index: number) => (
                              <Table.Tr
                                key={guideline?.id}
                                className="border-b border-slate-200 dark:border-slate-600 transition-all hover:bg-primary/5 cursor-pointer"
                              >
                                <Table.Td className="py-2 px-3">
                                  {guideline?.year !== firstGuideline?.year && (
                                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                      {guideline?.year}
                                    </span>
                                  )}
                                </Table.Td>
                                <Table.Td className="py-2 px-3 pl-10">
                                  <p 
                                    className="font-medium cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                      gotoDetailPage(
                                        guideline?.voting_guidelines_pdf_url!,
                                        guideline?.voting_guidelines_pdf_name!
                                      );
                                      setPdfVisible(true);
                                    }}
                                  >
                                    {guideline?.institution_name}
                                  </p>
                                </Table.Td>
                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <Table.Td className="py-2 px-3">
                                    {guideline?.category && (
                                      <div className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                        {guideline?.category}
                                      </div>
                                    )}
                                  </Table.Td>
                                )}

                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <Table.Td className="py-2 px-3" style={{fontSize: '14px'}}>
                                    {guideline?.sub_category && (
                                      <>{guideline?.sub_category}</>
                                    )}
                                  </Table.Td>
                                )}

                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <Table.Td className="py-2 px-3" style={{fontSize: '14px'}}>
                                    {guideline?.section && (
                                      <>{guideline?.section}</>
                                    )}
                                  </Table.Td>
                                )}

                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <Table.Td className="py-2 px-3" style={{fontSize: '14px'}}>
                                    {guideline?.policy_guidelines && (
                                      <>{guideline?.policy_guidelines}</>
                                    )}
                                  </Table.Td>
                                )}

                                {/* Key Changes Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center">
                                    <span className="text-gray-300">-</span>
                                  </div>
                                </Table.Td>
                                {/* Voting Guidelines Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 cursor-pointer">
                                      <Lucide
                                        onClick={() => {
                                          gotoDetailPage(
                                            guideline?.voting_guidelines_pdf_url!,
                                            guideline?.voting_guidelines_pdf_name!
                                          );
                                          setPdfVisible(true);
                                        }}
                                        icon="Eye"
                                        className="w-4 h-4"
                                      />
                                    </div>
                                    {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                      <>
                                        <Tippy
                                          content="Upload"
                                          options={{
                                            theme: "light",
                                          }}
                                        >
                                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                            <Lucide
                                              onClick={() => {
                                                setUploadFileVisible(true);
                                                setProxyId(guideline?.id);
                                              }}
                                              icon="Upload"
                                              className="text-primary"
                                            />
                                          </div>
                                        </Tippy>
                                        <Tippy
                                          content="Edit"
                                          options={{
                                            theme: "light",
                                          }}
                                        >
                                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                            <Lucide
                                              onClick={() => {
                                                onEditClickHandler(guideline);
                                              }}
                                              icon="PenLine"
                                              className="text-primary"
                                            />
                                          </div>
                                        </Tippy>
                                        <Tippy
                                          content="Delete"
                                          options={{
                                            theme: "light",
                                          }}
                                        >
                                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                            <Lucide
                                              onClick={() => {
                                                setItemToDelete(guideline);
                                                setIsDeleteModalOpen(true);
                                              }}
                                              icon="Trash2"
                                              className="text-danger"
                                            />
                                          </div>
                                        </Tippy>
                                      </>
                                    )}
                                  </div>
                                </Table.Td>
                                {/* All Documents Column */}
                                <Table.Td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center">
                                    <span className="text-gray-300">-</span>
                                  </div>
                                </Table.Td>
                              </Table.Tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </div>
                </TableWrapper>
              </div>
              {totalPages > 1 && (
                <div className="px-5 pb-5 mt-auto">
                  <CPagination
                    page={page}
                    totalPages={totalPages}
                    handleNextPage={handleNextPage}
                    handlePageChange={handlePageChange}
                    handlePreviousPage={handlePreviousPage}
                  />
                </div>
              )}
            </div>
          </div>
          {addNewProxyVotingGuidelineVisible && (
            <AddEditPolicyGuideline
              addNewProxyVotingGuidelineVisible={
                addNewProxyVotingGuidelineVisible
              }
              setAddNewProxyVotingGuidelineVisible={
                setAddNewProxyVotingGuidelineVisible
              }
              selectedProxyVotingGuideline={selectedProxyVotingGuideline}
            />
          )}

          {pdfVisible && (
            <PdfViewer
              setPdfVisible={setPdfVisible}
              pdfVisible={pdfVisible}
              file={currentPdfDoc}
              file_name={currentPdfName}
            />
          )}

          {uploadFileVisible && (
            <UploadFile
              setUploadFileVisible={setUploadFileVisible}
              uploadFileVisible={uploadFileVisible}
              proxyId={proxyId}
            // file={currentPdfDoc}
            // file_name={currentPdfName}
            />
          )}

          {isDeleteModalOpen && (
            <Dialog
              size="md"
              open={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false);
              }}
            >
              <Dialog.Panel className="p-0 text-center">
                <div className="p-5 text-center">
                  <Lucide
                    icon="XCircle"
                    className="w-16 h-16 mx-auto mt-3 text-danger"
                  />
                  <div className="mt-5 text-3xl">Are you sure?</div>
                  <div className="mt-2 text-slate-500">
                    Do you really want to delete this voting guideline? <br />
                    This action cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                    }}
                    className="w-24 mr-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="w-24"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}

          {/* Documents Modal */}
          {documentsModalVisible && (
            <Dialog
              open={documentsModalVisible}
              onClose={() => setDocumentsModalVisible(false)}
              size="lg"
            >
              <Dialog.Panel>
                <Dialog.Title className="flex justify-between items-center bg-primary p-6 !text-white rounded-t-lg">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">Key Documents</h2>
                    <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                      <span>{selectedPolicyName}</span>
                      <span>•</span>
                      <span>{selectedYear}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDocumentsModalVisible(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </Dialog.Title>
                <Dialog.Description className="p-8 overflow-y-auto max-h-[70vh]">
                  {institutionDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {institutionDocuments.map((doc: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-6 h-6">
                              <Lucide icon="FileText" className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-base">{doc.name || doc.title || 'Document'}</p>
                              {doc.description && (
                                <p className="text-sm text-slate-500 mt-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const url = doc.link || doc.url || doc.file_url;
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                          >
                            <Lucide icon="ExternalLink" className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Lucide icon="FileSearch" className="w-16 h-16 text-slate-200 mb-4" />
                      <p className="text-lg font-semibold text-slate-700">No Documents Available</p>
                      <p className="text-slate-500 mt-2">This institution has no documents on file.</p>
                    </div>
                  )}
                </Dialog.Description>
                <div className="p-6 border-t bg-slate-50 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => setDocumentsModalVisible(false)}
                    className="px-8"
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}

          {/* Key Changes Modal */}
          {keyChangesModalVisible && (
            <Dialog
              open={keyChangesModalVisible}
              onClose={() => setKeyChangesModalVisible(false)}
              size="lg"
            >
              <Dialog.Panel>
                <Dialog.Title className="flex justify-between items-center bg-primary p-6 !text-white rounded-t-lg">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedPolicyName}</h2>
                    <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                      <span>{selectedYear}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setKeyChangesModalVisible(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </Dialog.Title>
                <Dialog.Description className="p-8 overflow-y-auto max-h-[70vh]">
                  <div 
                    className="prose prose-sm max-w-none text-slate-600 leading-relaxed [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80"
                    dangerouslySetInnerHTML={{ __html: selectedKeyChanges }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A' || target.closest('a')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const link = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
                        if (link && link.href) {
                          window.open(link.href, '_blank', 'noopener,noreferrer');
                        }
                      }
                    }}
                  />
                </Dialog.Description>
                <div className="p-6 border-t bg-slate-50 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => setKeyChangesModalVisible(false)}
                    className="px-8"
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}
        </div >
      </div >
    </>
  );
}

export default ProxyGuideline;