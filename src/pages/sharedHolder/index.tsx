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
import TomSelect from "@/components/Base/TomSelect/ServerComponent";
import { fetchShareHolderProposal, setPage } from "@/stores/shareholderProposalSlice";
import { resetPage } from "@/stores/shareholderProposalSlice";



function ShareHolderProposal() {

  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"proposal" | "no-action" | "withdrawn">("proposal");

  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [applyFilters, setApplyFilters] = useState<ShareHolderFilter | undefined>(undefined);
  const [categoryName, setCategoryName] = useState<string>('');

  const {
    loading,
    shareHolderProposal,
    page,
    totalPages,
    filters,
    // investerProfileFilterOption,
  } = useAppSelector((state) => state.sharedHolderNoAction);
  const { user } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
      if(tab === 'proposal'){
        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(`${baseURL}/shareholder_proposal/def14a/`,applyFilters,undefined, page)
          )
        );
      }
      else if(tab === 'no-action'){
        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(`${baseURL}/shareholder_proposal/no_action/`,applyFilters,undefined, page)
          )
        );
      }
      else if(tab === 'withdrawn'){
        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(`${baseURL}/shareholder_proposal/withdrawn/`,applyFilters,undefined, page)
          )
        );
      }

      // const getFilterCount = useMemo(() => {
      //   const {proponent_name, ...allFilters } = applyFilters.;
      //   return Object.values(allFilters).filter((value) => value !== "").length;
      // }, [applyFilters]);
    
  }, [page, tab, applyFilters]);


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
    setCategoryName('');
  };

  const handleClearAllFilter = () => {

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

  // const getFilterCount = useMemo(() => {
  //   const { institution_name, ...allFilters } = filters;
  //   return Object.values(allFilters).filter((value) => value !== "").length;
  // }, [filters]);

  const handleSearch = (searchTerms: string[]) => {

  };
  const { handleSubmit, control, reset, formState: { errors }} = useForm<any>();

      
  interface ShareHolderFilter {
    proponent_name: string,
    year: number[],
    category: string,
    sub_category: string,
    keyword: string,
    active: string,
    [key: string]: any;
  }

  const onSubmit = async (data: ShareHolderFilter) => {
 
    const shareHolderFilter: ShareHolderFilter = {
      proponent_name: data?.proponent_name, 
      year: Object.keys(data).filter(key => ['2021', '2022', '2023', '2024'].includes(key) && data[key]).map(Number),
      category: data?.category,            
      sub_category: data?.sub_category,     
      keyword: data?.keyword,
      active: data?.active           
    };

    setApplyFilters(shareHolderFilter);

  };

  const handleCategory = (item:any) => {
    setCategoryName(item?.target?.value);
    console.log(categoryName);
    // return field.value?.toString();
  }


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
                            0{/* {getFilterCount} */}
                          </div>
                        </Popover.Button>
                        <Popover.Panel placement="bottom-end" className="sm:w-[350px] lg:w-[400px] ">
                          <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="p-2">
                              <div className="">
                                <label className="font-bold">Year</label>
                                <div className="flex items-center justify-between mt-2 sm:flex-row">


                                <Controller
                                    name="2024"
                                    control={control}
                                    render={({ field }) => (
                                      <>

                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="checkbox-switch-4"
                                            type="checkbox"
                                            {...field}
                                            value="2024"
                                            checked={field.value}
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-switch-5"
                                            className="ml-2"
                                          >
                                            2024
                                          </FormCheck.Label>
                                        </FormCheck>


                                      </>
                                    )}
                                  />

                                  <Controller
                                    name="2023"
                                    control={control}
                                    render={({ field }) => (
                                      <>

                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="checkbox-switch-4"
                                            type="checkbox"
                                            {...field}
                                            value="2023"
                                            checked={field.value}
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-switch-5"
                                            className="ml-2"
                                          >
                                            2023
                                          </FormCheck.Label>
                                        </FormCheck>


                                      </>
                                    )}
                                  />


                                  <Controller
                                    name="2022"
                                    control={control}
                                    render={({ field }) => (
                                      <>

                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="checkbox-switch-4"
                                            type="checkbox"
                                            {...field}
                                            value="2022"
                                            checked={field.value}
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-switch-5"
                                            className="ml-2"
                                          >
                                            2022
                                          </FormCheck.Label>
                                        </FormCheck>


                                      </>
                                    )}
                                  />


                                  <Controller
                                    name="2021"
                                    control={control}
                                    render={({ field }) => (
                                      <>
                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="checkbox-switch-4"
                                            type="checkbox"
                                            {...field}
                                            value="2021"
                                            checked={field.value}
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-switch-5"
                                            className="ml-2"
                                          >
                                            2021
                                          </FormCheck.Label>
                                        </FormCheck>

                                      </>
                                    )}
                                  />

                                </div>
                              </div>

                              <hr className="my-3" />

                              <div className="">
                                <label className="font-bold">Status</label>
                                <div className="flex items-center justify-between mt-2 sm:flex-row">

                                  <Controller
                                    name="active"
                                    control={control}
                                    render={({ field }) => (
                                      <>
                                        <FormCheck className="mr-2">
                                          <FormCheck.Input
                                            id="radio-switch-4"
                                            type="radio"
                                            {...field}
                                            value="All"
                                            checked={field.value === "All"}
                                          />
                                          <FormCheck.Label
                                            htmlFor="radio-switch-4"
                                            className="ml-2"
                                          >
                                            All
                                          </FormCheck.Label>
                                        </FormCheck>
                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="radio-switch-5"
                                            type="radio"
                                            {...field}
                                            value="Pass"
                                            checked={field.value === "Pass"}
                                          />
                                          <FormCheck.Label
                                            htmlFor="radio-switch-5"
                                            className="ml-2"
                                          >
                                            Pass
                                          </FormCheck.Label>
                                        </FormCheck>
                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="radio-switch-5"
                                            type="radio"
                                            {...field}
                                            value="fail"
                                            checked={field.value === "fail"}
                                          />
                                          <FormCheck.Label
                                            htmlFor="radio-switch-5"
                                            className="ml-2"
                                          >
                                            fail
                                          </FormCheck.Label>
                                        </FormCheck>
                                        <FormCheck className="mt-2 mr-2 sm:mt-0">
                                          <FormCheck.Input
                                            id="radio-switch-5"
                                            type="radio"
                                            {...field}
                                            value="withdrawn"
                                            checked={field.value === "withdrawn"}
                                          />
                                          <FormCheck.Label
                                            htmlFor="radio-switch-5"
                                            className="ml-2"
                                          >
                                            withdrawn
                                          </FormCheck.Label>
                                        </FormCheck>
                                      </>
                                    )}
                                  />
                                </div>
                              </div>
                              <hr className="my-2" />
                              <div>
                                <div className="flex">
                                  <div className="mt-2 w-full mr-2">
                                    <div className="text-left text-slate-500"> Proponent </div>
                                    <Controller
                                      name="proponent"
                                      control={control}
                                      defaultValue=""
                                      render={({ field }) => (
                                        <TomSelect
                                          url="/institute/"
                                          valueKey="id"
                                          labelKey="institution"
                                          value={field.value?.toString() || ""}
                                          onChange={(value) => field.onChange(value)}
                                          options={{ placeholder: "Select Proponent" }}
                                          className="w-full"
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="mt-2 w-full">
                                    <div className="text-left text-slate-500"> Category </div>
                                    <Controller
                                      name="category"
                                      control={control}
                                      defaultValue=""
                                      render={({ field }) => (
                                        <TomSelect
                                          url="/institute/"
                                          valueKey="institution"
                                          labelKey="institution"
                                          value={field.value?.toString() || ""}
                                          onChange={(value) => {field.onChange(value); handleCategory(value)}}
                                          options={{ placeholder: "Select Category" }}
                                          className="w-full"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                                {categoryName && <div className="w-full mr-2">
                                  <div className="mt-2">
                                    <div className="text-left text-slate-500"> Sub Category </div>
                                    <Controller
                                      name="sub-category"
                                      control={control}
                                      defaultValue=""
                                      render={({ field }) => (
                                        <TomSelect
                                          url={`/def14a/?category=${categoryName}`}
                                          valueKey="id"
                                          labelKey="institution"
                                          value={field.value?.toString() || ""}
                                          onChange={(value) => field.onChange(value)}
                                          options={{ placeholder: "Select Sub Category" }}
                                          className="w-full"
                                        />
                                      )}
                                    />
                                  </div>

                                </div>
                                }
                              </div>


                              <div className="mt-2">
                                <div className="text-left text-slate-500"> Keyword </div>
                                <Controller
                                  name="keyword"
                                  control={control}
                                  defaultValue=""
                                  render={({ field }) => (
                                    <FormInput value={field.value?.toString() || ""} onChange={(value) => field.onChange(value)} type="text" className="col-span-4 flex-1 mt-2" placeholder="Enter Keyword" aria-label="default input inline 1" />
                                  )}
                                />

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
                                  // onClick={handleApplyFilter}
                                  variant="primary"
                                  className="w-full mx-2"
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
                                Category
                              </Table.Td>
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Sub Category
                                </Table.Td>
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proponent
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
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.company_name}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.category}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.sub_category}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.proponent}
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
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Sub Category
                                </Table.Td>
                                <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Proponent
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
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.company_name}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.category}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.sub_category}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {/* {noAction?.year} */}
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
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.company_name}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {noAction?.proponent}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {/* {noAction?.year} */}
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
  )
}

export default ShareHolderProposal;
