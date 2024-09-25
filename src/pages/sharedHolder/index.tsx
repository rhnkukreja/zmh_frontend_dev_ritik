import Lucide from "@/components/Base/Lucide";
import { Menu, Popover, Tab } from "@/components/Base/Headless";
import { FormCheck, FormInput, FormSelect } from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { useLocation, useNavigate } from "react-router-dom";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import Table from "@/components/Base/Table";
import {
  Controller,
  FieldErrors,
  SubmitErrorHandler,
  useForm,
} from "react-hook-form";
import { fetchShareHolderProposal, setPage } from "@/stores/shareholderProposalSlice";
import { resetPage } from "@/stores/shareholderProposalSlice";
import TomSelect from "@/components/Base/TomSelect";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { ShareHolderDropdown } from "@/types/shareHolder";
import clsx from "clsx";



function ShareHolderProposal() {


  interface ShareHolderFilter {
    institution: string[];
    status: string[];
    proponent: string[];
    category: string[];
    sub_category: string[];
    year: string[];
    keyword: string;
    [key: string]: any;
  }

  const dispatch: AppDispatch = useAppDispatch();
  const [tab, setTab] = useState<"proposal" | "no-action" | "withdrawn">("proposal");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [applyFilters, setApplyFilters] = useState<ShareHolderFilter | undefined>(undefined);
  const [categoryName, setCategoryName] = useState<string>('');
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [apiDropdownOptions, setApiDropdownOptions] = useState<ShareHolderDropdown>({
    institution: [],
    status: [],
    proponent: [],
    category: [],
    sub_category: [],
    year: [],
  });

  const { handleSubmit, control, reset, formState: { errors }, setValue, watch } = useForm<ShareHolderFilter>();
  const navigate = useNavigate();

  const {
    loading,
    shareHolderProposal,
    page,
    totalPages,
    filters,
    // investerProfileFilterOption,
  } = useAppSelector((state) => state.sharedHolderNoAction);

  const { company_Global_Search } = useAppSelector((state) => state.dashboard);

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  useEffect(() => {
    if (tab === 'proposal') {
      dispatch(
        fetchShareHolderProposal(
          createDynamicURL(`${baseURL}/shareholder_proposal/def14a/`, {
            globalSearch: company_Global_Search,
            ...applyFilters
          }, undefined, page)));
    }
    else if (tab === 'no-action') {
      dispatch(
        fetchShareHolderProposal(
          createDynamicURL(`${baseURL}/shareholder_proposal/no_action/`, applyFilters, undefined, page)
        )
      );
    }
    else if (tab === 'withdrawn') {
      dispatch(
        fetchShareHolderProposal(
          createDynamicURL(`${baseURL}/shareholder_proposal/withdrawn/`, applyFilters, undefined, page)
        )
      );
    }

  }, [page, tab, applyFilters]);


  const getAllCaseStudyDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res = await shareHolderProposalService.getShareHolderDropdownValues();
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
    getAllCaseStudyDropdowns();
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

  const onFilterClear = () => {
    reset();
    setApplyFilters(undefined);
  };

  const handleClearAllFilter = () => {
    setSearchTerms([]);
    setValue("keyword", "");
    setValue("category", []);
    setValue("sub_category", []);
    setValue("year", []);
    setValue("status", []);
    setValue("proponent", []);
    setValue("institution", []);

    setApplyFilters({
      keyword: "",
      category: [],
      sub_category: [],
      year: [],
      status: [],
      proponent: [],
      institution: []
    });
  };

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };


  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const profile of shareHolderProposal || []) {
        const isValid = await checkImageUrl(profile?.image);
        tempValidImages[profile?.name] = isValid
          ? profile?.image
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [shareHolderProposal]);

  const handleSearch = (searchTerms: string[]) => {
    setApplyFilters((prev) => {
      return {
        ...prev,
        institution_name: searchTerms.length > 0 ? searchTerms : undefined,
      } as ShareHolderFilter;
    });
  };

  const onSubmit = async (shareHolderFilters: ShareHolderFilter) => {
    setApplyFilters({ ...shareHolderFilters, institution_name: searchTerms });
    const validKeysCount = Object.keys(shareHolderFilters).filter((key) => {
      const value = shareHolderFilters[key];
      return value !== undefined && value !== "" && value.length !== 0;
    })?.length;

    setFiltersLength(validKeysCount);
  };

  // const handleCategory = (item:any) => {
  //   setCategoryName(item?.target?.value);
  //   console.log(categoryName);
  //   // return field.value?.toString();
  // }


  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              Shareholder Proposals
            </div>
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
                <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
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
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                  <Popover className="inline-block">
                    {({ close }) => (
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
                          Filter
                          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                            {filtersLength}
                          </div>
                        </Popover.Button>
                      </>
                    )}
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


                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Year
                          {apiDropdownOptions?.year?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`year`}
                                  checked={
                                    apiDropdownOptions?.year?.length === watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue("year", apiDropdownOptions?.year);
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

                      <div className=" w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Status
                          {apiDropdownOptions?.status?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`status`}
                                  checked={
                                    apiDropdownOptions.status.length ===
                                    watch("status")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "status",
                                        apiDropdownOptions.status
                                      );
                                    } else {
                                      setValue("status", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="status"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Status",
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
                                  {apiDropdownOptions?.status?.map(
                                    (status: string) => {
                                      return (
                                        <option value={status} key={status}>
                                          {status}
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
                          Proponent
                          {apiDropdownOptions?.proponent?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`proponent`}
                                  checked={
                                    apiDropdownOptions.proponent.length ===
                                    watch("proponent")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "proponent",
                                        apiDropdownOptions.proponent
                                      );
                                    } else {
                                      setValue("proponent", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="proponent"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Proponent",
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
                                  {apiDropdownOptions?.proponent?.map((proponent: any) => (
                                    <option key={proponent} value={proponent}>
                                      {proponent}
                                    </option>
                                  ))}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-between mt-3 xs:flex-col md:flex-row">
                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Category
                          {apiDropdownOptions?.category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`category`}
                                  checked={
                                    apiDropdownOptions.category.length ===
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
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.category.length > 0 &&
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
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>


                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Sub Category
                          {apiDropdownOptions?.sub_category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`sub_category`}
                                  checked={
                                    apiDropdownOptions?.sub_category?.length ===
                                    watch("sub_category")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue("sub_category", apiDropdownOptions.sub_category);
                                    } else {
                                      setValue("sub_category", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="sub_category"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Sub Category",
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
                                  {apiDropdownOptions?.sub_category?.map(
                                    (sub_category: string) => {
                                      return (
                                        <option value={sub_category}>{sub_category}</option>
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

              <div className="overflow-auto xl:overflow-visible px-5">
                <Tab.Group>
                  <Tab.List variant="link-tabs">
                    <Tab>
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("proposal");
                        dispatch(resetPage());
                      }}>
                        Shareholder Proposals
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("no-action");
                        dispatch(resetPage());
                      }}>
                        No Action Letter
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button className="w-full py-2" as="button" onClick={() => {
                        setTab("withdrawn");
                        dispatch(resetPage());
                      }}>
                        Withdrawn
                      </Tab.Button>
                    </Tab>

                  </Tab.List>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
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
                                Proponent
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Proposal No
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Outcome/Percentage for
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                No Action Letters
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            {shareHolderProposal?.length > 0 &&
                              shareHolderProposal?.map(
                                (noAction: any) => (
                                  <Table.Tr key={noAction?.id} className="[&_td]:last:border-b-0">
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[300px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.company_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.company_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[300px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.proponent_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.proponent_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.proposal_num}
                                    </Table.Td>
                                    <Table.Td className={clsx(["py-2 font-semibold border-dashed dark:bg-darkmode-600", noAction?.outcome_percentage?.includes('Fail') && 'text-red-600',
                                      noAction?.outcome_percentage?.includes('Withdrawn') && 'text-green-600', noAction?.outcome_percentage?.includes('Pass') && 'text-blue-600'])}>
                                      {noAction?.outcome_percentage ? noAction?.outcome_percentage : 'Meeting not held or Results not available'}
                                    </Table.Td>
                                    <Table.Td className={clsx(["py-2 font-semibold border-dashed dark:bg-darkmode-600",
                                      noAction?.nl_exist && 'text-blue-600 underline cursor-pointer'])}
                                      onClick={() => {
                                        const id = noAction?.nl_exist === true ? noAction?.no_action_link?.split('/').filter(Boolean).pop() : 0;
                                        console.log(id + noAction?.no_action_link);
                                        noAction?.nl_exist === true && navigate(`/share-holder-proposal/${id}?url=shareholder_proposal/no_action`)
                                      }}>
                                      {noAction?.nl_exist === true ? 'Yes' : ''}
                                    </Table.Td>
                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex">
                                        <Tippy
                                          content=" See Details"
                                          options={{
                                            theme: "dark",
                                          }}
                                        >
                                          <Lucide
                                            onClick={() =>
                                              navigate(`/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/def14a`)}
                                            icon="Eye"
                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                          />
                                        </Tippy>
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                )
                              )}
                          </Table.Tbody>
                        </Table>
                      </TableWrapper>
                    </Tab.Panel>

                  </Tab.Panels>


                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
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
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Sub Category
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Proponent
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Outcome
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            {shareHolderProposal?.length > 0 &&
                              shareHolderProposal?.map(
                                (noAction: any) => (
                                  <Table.Tr key={noAction?.id} className="[&_td]:last:border-b-0">
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.company_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.company_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.category}
                                    </Table.Td>
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.sub_category}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[150px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.proponent_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.proponent_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[150px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.staff_response}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.staff_response}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex">
                                        <Tippy
                                          content=" See Details"
                                          options={{
                                            theme: "dark",
                                          }}
                                        >
                                          <Lucide
                                            onClick={() =>
                                              navigate(`/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/no_action`)}
                                            icon="Eye"
                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                          />
                                        </Tippy>
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                )
                              )}
                          </Table.Tbody>
                        </Table>
                      </TableWrapper>
                    </Tab.Panel>

                  </Tab.Panels>




                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      <TableWrapper isLoading={loading}>
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
                                Proponent
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Outcome
                              </Table.Td>
                              <Table.Td className="py-2 font-medium bg-slate-50 w-[150px] text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                Actions
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            {shareHolderProposal?.length > 0 &&
                              shareHolderProposal?.map(
                                (noAction: any) => (
                                  <Table.Tr key={noAction?.id} className="[&_td]:last:border-b-0">
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[200px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.company_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.company_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[300px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.proponent_name}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.proponent_name}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[150px] overflow-hidden text-ellipsis">
                                      <Tippy
                                        content={noAction?.status}
                                        options={{ theme: "light" }}
                                      >
                                        {noAction?.status}
                                      </Tippy>
                                    </Table.Td>
                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex">
                                        <Tippy
                                          content=" See Details"
                                          options={{
                                            theme: "dark",
                                          }}
                                        >
                                          <Lucide
                                            onClick={() =>
                                              navigate(`/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/withdrawn`)}
                                            icon="Eye"
                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                          />
                                        </Tippy>
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                )
                              )}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ShareHolderProposal;
