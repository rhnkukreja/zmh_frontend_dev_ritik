import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useMemo, useState } from "react";
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
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate } from "react-router-dom";
import { Institutions } from "@/types/institutions";
import { AddEditInstitution } from "./components/CreateAndEditInstitution";
import dayjs from "dayjs";
import { FilterX } from "lucide-react";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const {
    institutions,
    loading,
    page,
    totalPages,
    institutionFilterOptions,
    filters,
  } = useAppSelector((state) => state.institutions);

  const { user } = useAppSelector((state) => state.authentiction);

  const [selectedInstitution, setSelectedInstitution] =
    useState<Institutions | null>(null);
  const [addEditInstitutionVisible, setAddEditInstitutionVisible] =
    useState<boolean>(false);

  useEffect(() => {
    dispatch(
      fetchInstitutions(
        createDynamicURL(`${baseURL}/institute/`, filters, page)
      )
    );
  }, [page, filters.institution_name]);

  useEffect(() => {
    return () => {
      console.log('destory the component institution' );
      dispatch(resetPage());
      dispatch(
        setFilter({
          key: "institution_name",
          value: '',
        })
      );
    }
  }, [])

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

  const debouncedSearch = _.debounce((searchedValue) => {
    dispatch(
      setFilter({
        key: "institution_name",
        value: searchedValue,
      })
    );
  }, 700);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  }

  function handleApplyFilter() {
    dispatch(
      fetchInstitutions(
        createDynamicURL(`${baseURL}/institute/`, filters, page)
      )
    );
    dispatch(resetPage());
  }

  const getFilterCount = useMemo(() => {
    const { institution_name, ...allFilters } = filters;
    return Object.values(allFilters).filter((value) => value !== "").length;
  }, [filters]);

  const onFilterClear = () => {
    dispatch(resetFilter());
    dispatch(
      fetchInstitutions(
        createDynamicURL(`${baseURL}/institute/`, undefined, page)
      )
    );
  };

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchValue('');
    dispatch(
      fetchInstitutions(
        createDynamicURL(`${baseURL}/institute/`, undefined, page)
      )
    );
    dispatch(
      setFilter({
        key: "institution_name",
        value: '',
      })
    );

  }

  useEffect(() => {
    if (addEditInstitutionVisible === false) {
      setSelectedInstitution(null);
    }
  }, [addEditInstitutionVisible]);

  function onEditClickHandler(institution: Institutions) {
    setSelectedInstitution(institution);
    setAddEditInstitutionVisible(true);
  }

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            Institutions
          </div>
          {user?.user_type === "Admin" && (
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                onClick={() => {
                  setAddEditInstitutionVisible(true);
                }}
                variant="primary"
                className="group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
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
                  <div className="relative mr-5 ">
                    <Lucide
                      icon="Search"
                      className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
                    />
                    <FormInput
                      type="text"
                      placeholder="Search Institute Name"
                      className="pl-9 sm:w-64 rounded-[0.5rem]"
                      onChange={handleSearch}
                      value={searchValue}
                    />
                  </div>

                  <div className="hover:bg-slate-50">
                    <Button onClick={handleClearAllFilter}>
                      <FilterX size={17} strokeWidth={1} className="text-slate-500 mr-3 cursor-pointer	" />
                      <span className="text-slate-500">Clear Filter</span>
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
                          {getFilterCount}
                        </div>
                      </Popover.Button>
                      <Popover.Panel placement="bottom-end">
                        <div className="p-2">
                          <div className="mt-3">
                            <div className="text-left text-slate-500">
                              Region
                            </div>
                            <FormSelect
                              defaultValue={
                                filters.region.length > 0
                                  ? filters.region
                                  : "Select Region"
                              }
                              className="flex-1 mt-2"
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) => {
                                dispatch(
                                  setFilter({
                                    key: "region",
                                    value: e.target.value,
                                  })
                                );
                              }}
                            >
                              <option disabled selected>
                                Select Region
                              </option>
                              {institutionFilterOptions.region.map(
                                (region: string, index: number) => {
                                  return (
                                    <option key={index} value={region}>
                                      {region}
                                    </option>
                                  );
                                }
                              )}
                            </FormSelect>
                          </div>
                          {/* <div className="mt-3">
                            <div className="text-left text-slate-500">
                              Investor Type
                            </div>
                            <FormSelect
                              defaultValue={
                                filters.investor_type.length > 0
                                  ? filters.investor_type
                                  : "Select Investor Type"
                              }
                              className="flex-1 mt-2"
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) => {
                                dispatch(
                                  setFilter({
                                    key: "investor_type",
                                    value: e.target.value,
                                  })
                                );
                              }}
                            >
                              <option disabled selected>
                                Select Investor Type
                              </option>
                              {institutionFilterOptions.investor_type.map(
                                (type: string, index: number) => {
                                  return (
                                    <option key={index} value={type}>
                                      {type}
                                    </option>
                                  );
                                }
                              )}
                            </FormSelect>
                          </div> */}
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
                              onClick={handleApplyFilter}
                              variant="primary"
                              className="w-32 ml-2"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </Popover.Panel>
                    </>
                  )}
                </Popover>
              </div>
            </div>
            <div className="overflow-auto xl:overflow-scroll">
              <TableWrapper isLoading={loading}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Institution
                      </Table.Td>
                      {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap  border-slate-200/80 text-slate-500">
                        Active
                      </Table.Td> */}

                      <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap border-slate-200/80 text-slate-500">
                        Region
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Investor Type
                      </Table.Td>
                      {/* <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Contact
                      </Table.Td> */}
                      <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap border-slate-200/80 text-slate-500">
                        Created At
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Updated At
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap border-slate-200/80 text-slate-500">
                        Action
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {institutions?.length > 0 ? (
                      institutions?.map((institution: Institutions) => (
                        <Table.Tr key={institution.id}>
                          <Table.Td className="py-2 bg-white text-slate-700 border-slate-200/80">
                            <div className="flex items-center">
                              {/* {institution?.logo_url ? (
                                <>
                                  <div className="w-8 h-8 image-fit zoom-in object-contain">
                                    <Tippy
                                      as="img"
                                      alt="Tailwise - Admin Dashboard Template"
                                      className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                      src={institution?.logo_url}
                                      content={institution?.institution}
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
                              )} */}
                              <div className="">
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

                          <Table.Td className="py-2  bg-white border-slate-200/80">
                            {institution?.region}
                          </Table.Td>
                          <Table.Td className="py-2  bg-white border-slate-200/80">
                            {institution.investor_type}
                          </Table.Td>
                          {/* <Table.Td className="py-2  bg-white border-slate-200/80">
                            {institution?.contact}
                          </Table.Td> */}
                          <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                            <p className="text-gray-500">
                              {dayjs(institution?.date_created).format(
                                "MMMM , YYYY"
                              )}
                            </p>
                          </Table.Td>
                          <Table.Td className="py-2  bg-white text-nowrap border-slate-200/80">
                            <p className="text-gray-500">
                              {dayjs(institution?.date_updated).format(
                                "MMMM , YYYY"
                              )}
                            </p>
                          </Table.Td>

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
                                      `/institution-detail/${institution?.id}`
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
                </Table>
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
