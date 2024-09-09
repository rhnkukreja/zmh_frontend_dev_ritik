import Lucide from "@/components/Base/Lucide";
import { useEffect, useMemo, useState } from "react";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchCompanies,
  setPage,
  setFilter,
  resetFilter,
  resetPage,
} from "@/stores/companySlice";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { AddEditCompany } from "./component/CreateAndEditCompany";
import { CompanyData } from "@/types/company";

import { useNavigate } from "react-router-dom";

import Tippy from "@/components/Base/Tippy";
import { FilterX } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import _ from "lodash";

function CompanyList() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const { loading, companies, page, totalPages, filters } = useAppSelector(
    (state) => state.company
  );

  const [addNewCompanyVisible, setAddNewCompanyVisible] =
    useState<boolean>(false);
  const [selectedCompany] = useState<CompanyData | null>(null);
  const { user } = useAppSelector((state) => state.authentiction);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  useEffect(() => {
    
    if (filters) {
      dispatch(
        fetchCompanies(createDynamicURL(`${baseURL}/company/`, filters))
      );
    }
    else {
      dispatch(
        fetchCompanies(createDynamicURL(`${baseURL}/company/`, filters, page))
      );
    }
    
  }, [page, filters]);

  useEffect(() => {
    return () => {
      dispatch(resetPage());
      dispatch(resetFilter());
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

  const debouncedSearch = _.debounce((searchTerms) => {
    dispatch(
      setFilter({
        key: "institution_name",
        value: searchTerms,
      })
    );
  }, 700);

  const handleApplyFilter = () => {
    dispatch(
      fetchCompanies(createDynamicURL(`${baseURL}/company/`, filters, page))
    );
  };

  const onFilterClear = () => {
    dispatch(resetFilter());
    dispatch(
      fetchCompanies(createDynamicURL(`${baseURL}/company/`, undefined, page))
    );
  };

  const getFilterCount = useMemo(() => {
    const { ...allFilters } = filters;
    return Object.values(allFilters).filter((value) => value !== "").length;
  }, [filters]);

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
   
    // setSearchValue('');
    dispatch(
      fetchCompanies(
        createDynamicURL(`${baseURL}/company/`, undefined, page)
      )
    );
    dispatch(
      setFilter({
        key: "institution_name",
        value: [],
      })
    );

    dispatch(resetPage());


  }

  const handleSearch = () => {
    debouncedSearch(searchTerms);
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            Company List
          </div>
          {user?.user_type === "Admin" && (
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                onClick={() => {
                  setAddNewCompanyVisible(true);
                }}
                variant="primary"
                className="bg-theme-2 border-bg-theme-2 group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
              >
                <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />{" "}
                Add New Company
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
                  />

                <div className="hover:bg-slate-50">

                  <Button onClick={handleClearAllFilter}>

                    <Tippy content="Clear Filter"
                      options={{ theme: "light", }}>
                      <FilterX size={17} strokeWidth={1} className="text-slate-500 cursor-pointer	" />
                    </Tippy>
                    {/* <span className="text-slate-500">Clear Filter</span> */}
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-auto xl:overflow-visible">
              <TableWrapper isLoading={loading}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Td className="py-2 font-medium text-nowrap bg-slate-50  border-slate-200/80 text-slate-500">
                        Company ID
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50  border-slate-200/80 text-slate-500">
                        Name
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50  border-slate-200/80 text-slate-500">
                        CUSIP
                      </Table.Td>
                      <Table.Td className="py-2 text-nowrap font-medium bg-slate-50  border-slate-200/80 text-slate-500">
                        Sector Name
                      </Table.Td>
                      <Table.Td className="py-2 font-medium bg-slate-50 border-slate-200/80 text-slate-500">
                        Symbol
                      </Table.Td>
                      {/* <Table.Td className="py-2 font-medium bg-slate-50  border-slate-200/80 text-slate-500">
                        Company V1
                      </Table.Td> */}
                      <Table.Td className="py-2 font-medium bg-slate-50  border-slate-200/80 text-slate-500">
                        Actions
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
                                  theme: "dark",
                                }}
                              >
                                <Lucide
                                  onClick={() => {
                                    navigate(`/company-detail/${company?.id}`);
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
                </Table>
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
