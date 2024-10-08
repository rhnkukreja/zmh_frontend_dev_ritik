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
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import _ from "lodash";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import { setSavedSearch } from "@/stores/authenticationSlice";

function CompanyList() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const { loading, companies, page, totalPages, filters } = useAppSelector(
    (state) => state.company
  );

  const [addNewCompanyVisible, setAddNewCompanyVisible] =
    useState<boolean>(false);
  const [selectedCompany] = useState<CompanyData | null>(null);
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  useEffect(() => {
    dispatch(
      setFilter({
        key: "company",
        value: [companyGlobalSearchName],
      })
    );
  }, [companyGlobalSearchName]);

  useEffect(() => {
    if (filters) {
      dispatch(
        fetchCompanies(createDynamicURL(`${baseURL}/company/`, filters))
      );
    } else {
      dispatch(
        fetchCompanies(createDynamicURL(`${baseURL}/company/`, filters, page))
      );
    }
  }, [page, filters]);

  useEffect(() => {
    return () => {
      dispatch(resetPage());
      dispatch(resetFilter());
    };
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

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Company"]?.company]);
    dispatch(
      setFilter({
        key: "company",
        value: user?.saved_search["Company"]?.company,
      })
    );
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Company",
      company: filters["company"],
    });
    if (res?.Success) {
      dispatch(
        setSavedSearch({
          key: "Company",
          value: {
            company: filters["company"],
          },
        })
      );
      toast.success(res?.Success || "Searched saved successfully");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="font-semibold text-xl ">
            Company
          </div>
          {user?.user_type === "Admin" && (
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                onClick={() => {
                  setAddNewCompanyVisible(true);
                }}
                variant="primary"
                className="bg-theme-2 border-bg-theme-2"
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
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                {user?.saved_search?.["Company"] !== undefined && (
                  <div className="hover:bg-slate-50 ml-2">
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
                                      navigate(
                                        `/company-detail/${company?.id}`
                                      );
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
