import Lucide from "@/components/Base/Lucide";
import { useEffect, useState } from "react";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchCompanies,
  setPage,
  setFilter,
  resetFilter,
  resetPage,
  setAllFilters,
  selectUnSelectAllCompany,
} from "@/stores/companySlice";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { AddEditCompany } from "./component/CreateAndEditCompany";
import { CompanyData } from "@/types/company";

import { useNavigate } from "react-router-dom";

import Tippy from "@/components/Base/Tippy";
import { SaveAll } from "lucide-react";

import _ from "lodash";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import CompanySelect from "@/components/ReactSelectAsync";
import { FormSwitch } from "@/components/Base/Form";
import { modifyRoute } from "@/stores/themeSlice";

interface CompanyFilterTypes {
  global_search?: string[];
}

function CompanyList() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    loading,
    companies,
    page,
    totalPages,
    filters,
    isAllCompanySelected,
  } = useAppSelector((state) => state.company);

  const [addNewCompanyVisible, setAddNewCompanyVisible] =
    useState<boolean>(false);
  const [selectedCompany] = useState<CompanyData | null>(null);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompanyFilterTypes>({
    defaultValues: {
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
    },
  });

  const resetFormValues = () => {
    setValue("global_search", []);
  };

  useEffect(() => {
    dispatch(
      setFilter({
        key: "global_search",
        value: isAllCompanySelected ? [] : [companyGlobalSearchName],
      })
    );

    dispatch(
      modifyRoute({
        route: "company",
        type: isAllCompanySelected === true ? true : false,
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  useEffect(() => {
    if (isAllCompanySelected === false && filters.global_search.length === 0) {
      return;
    }

    dispatch(
      fetchCompanies(
        createDynamicURL(`${baseURL}/company/`, filters, undefined, page)
      )
    );

    const { global_search, ...restFilters } = filters;

    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );
  }, [page, filters.global_search, filters]);

  const onFilterClear = () => {
    reset();

    if (isAllCompanySelected) resetFormValues();
    dispatch(resetPage());
    // dispatch(resetFilter());
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

  const getSavedSearches = () => {
    dispatch(
      setFilter({
        key: "global_search",
        value: user?.saved_search["global_search"]?.global_search,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Company",
      global_search: filters["global_search"],
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Company",
          value: {
            global_search: filters["global_search"],
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const onSubmit = async (companyFilters: CompanyFilterTypes) => {
    dispatch(
      setAllFilters({
        ...companyFilters,

        global_search: isAllCompanySelected
          ? Array.isArray(companyFilters?.global_search) &&
            companyFilters?.global_search.length > 0
            ? companyFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );

    dispatch(resetPage());
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
          {isAllCompanySelected === true ? (
            <div className="font-semibold text-xl">All Companies</div>
          ) : (
            <div className="font-semibold text-xl">Company</div>
          )}

          <div className="flex items-center ">
            <div className="flex items-center">
              <Tippy
                content="All Companies"
                options={{
                  theme: "light",
                }}
              >
                <div>
                  <FormSwitch>
                    <label className="text-md mr-3 font-semibold">
                      View All
                    </label>
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

            {user?.user_type === "Analyst" && (
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
                <Button
                  onClick={() => {
                    setAddNewCompanyVisible(true);
                  }}
                  variant="primary"
                  className="bg-theme-2 border-bg-theme-2"
                >
                  <Lucide
                    icon="PenLine"
                    className="stroke-[1.3] w-4 h-4 mr-2"
                  />{" "}
                  Add New Company
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3.5">
          <div className="flex flex-col box box--stacked">
            <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                {user?.saved_search?.["Company"] !== undefined && (
                  <div className="hover:bg-slate-50 ">
                    <Button onClick={getSavedSearches}>Previous Search</Button>
                  </div>
                )}

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

                {isAllCompanySelected === true && (
                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                          // onClick={handleCollapseFilter}
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
                                  variant="primary"
                                  className="w-32 ml-2"
                                  type="submit"
                                >
                                  Apply
                                </Button>
                              </div>
                              <div className="mt-3">
                                <div className="w-full  my-2">
                                  <div className="w-full ">
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
                                              onChange={(value: any) => {
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
                                </div>
                              </div>
                            </div>
                          </form>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                )}
              </div>
            </div>
            <div className=" px-5">
              <TableWrapper isLoading={loading}>
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Company ID
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Name
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          CUSIP
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Sector Name
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Symbol
                        </Table.Td>
                        {/* <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Company V1
                      </Table.Td> */}
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Details
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {companies?.length > 0 &&
                        companies?.map((company: CompanyData) => (
                          <Table.Tr key={company.id}>
                            <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {company.company_id}
                            </Table.Td>
                            <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {company.name}
                            </Table.Td>
                            <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {company.cusip}
                            </Table.Td>
                            <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                              {company.sector_name}
                            </Table.Td>

                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                              {company.symbol}
                            </Table.Td>
                            {/* <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                            {company.company_v1}
                          </Table.Td> */}

                            <Table.Td className=" py-2 w-20 relative  ">
                              <div className="flex gap-3  justify-center">
                                <Tippy
                                  content="View "
                                  options={{
                                    theme: "light",
                                  }}
                                >
                                  <Lucide
                                    onClick={() => {
                                      navigate(`/company/${company?.id}`);
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
                    {companies?.length === 0 && (
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
        {addNewCompanyVisible && (
          <AddEditCompany
            addNewCompanyVisible={addNewCompanyVisible}
            setAddNewCompanyVisible={setAddNewCompanyVisible}
            selectedCompany={selectedCompany}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyList;
