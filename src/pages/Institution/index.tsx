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
import { countValidFilters, createDynamicURL } from "@/utils/helper";
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

interface InstituteFilter {
  region: string[];
}

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  const [filtersLength, setFiltersLength] = useState<number>(0);

  const {
    institutions,
    loading,
    page,
    totalPages,
    institutionFilterOptions,
    filters,
  } = useAppSelector((state) => state.institutions);

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
      toast.success("Searched saved successfully");
    }
  };

  const onSubmit = async (institutionFilters: InstituteFilter) => {
    Object.entries(institutionFilters).forEach(([key, value]) => {
      dispatch(setFilter({ key: key as any, value }));
    });

    dispatch(resetPage());
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="font-semibold text-xl ">Institutions</div>
          {user?.user_type === "Admin" && (
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
            <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
              <div className="flex items-center ">
                <MultiSearchBar
                  onSearch={handleSearch}
                  searchTerms={searchTerms}
                  setSearchTerms={setSearchTerms}
                  url="/investor_profile/?type=profiles"
                  getOptionKey="institution_name"
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
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                {user?.saved_search?.["Institution"] !== undefined && (
                  <div className="hover:bg-slate-50 ">
                    <Button onClick={getSavedSearches}>Previous Search</Button>
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
                          <div className="p-2">
                            <div className="mt-3">
                              <div className="w-full  my-2">
                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                  region
                                  {institutionFilterOptions?.region?.length >
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
                                      </FormCheck>
                                    </div>
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
                                        placeholder: "Select region",
                                      }}
                                      className="w-full"
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
                            <div className="flex items-center mt-4">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  onFilterClear();
                                  close();
                                }}
                                className="w-32 ml-auto"
                              >
                                Clear
                              </Button>
                              <Button
                                type="submit"
                                variant="primary"
                                className="w-32 ml-2"
                                onClick={() => {
                                  close();
                                }}
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
            <div className="px-5">
              <TableWrapper isLoading={loading}>
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Institution
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap  border-slate-200/80 text-slate-500">
                        Active
                      </Table.Td> */}

                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Region
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Investor Type
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Whale Wisdom Filer
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Created At
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Updated At
                      </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Details
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {institutions?.length > 0 ? (
                        institutions?.map((institution: Institutions) => (
                          <Table.Tr key={institution.id}>
                            <Table.Td className="py-2 bg-white text-slate-700 border-slate-200/80">
                              <div className="flex items-center">
                                {institution?.logo_url ? (
                                  <>
                                    <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                      <img
                                        alt="ZMH Analytics"
                                        className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                        src={institution?.logo_url}
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
                                    {institution?.institution}
                                  </p>
                                  <div className="text-slate-500 text-xs whitespace-nowrap mt-0.5">
                                    {institution?.email}
                                  </div>
                                </div>
                              </div>
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

                            {institution?.region && (
                              <Table.Td className="py-2  bg-white border-slate-200/80">
                                {institution?.region}
                              </Table.Td>
                            )}
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              {institution.investor_type}
                            </Table.Td>
                            <Table.Td className="py-2  bg-white border-slate-200/80">
                              {institution?.whale_wisdom_filer_id}
                            </Table.Td>
                            <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                              <p className="text-gray-500">
                                {institution?.date_created}
                                {/* {dayjs(institution?.date_created).format(
                                "MMMM , YYYY"
                              )} */}
                              </p>
                            </Table.Td>
                            {/* <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                            <p className="text-gray-500">
                              {institution?.date_updated}
                              
                            </p>
                          </Table.Td> */}

                            <Table.Td className=" py-2 w-20 relative  box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                              <div className="flex gap-3 ">
                                <Tippy
                                  content="View"
                                  options={{
                                    theme: "dark",
                                  }}
                                >
                                  <Lucide
                                    onClick={() => {
                                      navigate(
                                        `/institution/${institution?.id}`
                                      );
                                    }}
                                    icon="Eye"
                                    className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                  />
                                </Tippy>

                                {user?.user_type === "Admin" && (
                                  <Tippy
                                    content="Edit"
                                    options={{
                                      theme: "dark",
                                    }}
                                  >
                                    <Lucide
                                      onClick={() => {
                                        onEditClickHandler(institution);
                                      }}
                                      icon="PenLine"
                                      className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                    />
                                  </Tippy>
                                )}
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td
                            colSpan={7}
                            className="py-10 text-center text-slate-500"
                          >
                            No institutions found.
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                    {institutions?.length === 0 && (
                      <div className="w-full">
                        <h1 className="mt-3">No Records Found..</h1>
                      </div>
                    )}
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
      </div>
    </div>
  );
}

export default Main;
