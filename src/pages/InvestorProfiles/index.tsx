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
import { useNavigate, useLocation } from "react-router-dom";
import Table from "@/components/Base/Table";
import { Dialog } from "@/components/Base/Headless";
import AIAssistantButton from "@/components/Base/AIAssistantButton";

import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import AddNewInvesterProfile from "./components/AddNewInvester";
import { AddEditPolicyGuideline } from "@/pages/ProxyVotingGuideline/components/AddEditProxyVotingGuideline";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import { toast } from "react-toastify";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import PdfViewer from "@/components/PdfView";
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
  const location = useLocation();
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
  const [addNewVotingGuidelineVisible, setAddNewVotingGuidelineVisible] =
    useState<boolean>(false);
  const [tab, setTab] = useState<"investor" | "equity">("investor");
  const [searchTerms, setSearchTerms] = useState<string[]>(
    filters?.institution_name?.length > 0 ? filters?.institution_name : []
  );
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [votingGuidelinesModalOpen, setVotingGuidelinesModalOpen] = useState<boolean>(false);
  const [selectedVotingGuidelines, setSelectedVotingGuidelines] = useState<any>(null);
  const [keyChangesModalOpen, setKeyChangesModalOpen] = useState<boolean>(false);
  const [selectedKeyChanges, setSelectedKeyChanges] = useState<any>(null);
  const [pdfVisible, setPdfVisible] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfTitle, setPdfTitle] = useState<string>("");
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
      `${baseURL}/investor_with_voting_guidelines/`,
      filters,
      {},
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

  const gotoDetailPage = (investorProfileId: number | null | undefined) => {
    if (investorProfileId) {
      navigate(`/investor-profile/investor/${investorProfileId}`, {
        state: { 
          from: location.pathname,
          fromState: location.state 
        },
      });
    }
  };

  const handleOverboardingPoliciesClick = () => {
    setPdfUrl('https://zmh-official-website-media-bucket.s3.us-east-2.amazonaws.com/ZMH_Overboarding_Document/Overboarding+Policy+for+Top+Investors+2026.pdf');
    setPdfTitle('Key Overboarding Policies');
    setPdfVisible(true);
  };

  const handleKeyChangesClick = (profile: InvestersProfile) => {
    if (profile.proxy_voting_key_changes) {
      setSelectedKeyChanges({
        institution_name: profile.institution || profile.institution_name,
        key_changes: profile.proxy_voting_key_changes
      });
      setKeyChangesModalOpen(true);
    }
  };

  const handleDocumentsClick = (institutionId: string) => {
    navigate(`/investor-company-details/${institutionId}`, {
      state: { 
        from: location.pathname,
        fromState: location.state 
      },
    });
  };

  const handleVotingGuidelinesClick = (profile: InvestersProfile) => {
    if (profile.voting_guideline_docs && profile.voting_guideline_docs.length > 0) {
      if (profile.voting_guideline_docs.length === 1 && !profile.proxy_voting_key_changes) {
        window.open(profile.voting_guideline_docs[0].link, '_blank', 'noopener,noreferrer');
        return;
      }

      setSelectedVotingGuidelines({
        institution_name: profile.institution || profile.institution_name,
        docs: profile.voting_guideline_docs,
        key_changes: profile.proxy_voting_key_changes
      });
      setVotingGuidelinesModalOpen(true);
    }
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

    // Clear searchTerms if institution filter is being removed
    if (removeKey === "institution_name") {
      setSearchTerms(
        Array.isArray(updatedFilters[removeKey])
          ? updatedFilters[removeKey]
          : []
      );
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
              <div className="flex items-center gap-3">
                <a
                  className="p-2 bg-primary border-white border-2 text-white rounded-md cursor-pointer"
                  onClick={handleOverboardingPoliciesClick}
                >
                  <div className="flex items-center justify-center">
                    <Lucide
                      icon="File"
                      className="stroke-[2] w-4 h-4 text-white"
                    />
                    <span className="ml-2 font-semibold hidden xl:flex">
                      Key Overboarding Policies
                    </span>
                  </div>
                </a>
                <AIAssistantButton 
                  label="AI Assistant Voting Guideline"
                  href="/ai-assistant/voting-guidelines"
                />
              </div>
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
                    url="/investor_with_voting_guidelines/"
                    getOptionKey="institution_name"
                    placeHolder="Search Institution"
                    onSearchChange={resetPage}
                    showPills={false}
                    searchPoponents={true}
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
                <Table className="w-full table-fixed border-spacing-y-[10px] border-separate -mt-2">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[20%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <Table.Thead className="bg-[#ab123d] sticky top-0 z-10">
                    <Table.Tr>
                      <Table.Td className="py-4 px-4 font-semibold text-white border-b-0 first:rounded-l-md">
                        Institution
                      </Table.Td>
                      <Table.Td className="py-4 px-4 font-semibold text-white border-b-0 whitespace-normal">
                        Proxy Advisory Influence
                      </Table.Td>
                      <Table.Td className="py-4 px-4 font-semibold text-white border-b-0 text-center whitespace-normal">
                        Investor Profile
                      </Table.Td>
                      <Table.Td className="py-4 px-4 font-semibold text-white border-b-0 text-center whitespace-normal">
                        Voting Guidelines
                      </Table.Td>
                      <Table.Td className="py-4 px-4 font-semibold text-white border-b-0 text-center whitespace-normal last:rounded-r-md">
                        All Documents
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {loading ? (
                      <>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                          <Table.Tr key={i} className="intro-x">
                            <Table.Td className="py-4 px-4 bg-white shadow-md rounded-l-md">
                              <div className="h-5 rounded-md bg-slate-200 animate-pulse w-[80%]" />
                            </Table.Td>
                            <Table.Td className="py-4 px-4 bg-white shadow-md">
                              <div className="h-5 rounded-md bg-slate-200 animate-pulse w-[60%]" />
                            </Table.Td>
                            <Table.Td className="py-4 px-4 bg-white shadow-md text-center">
                              <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse mx-auto" />
                            </Table.Td>
                            <Table.Td className="py-4 px-4 bg-white shadow-md text-center">
                              <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse mx-auto" />
                            </Table.Td>
                            <Table.Td className="py-4 px-4 bg-white shadow-md rounded-r-md text-center">
                              <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse mx-auto" />
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </>
                    ) : investersProfile?.length > 0 ? (
                      investersProfile.map((profile: InvestersProfile, index: number) => (
                        <Table.Tr
                          key={`${profile.institution_id || "no-inst"}-${profile.investor_profile_id || "no-profile"}-${profile.institution || profile.institution_name || "unknown"}-${index}`}
                          className="intro-x"
                        >
                          <Table.Td className="py-4 px-4 bg-white shadow-md rounded-l-md">
                            <span
                              onClick={() => {
                                if (profile.investor_profile_id) {
                                  gotoDetailPage(profile.investor_profile_id);
                                }
                              }}
                              className={`font-semibold text-[0.94rem] transition-colors ${
                                profile.investor_profile_id
                                  ? "cursor-pointer hover:text-primary"
                                  : "cursor-default"
                              }`}
                            >
                              {profile.institution || profile.institution_name}
                            </span>
                          </Table.Td>
                          <Table.Td className="py-4 px-4 bg-white shadow-md">
                            <span className="text-slate-600 text-sm font-medium">
                              {profile.proxy_advisor_influence || '—'}
                            </span>
                          </Table.Td>
                          <Table.Td className="py-4 px-4 bg-white shadow-md text-center">
                            <Lucide
                              onClick={() => gotoDetailPage(profile.investor_profile_id)}
                              icon="Briefcase"
                              className={`w-4 h-4 stroke-[1.3] mx-auto ${
                                profile.investor_profile_id
                                  ? 'cursor-pointer hover:text-primary'
                                  : 'opacity-30 cursor-not-allowed'
                              }`}
                            />
                          </Table.Td>
                          <Table.Td className="py-4 px-4 bg-white shadow-md text-center">
                            <Lucide
                              onClick={() => handleVotingGuidelinesClick(profile)}
                              icon="Vote"
                              className={`w-4 h-4 stroke-[1.3] mx-auto ${
                                profile.voting_guideline_docs && profile.voting_guideline_docs.length > 0
                                  ? 'cursor-pointer hover:text-primary'
                                  : 'opacity-30 cursor-not-allowed'
                              }`}
                            />
                          </Table.Td>
                          <Table.Td className="py-4 px-4 bg-white shadow-md rounded-r-md text-center">
                            <Lucide
                              onClick={() => {
                                if (profile.is_document) {
                                  handleDocumentsClick(String(profile.id));
                                }
                              }}
                              icon="FileText"
                              className={`w-4 h-4 stroke-[1.3] mx-auto ${
                                profile.is_document
                                  ? 'cursor-pointer hover:text-primary'
                                  : 'opacity-30 cursor-not-allowed'
                              }`}
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={5} className="py-12 text-center bg-white shadow-md rounded-md"> 
                          <div className="flex flex-col items-center justify-center">
                            <Lucide icon="FileSearch" className="w-12 h-12 text-gray-300 mb-2" />
                            <div className="text-lg font-medium">No data found</div>
                            <div className="text-sm text-gray-500 mt-1">
                              Try adjusting your filters or search criteria
                            </div>
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
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

          {/* Removed All Documents Modal - opens in new tab directly */}

          {/* {allDocumentsModalOpen && (
            <Dialog
              size="lg"
              open={allDocumentsModalOpen}
              onClose={() => {
                setAllDocumentsModalOpen(false);
                setSelectedInstitution(null);
              }}
            >
              <Dialog.Panel className="p-0">
                <Dialog.Title>
                  <div className="px-6 py-5 border-b border-slate-200/60">
                    <h2 className="font-semibold text-lg">
                      All Documents - {selectedInstitution?.institution_name}
                    </h2>
                  </div>
                </Dialog.Title>
                <Dialog.Description className="p-8 text-center">
                  <Lucide icon="FileText" className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 mb-6">
                    Click the button below to view all documents for {selectedInstitution?.institution_name}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      window.open(`/investor-company-details/${selectedInstitution?.institution_id}`, '_blank');
                      setAllDocumentsModalOpen(false);
                      setSelectedInstitution(null);
                    }}
                  >
                    <Lucide icon="ExternalLink" className="w-4 h-4 mr-2" />
                    View All Documents
                  </Button>
                </Dialog.Description>
              </Dialog.Panel>
            </Dialog>
          )} */}

          {keyChangesModalOpen && (
            <Dialog
              size="lg"
              open={keyChangesModalOpen}
              onClose={() => {
                setKeyChangesModalOpen(false);
                setSelectedKeyChanges(null);
              }}
            >
              <Dialog.Panel>
                <Dialog.Title className="flex justify-between items-center bg-primary p-6 !text-white rounded-t-lg">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedKeyChanges?.institution_name}</h2>
                    <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                      <span>Key Voting Guidelines Changes</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setKeyChangesModalOpen(false);
                      setSelectedKeyChanges(null);
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </Dialog.Title>
                <Dialog.Description className="p-8 overflow-y-auto max-h-[70vh]">
                  <div 
                    className="prose prose-sm max-w-none text-slate-600 leading-relaxed [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80"
                    dangerouslySetInnerHTML={{ __html: selectedKeyChanges?.key_changes || '' }}
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
                    onClick={() => {
                      setKeyChangesModalOpen(false);
                      setSelectedKeyChanges(null);
                    }}
                    className="px-8"
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}

          {votingGuidelinesModalOpen && (
            <Dialog
              size="xl"
              open={votingGuidelinesModalOpen}
              onClose={() => {
                setVotingGuidelinesModalOpen(false);
                setSelectedVotingGuidelines(null);
              }}
            >
              <Dialog.Panel>
                <Dialog.Title className="bg-primary px-7 py-5 !text-white rounded-t-lg relative">
                  <div className="flex items-center gap-4 pr-48">
                    <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                      <Lucide icon="ScrollText" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold leading-tight">{selectedVotingGuidelines?.institution_name}</h2>
                      <p className="text-white/80 text-sm mt-1">Voting Guidelines</p>
                    </div>
                  </div>
                  <div className="absolute top-5 right-7 flex items-center gap-2.5">
                    {selectedVotingGuidelines?.key_changes && (
                      <button
                        onClick={() => {
                          setSelectedKeyChanges({
                            institution_name: selectedVotingGuidelines?.institution_name,
                            key_changes: selectedVotingGuidelines?.key_changes
                          });
                          setVotingGuidelinesModalOpen(false);
                          setKeyChangesModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-white hover:bg-white/95 text-primary font-semibold text-sm px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                      >
                        <Lucide icon="GitCompare" className="w-4 h-4" />
                        Key Changes
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setVotingGuidelinesModalOpen(false);
                        setSelectedVotingGuidelines(null);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Lucide icon="X" className="w-5 h-5" />
                    </button>
                  </div>
                </Dialog.Title>
                <Dialog.Description className="p-0">
                  <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Year</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {selectedVotingGuidelines?.docs?.map((doc: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                                {doc.year}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-900">
                                {doc.policy_type || selectedVotingGuidelines?.institution_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => window.open(doc.link, '_blank')}
                              >
                                <Lucide icon="ExternalLink" className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Dialog.Description>
                <div className="p-6 border-t bg-slate-50 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setVotingGuidelinesModalOpen(false);
                      setSelectedVotingGuidelines(null);
                    }}
                    className="px-8"
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}
        </div>
      </div >
      
      {pdfVisible && (
        <PdfViewer
          currentPdfDoc={pdfUrl}
          currentPdfName={pdfTitle}
          pdfVisible={pdfVisible}
          setPdfVisible={setPdfVisible}
        />
      )}

      {addNewVotingGuidelineVisible && (
        <AddEditPolicyGuideline
          addNewProxyVotingGuidelineVisible={addNewVotingGuidelineVisible}
          setAddNewProxyVotingGuidelineVisible={setAddNewVotingGuidelineVisible}
          selectedProxyVotingGuideline={null}
        />
      )}
    </>
  );
}

export default Main;
