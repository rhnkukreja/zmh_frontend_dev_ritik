import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";

import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useMemo, useState } from "react";
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

  const navigate = useNavigate();

  useEffect(() => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/proxy_voting_guidelines/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchProxyVotingGuidelines(dynamicURL));

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

  const gotoDetailPage = (pdf: string, pdf_name: string) => {
    setCurrentPdfDoc(pdf);
    setCurrentPdfName(pdf_name);
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(
      setFilter({
        key: "institution_name",
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
      setAllFilters({ ...ProxyGuideline, institution_name: searchTerms })
    );

    dispatch(resetPage());
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...filters };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      updatedFilters[removeKey] = "";
    }

    setValue(removeKey, updatedFilters[removeKey]);
    dispatch(setAllFilters(updatedFilters));
  }
  const uniqueGuidelines = (guidelines: ProxyVotingGuideline[]) => {
    const seenInstitutions = new Set<string>();
    return guidelines.filter((guideline) => {
      if (seenInstitutions.has(guideline.institution_name)) {
        return false;
      }
      seenInstitutions.add(guideline.institution_name);
      return true;
    });
  };
  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="font-semibold text-xl">Voting Guidelines</div>

            {user?.user_type === "Admin" && (
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
            )}
          </div>

          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col px-5 pt-5  sm:flex-row gap-y-2">
                <div className="flex  ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    onSearchSelect={() => {
                      dispatch(resetPage());
                    }}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url="/proxy_voting_guidelines/"
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

                  <div className="flex items-start">
                    <a
                      className="p-2 bg-primary
                   border-white border-2 text-white rounded-md "

                      onClick={() => {
                        gotoDetailPage(
                          'https://zmh-official-website-media-bucket.s3.amazonaws.com/ZMH_Overboarding_Document/Overboarding Policy for Top Investors (Updated)_Overboarding_Document.pdf',
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

                  {user?.saved_search?.["Voting Guidelines"] !== undefined && (
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

                        <Popover.Panel placement="bottom-end">
                          <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                              <div className="mt-3">
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
                              
                              {/* Buttons */}
                              <div className="flex justify-end gap-3 mt-6">
                                <Button
                                  variant="outline-secondary"
                                  onClick={() => {
                                    close();
                                    onFilterClear();
                                  }}
                                  className="w-36"
                                  type="button"
                                >
                                  <MdOutlineClear className="text-lg mr-1" /> Clear
                                </Button>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  className="w-36 flex items-center gap-2 text-base font-semibold shadow-md hover:bg-primary/90 transition-all"
                                  onClick={() => {
                                    close();
                                  }}
                                >
                                  <FaSearch className="text-lg" /> Apply
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
                        <Table.Tr className="bg-primary text-white text-sm">
                          <Table.Td className="px-4 py-2 text-left font-semibold">
                            Institution
                          </Table.Td>
                          <Table.Td className="px-4 py-2 text-left font-semibold">
                            Year
                          </Table.Td>
                          {user?.user_type === "Admin" && (
                            <Table.Td className="px-4 py-2 text-left font-semibold">
                              Category
                            </Table.Td>
                          )}
                          {user?.user_type === "Admin" && (
                            <Table.Td className="px-4 py-2 text-left font-semibold">
                              Sub Category
                            </Table.Td>
                          )}
                          {user?.user_type === "Admin" && (
                            <Table.Td className="px-4 py-2 text-left font-semibold">
                              Section
                            </Table.Td>
                          )}
                          {user?.user_type === "Admin" && (
                            <Table.Td className="px-4 py-2 text-left font-semibold">
                              Policy Guideline
                            </Table.Td>
                          )}
                          {/* <Table.Td className="py-2 font-medium bg-slate-50   text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Active
                        </Table.Td> */}

                          <Table.Td className="px-4 py-2 text-left font-semibold">
                            Details
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                        {proxyVotingGuidelines?.length > 0 &&
                          uniqueGuidelines(proxyVotingGuidelines)?.map(
                            (guideline: ProxyVotingGuideline) => (
                              <Table.Tr
                                key={guideline?.id}
                                className="[&_td]:last:border-b-0"
                              >
                                <Table.Td className=" flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                  {guideline?.institution_logo_url &&
                                    guideline.institution_logo_url !== "null" ? (
                                    <>
                                      <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]">
                                        <img
                                          alt="ZMH Analytics"
                                          className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={guideline?.institution_logo_url}
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                      <img
                                        src={investorIcon}
                                        alt="Investor Icon"
                                        className="w-[65%] h-[65%] object-contain"
                                      />
                                    </div>
                                  )}

                                  <div className="ml-4">
                                    <p className="font-medium whitespace-nowrap">
                                      {guideline?.institution_name}
                                    </p>
                                  </div>
                                </Table.Td>
                                <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                  {guideline?.year}
                                </Table.Td>

                                {user?.user_type === "Admin" && (
                                  <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                    {guideline?.category && (
                                      <div className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                        {guideline?.category}
                                      </div>
                                    )}
                                  </Table.Td>
                                )}

                                {user?.user_type === "Admin" && (
                                  <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                    {guideline?.sub_category && (
                                      <>{guideline?.sub_category}</>
                                    )}
                                  </Table.Td>
                                )}

                                {user?.user_type === "Admin" && (
                                  <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                    {guideline?.section && (
                                      <> {guideline?.section}</>
                                    )}
                                  </Table.Td>
                                )}

                                {user?.user_type === "Admin" && (
                                  <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                    {guideline?.policy_guidelines && (
                                      <> {guideline?.policy_guidelines}</>
                                    )}
                                  </Table.Td>
                                )}

                                <Table.Td className=" py-2 relative w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                  <div className="flex gap-3 justify-center items-center">
                                    <Tippy
                                      content="See Details"
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <Lucide
                                        onClick={() => {
                                          gotoDetailPage(
                                            guideline?.voting_guidelines_pdf_url!,
                                            guideline?.voting_guidelines_pdf_name!
                                          );

                                          setPdfVisible(true);
                                        }}
                                        icon="Eye"
                                        className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                      />
                                    </Tippy>

                                    {user?.user_type === "Admin" && (
                                      <Tippy
                                        content="Upload"
                                        options={{
                                          theme: "light",
                                        }}
                                      >
                                        <Lucide
                                          onClick={() => {
                                            setUploadFileVisible(true);
                                            setProxyId(guideline?.id);
                                          }}
                                          icon="Upload"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                        />
                                      </Tippy>
                                    )}

                                    {user?.user_type === "Admin" && (
                                      <Tippy
                                        content="Edit"
                                        options={{
                                          theme: "light",
                                        }}
                                      >
                                        <Lucide
                                          onClick={() => {
                                            onEditClickHandler(guideline);
                                          }}
                                          icon="PenLine"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                        />
                                      </Tippy>
                                    )}

                                    <Tippy
                                      content="Download"
                                      options={{
                                        theme: "light",
                                      }}
                                    >
                                      <a
                                        href={
                                          guideline?.voting_guidelines_pdf_url ||
                                          ""
                                        }
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Lucide
                                          icon="Download"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                        />
                                      </a>
                                    </Tippy>

                                    {guideline?.is_search ? (
                                      <Tippy
                                        content="Searchable"
                                        options={{
                                          theme: "light",
                                        }}
                                      >
                                        <Lucide
                                          onClick={() => {
                                            const data = {
                                              name: guideline?.institution_name,
                                              year: guideline?.year,
                                            };
                                            navigate(
                                              `/voting-guidelines/pdf-sumamry/${guideline?.id}`,
                                              { state: data }
                                            );
                                          }}
                                          icon="Search"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                        />
                                      </Tippy>
                                    ) : (
                                      <span className="w-4 h-4 mr-1.5 stroke-[1.3]"></span>
                                    )}
                                  </div>
                                </Table.Td>
                              </Table.Tr>
                            )
                          )}
                      </Table.Tbody>
                      {proxyVotingGuidelines?.length === 0 && (
                        <div className="w-full">
                          <h1 className="mt-3">No Records Found..</h1>
                        </div>
                      )}
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
        </div>
      </div>
    </>
  );
}

export default ProxyGuideline;
