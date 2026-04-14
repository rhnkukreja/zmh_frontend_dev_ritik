import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useState } from "react";
import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
  fetchInstitutions,
  resetFilter,
  resetPage,
  setFilter,
  setPage,
} from "@/stores/institutionSlice";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate } from "react-router-dom";
import { Institutions } from "@/types/institutions";
import { AddEditInstitution } from "./components/CreateAndEditInstitution";
import TomSelect from "@/components/Base/TomSelect";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { Controller, useForm } from "react-hook-form";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import FilterChips from "@/components/FilterChips";
import AddDocumentModal from "./components/AddDocumentModal";
import AddNewCaseStudies from "@/pages/CaseStudies/Components/AddEditCaseStudies";
import AddEngagementDetailsModal from "@/pages/PeerAnalysis/components/AddEngagementDetailsModal";
import { AddEditPolicyGuideline } from "@/pages/ProxyVotingGuideline/components/AddEditProxyVotingGuideline";
import AddNewInvesterProfile from "@/pages/InvestorProfiles/components/AddNewInvester";

interface InstituteFilter {
  region: string[];
}

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    institutions,
    loading,
    page,
    totalPages,
    institutionFilterOptions,
    filters,
    count
  } = useAppSelector((state) => state.institutions);

  const [searchTerms, setSearchTerms] = useState<string[]>(
    filters?.institution_name?.length > 0 ? filters?.institution_name : []
  );

  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);

  const { handleSubmit, control, reset, setValue, watch } =
    useForm<InstituteFilter>({
      defaultValues: {
        region: [...filters.region],
      },
    });

  const resetFormValues = () => {
    setValue("region", []);
  };

  const { user } = useAppSelector((state) => state.authentiction);

  const [selectedInstitution, setSelectedInstitution] =
    useState<Institutions | null>(null);
  const [addEditInstitutionVisible, setAddEditInstitutionVisible] =
    useState<boolean>(false);
  const [addDocumentModalVisible, setAddDocumentModalVisible] =
    useState<boolean>(false);
  const [selectedInstitutionForDoc, setSelectedInstitutionForDoc] =
    useState<Institutions | null>(null);
  const [addNewCaseStudyModalVisible, setAddNewCaseStudyModalVisible] =
    useState<boolean>(false);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState<any | null>(
    null
  );
  const [addEngagementModalVisible, setAddEngagementModalVisible] =
    useState<boolean>(false);
  const [selectedInstitutionForEngagement, setSelectedInstitutionForEngagement] =
    useState<Institutions | null>(null);
  const [addProxyVotingGuidelineModalVisible, setAddProxyVotingGuidelineModalVisible] =
    useState<boolean>(false);
  const [selectedInstitutionForProxyGuideline, setSelectedInstitutionForProxyGuideline] =
    useState<Institutions | null>(null);
  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] =
    useState<boolean>(false);
  const [selectedInstitutionIdForProfile, setSelectedInstitutionIdForProfile] =
    useState<number | null>(null);

  useEffect(() => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/institute/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchInstitutions(dynamicURL));

    const { institution_name, ...restFilters } = filters;
    setFiltersLength(countValidFilters(restFilters));
    setSelectedChipFilters(generateFilterChips(restFilters));
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

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilter({ key: "institution_name", value: searchTerms }));
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
    resetFormValues();
    dispatch(resetPage());
    reset();
  };

  const onFilterClear = () => {
    reset();
    resetFormValues();
    // dispatch(resetFilter());
    dispatch(resetPage());
  };

  useEffect(() => {
    if (addEditInstitutionVisible === false) {
      setSelectedInstitution(null);
    }
  }, [addEditInstitutionVisible]);

  function onEditClickHandler(institution: Institutions) {
    setSelectedInstitution(institution);
    setAddEditInstitutionVisible(true);
  }

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Institution"]?.institution]);
    dispatch(
      setFilter({
        key: "region",
        value: user?.saved_search["Institution"]?.region,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Institution",
      institution: searchTerms,
      region: filters["region"],
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Institution",
          value: {
            institution: searchTerms,
            region: filters["region"],
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const onSubmit = async (institutionFilters: InstituteFilter) => {
    Object.entries(institutionFilters).forEach(([key, value]) => {
      dispatch(setFilter({ key: key as any, value }));
    });

    dispatch(resetPage());
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
      const updatedFilters: InstituteFilter = { ...filters };
      if (Array.isArray(updatedFilters[removeKey])) {
        updatedFilters[removeKey] = updatedFilters[removeKey].filter(
          (item) => item !== removeValue
        );
      } else if (updatedFilters[removeKey] === removeValue) {
        updatedFilters[removeKey] = "";
      }
  
      setValue(removeKey, updatedFilters[removeKey]);
      Object.entries(updatedFilters).forEach(([key, value]) => {
        dispatch(setFilter({ key: key as any, value: value as any }));
      });
    }

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="font-semibold text-xl ">Admin Panel</div>
          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                onClick={() => {
                  setAddEditInstitutionVisible(true);
                }}
                variant="primary"
                className="bg-theme-2 border-bg-theme-2"
              >
                <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />{" "}
                Add New Institution
              </Button>
            </div>
          )}
        </div>
        <div className="mt-3.5">
          <div className="flex flex-col box box--stacked">
            <div className="flex flex-col p-5  sm:flex-row gap-y-2">
              <div className="flex  ">
                <MultiSearchBar
                  onSearch={handleSearch}
                  searchTerms={searchTerms}
                  setSearchTerms={setSearchTerms}
                  url="/institute/"
                  getOptionKey="institution"
                  queryKey="institution_name"
                  placeHolder="Search Institution"
                  onSearchChange={resetPage}
                />

                <div className="hover:bg-slate-50">
                  <Button onClick={handleClearAllFilter}>
                    <Tippy content="Clear Filters" options={{ theme: "light" }}>
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
                    <Tippy content="Save Searches" options={{ theme: "light" }}>
                      <SaveAll
                        size={17}
                        strokeWidth={1}
                        className="text-slate-500 cursor-pointer	"
                      />
                    </Tippy>
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2 sm:ml-auto">
                {user?.saved_search?.["Institution"] !== undefined && (
                  <div className="hover:bg-slate-50 ">
                    <Button className="h-10 whitespace-nowrap" onClick={getSavedSearches}>Previous Search</Button>
                  </div>
                )}

                {/* Clear and Apply buttons outside filter */}
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    onFilterClear();
                  }}
                  className="h-10 px-4 whitespace-nowrap"
                >
                  Clear
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleSubmit(onSubmit)}
                  className="h-10 px-4 whitespace-nowrap"
                >
                  Apply
                </Button>

                <Popover className="relative inline-block">
                  {({ close }) => (
                    <>
                      <Popover.Button
                        as={Button}
                        variant="outline-secondary"
                        className="h-10 px-4 whitespace-nowrap"
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
                      <Popover.Panel placement="bottom-end" className="min-w-[280px]">
                        <form onSubmit={handleSubmit(onSubmit)}>
                          <div className="p-3 space-y-3">
                            {/* Filter Content */}
                            <div>
                              <h4 className="text-base font-semibold text-slate-700">Filters</h4>
                            </div>

                            <div>
                              <div className="w-full">
                                <div className="text-left text-slate-500 flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold text-slate-700">Region</span>
                                  {institutionFilterOptions?.region?.length >
                                    0 && (
                                    <FormCheck className="flex items-center gap-1 text-xs">
                                      <FormCheck.Input
                                        id={`region`}
                                        checked={
                                          institutionFilterOptions.region
                                            .length ===
                                          watch("region")?.length
                                        }
                                        type="checkbox"
                                        onChange={(e) => {
                                          if (e.target.checked === true) {
                                            setValue(
                                              "region",
                                              institutionFilterOptions.region
                                            );
                                          } else {
                                            setValue("region", []);
                                          }
                                        }}
                                      />
                                      <FormCheck.Label className="text-xs mb-0">
                                        Select All
                                      </FormCheck.Label>
                                    </FormCheck>
                                  )}
                                </div>
                                <Controller
                                  name="region"
                                  control={control}
                                  render={({ field }) => (
                                    <TomSelect
                                      value={field.value || []}
                                      onChange={(value) => {
                                        field.onChange(value);
                                      }}
                                      options={{
                                        placeholder: "Select Region",
                                      }}
                                      className="w-full text-sm"
                                      multiple
                                    >
                                      <>
                                        {institutionFilterOptions?.region
                                          .length > 0 &&
                                          institutionFilterOptions?.region?.map(
                                            (region: string) => {
                                              return (
                                                <option value={region}>
                                                  {region}
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
            <div className="px-5">
              <TableWrapper
                isLoading={loading}
                rows={6}
                columns={8}
              >
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Institution
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Investor Profile
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap  border-slate-200/80 text-slate-500">
                        Active
                      </Table.Td> */}

                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Document Tab
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Investor Type
                        </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Add New Case Studies
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Whale Wisdom Filer
                        </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Add Engagement Details
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Proxy Advisory Influence
                        </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Add New Proxy Voting Guideline
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Add Documents
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          UN PRI Signatory
                        </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Edit Institution
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Updated At
                      </Table.Td> */}
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Details
                        </Table.Td> */}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {institutions?.length > 0 ? (
                        institutions?.map((institution: Institutions) => (
                          <Table.Tr key={institution.id}>
                            <Table.Td className="py-2 bg-white text-slate-700 border-slate-200/80">
                              <div className="ml-4">
                                <p className="font-medium whitespace-nowrap">
                                  {institution?.institution}
                                </p>
                                <div className="text-slate-500 text-xs whitespace-nowrap mt-0.5">
                                  {institution?.email}
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td className="py-2 bg-white border-slate-200/80 min-w-[140px]">
                              {(user?.user_type === "Analyst" ||
                                user?.user_type === "Admin") && (
                                <button
                                  onClick={() => {
                                    setSelectedInstitutionIdForProfile(institution.id);
                                    setAddNewInvesterModalVisible(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium"
                                >
                                  Add Investor Profile
                                </button>
                              )}
                              {user?.user_type !== "Analyst" &&
                                user?.user_type !== "Admin" && (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                            </Table.Td>
                            {/* <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                            {institution?.active === true ? (
                              <div className="flex items-center justify-center text-xs font-medium rounded-md text-success bg-success/10 border  px-1.5 py-1 mr-auto sm:mr-0">
                                <span className="-mt-px">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-nowrap justify-center text-xs font-medium rounded-md text-danger bg-danger/10 border  px-1.5 py-1 mr-auto sm:mr-0">
                                <span className="-mt-px">In Active</span>
                              </div>
                            )}
                          </Table.Td> */}

                            {/* Region Column - Commented Out */}
                            {/* {institution?.region && (
                              <Table.Td className="py-2  bg-white border-slate-200/80">
                                {institution?.region}
                              </Table.Td>
                            )} */}

                            {/* Document Tab Column */}
                            {institution?.id && (
                              <Table.Td className="py-2  bg-white border-slate-200/80">
                                <button
                                  onClick={() => {
                                    window.open(`/investor-company-details/${institution.id}`, '_blank');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium"
                                  title="View Document Tab"
                                >
                                  View Documents
                                </button>
                              </Table.Td>
                            )}
                            {!institution?.investor_profile_id && (
                              <Table.Td className="py-2  bg-white border-slate-200/80">
                                <span className="text-slate-400 text-sm">-</span>
                              </Table.Td>
                            )}
                            {/* <Table.Td className="py-2  bg-white border-slate-200/80">
                              {institution.investor_type}
                            </Table.Td> */}
                            <Table.Td className="py-2  bg-white border-slate-200/80 min-w-[130px]">
                              {(user?.user_type === "Analyst" ||
                                user?.user_type === "Admin") && (
                                <button
                                  onClick={() => {
                                    setSelectedCaseStudies({
                                      institution: institution?.id,
                                      institution_name: institution?.institution,
                                    });
                                    setAddNewCaseStudyModalVisible(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium"
                                >
                                  Add Case Study
                                </button>
                              )}
                              {user?.user_type !== "Analyst" &&
                                user?.user_type !== "Admin" && (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                            </Table.Td>
                            {/* <Table.Td className="py-2  bg-white border-slate-200/80">
                              {institution?.whale_wisdom_filer_id}
                            </Table.Td> */}
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              {(user?.user_type === "Analyst" ||
                                user?.user_type === "Admin") && (
                                <button
                                  onClick={() => {
                                    setSelectedInstitutionForEngagement(institution);
                                    setAddEngagementModalVisible(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium"
                                >
                                  Add Engagement
                                </button>
                              )}
                              {user?.user_type !== "Analyst" &&
                                user?.user_type !== "Admin" && (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                            </Table.Td>
                            {/* <Table.Td className="py-2  bg-white border-slate-200/80">
                              {institution?.proxy_advisor_influence || "-"}
                            </Table.Td> */}
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              {(user?.user_type === "Analyst" ||
                                user?.user_type === "Admin") && (
                                <button
                                  onClick={() => {
                                    setSelectedInstitutionForProxyGuideline(institution);
                                    setAddProxyVotingGuidelineModalVisible(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium"
                                >
                                  Add Guideline
                                </button>
                              )}
                              {user?.user_type !== "Analyst" &&
                                user?.user_type !== "Admin" && (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                            </Table.Td>
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              <div className="flex justify-center items-center">
                                {(user?.user_type === "Analyst" ||
                                  user?.user_type === "Admin") && (
                                  <Tippy
                                    content="Add/Edit Documents"
                                    options={{
                                      theme: "light",
                                    }}
                                  >
                                    <Lucide
                                      onClick={() => {
                                        navigate(`/institution/${institution?.id}/documents`);
                                      }}
                                      icon="FileText"
                                      className="w-4 h-4 stroke-[1.3] cursor-pointer"
                                    />
                                  </Tippy>
                                )}
                                {user?.user_type !== "Analyst" &&
                                  user?.user_type !== "Admin" && (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                              </div>
                            </Table.Td>
                            {/* <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                              {institution?.unpri_signatory ? (
                                <span className="text-green-600 font-medium">Yes</span>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </Table.Td> */}
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              <div className="flex justify-center items-center">
                                {(user?.user_type === "Analyst" ||
                                  user?.user_type === "Admin") && (
                                  <Tippy
                                    content="Add/Edit Institution"
                                    options={{
                                      theme: "light",
                                    }}
                                  >
                                    <Lucide
                                      onClick={() => {
                                        onEditClickHandler(institution);
                                      }}
                                      icon="PenLine"
                                      className="w-4 h-4 stroke-[1.3] cursor-pointer"
                                    />
                                  </Tippy>
                                )}
                                {user?.user_type !== "Analyst" &&
                                  user?.user_type !== "Admin" && (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                              </div>
                            </Table.Td>
                            {/* <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                            <p className="text-gray-500">
                              {institution?.date_updated}
                              
                            </p>
                          </Table.Td> */}

                            {/* <Table.Td className=" py-2 w-20 relative  box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                              <div className="flex gap-3 ">
                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <>
                                    <Tippy
                                      content="Add/Edit Document"
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <Lucide
                                        onClick={() => {
                                          navigate(
                                            `/institution/${institution?.id}/documents`
                                          );
                                        }}
                                        icon="FileText"
                                        className="w-4 h-4 mr-1.5 stroke-[1.3] cursor-pointer"
                                      />
                                    </Tippy>
                                    <Tippy
                                      content="Add/Edit Institution"
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <Lucide
                                        onClick={() => {
                                          onEditClickHandler(institution);
                                        }}
                                        icon="PenLine"
                                        className="w-4 h-4 mr-1.5 stroke-[1.3] cursor-pointer"
                                      />
                                    </Tippy>
                                  </>
                                )}
                              </div>
                            </Table.Td> */}
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td
                            colSpan={8}
                            className="py-10 text-center text-slate-500"
                          >
                            No institutions found.
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                    {/* {institutions?.length === 0 && (
                      <div className="w-full">
                        <h1 className="mt-3">No Records Found..</h1>
                      </div>
                    )} */}
                  </Table>
                </div>
              </TableWrapper>
            </div>
            <div className="flex justify-end p-5 border-t rounded-b-md">
              <CPagination
                page={page}
                totalPages={totalPages}
                handleNextPage={handleNextPage}
                handlePageChange={handlePageChange}
                handlePreviousPage={handlePreviousPage}
              />
            </div>
          </div>
        </div>
        {addEditInstitutionVisible && (
          <AddEditInstitution
            addEditInstitutionVisible={addEditInstitutionVisible}
            setAddEditInstitutionVisible={setAddEditInstitutionVisible}
            selectedInstitution={selectedInstitution}
          />
        )}

        {addDocumentModalVisible && selectedInstitutionForDoc && (
          <AddDocumentModal
            visible={addDocumentModalVisible}
            setVisible={setAddDocumentModalVisible}
            institutionId={selectedInstitutionForDoc?.id}
            institutionName={selectedInstitutionForDoc?.institution}
          />
        )}
        {addNewCaseStudyModalVisible && (
          <AddNewCaseStudies
            addNewCaseStudyModalVisible={addNewCaseStudyModalVisible}
            setAddNewCaseStudyModalVisible={setAddNewCaseStudyModalVisible}
            selectedCaseStudies={selectedCaseStudies}
          />
        )}
        {addEngagementModalVisible && (
          <AddEngagementDetailsModal
            visible={addEngagementModalVisible}
            setVisible={setAddEngagementModalVisible}
            preselectedInstitution={
              selectedInstitutionForEngagement
                ? {
                    id: selectedInstitutionForEngagement.id,
                    name: selectedInstitutionForEngagement.institution,
                  }
                : undefined
            }
            onSuccess={() => {
              setAddEngagementModalVisible(false);
            }}
          />
        )}
        {addProxyVotingGuidelineModalVisible && selectedInstitutionForProxyGuideline && (
          <AddEditPolicyGuideline
            addNewProxyVotingGuidelineVisible={addProxyVotingGuidelineModalVisible}
            setAddNewProxyVotingGuidelineVisible={setAddProxyVotingGuidelineModalVisible}
            selectedProxyVotingGuideline={{
              institution: selectedInstitutionForProxyGuideline.id,
            } as any}
          />
        )}
        {addNewInvesterModalVisible && (
          <AddNewInvesterProfile
            addNewInvesterModalVisible={addNewInvesterModalVisible}
            setAddNewInvesterModalVisible={setAddNewInvesterModalVisible}
            preselectedInstitutionId={selectedInstitutionIdForProfile}
          />
        )}
      </div>
    </div>
  );
}

export default Main;
