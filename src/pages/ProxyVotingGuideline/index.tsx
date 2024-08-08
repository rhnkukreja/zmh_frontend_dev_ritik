import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
import Pagination from "@/components/Base/Pagination";
import TomSelect from "@/components/Base/TomSelect";
import { FormCheck, FormInput, FormSelect } from "@/components/Base/Form";
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
} from "@/stores/proxyVotingGuidelineSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";
import { useNavigate } from "react-router-dom";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { AddEditPolicyGuideline } from "./components/AddEditProxyVotingGuideline";
import PdfViewer from "@/components/PdfView";

function ProxyGuideline() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    loading,
    proxyVotingGuidelines,
    page,
    totalPages,
    filters,
    guidelineFilterOptions,
  } = useAppSelector((state) => state.proxyVotingGuideline);
  const { user } = useAppSelector((state) => state.authentiction);

  const [
    addNewProxyVotingGuidelineVisible,
    setAddNewProxyVotingGuidelineVisible,
  ] = useState<boolean>(false);
  const [selectedProxyVotingGuideline, setSelectedProxyVotingGuideline] =
    useState<ProxyVotingGuideline | null>(null);

  const [pdfVisible, setPdfVisible] = useState<boolean>(false);
  const [currentPdfDoc, setCurrentPdfDoc] = useState<string>("");

  useEffect(() => {
    dispatch(
      fetchProxyVotingGuidelines(
        createDynamicURL(`${baseURL}/proxy_voting_guidelines/`, filters, page)
      )
    );
  }, [page, filters.year]);

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

  const gotoDetailPage = (pdf: string) => {
    setCurrentPdfDoc(pdf);
  };

  const debouncedSearch = _.debounce((searchedValue) => {
    dispatch(
      setFilter({
        key: "year",
        value: searchedValue,
      })
    );
  }, 700);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    debouncedSearch(e.target.value);
  }

  function handleApplyFilter() {
    dispatch(
      fetchProxyVotingGuidelines(
        createDynamicURL(`${baseURL}/proxy_voting_guidelines/`, filters, page)
      )
    );

    dispatch(resetPage());
  }

  const onFilterClear = () => {
    dispatch(resetFilter());
    dispatch(
      fetchProxyVotingGuidelines(
        createDynamicURL(`${baseURL}/proxy_voting_guidelines/`, undefined, page)
      )
    );
  };

  const getFilterCount = useMemo(() => {
    const { ...allFilters } = filters;
    return Object.values(allFilters).filter((value) => value !== "").length;
  }, [filters]);

  useEffect(() => {
    if (!addNewProxyVotingGuidelineVisible) {
      setSelectedProxyVotingGuideline(null);
    }
  }, [addNewProxyVotingGuidelineVisible]);

  const onEditClickHandler = (guideline: ProxyVotingGuideline) => {
    setSelectedProxyVotingGuideline(guideline);
    setAddNewProxyVotingGuidelineVisible(true);
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              Proxy Voting Guidelines
            </div>
            {user?.user_type === "Admin" && (
              <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
                <Button
                  onClick={() => {
                    setAddNewProxyVotingGuidelineVisible(true);
                  }}
                  variant="primary"
                  className="group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
                >
                  <Lucide
                    icon="PenLine"
                    className="stroke-[1.3] w-4 h-4 mr-2"
                  />{" "}
                  Add New Proxy Voting Guideline
                </Button>
              </div>
            )}
          </div>
          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">
              <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
                <div>
                  <div className="relative">
                    <Lucide
                      icon="Search"
                      className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
                    />
                    <FormInput
                      type="text"
                      placeholder="Search guideline?..."
                      className="pl-9 sm:w-64 rounded-[0.5rem]"
                      onChange={handleSearch}
                    />
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
                                Category
                              </div>
                              <FormSelect
                                defaultValue={
                                  filters?.year?.length > 0
                                    ? filters?.year
                                    : "Select Year"
                                }
                                className="flex-1 mt-2"
                                onChange={(
                                  e: React.ChangeEvent<HTMLSelectElement>
                                ) => {
                                  dispatch(
                                    setFilter({
                                      key: "year",
                                      value: e.target.value,
                                    })
                                  );
                                }}
                              >
                                <option disabled selected>
                                  Select Category
                                </option>
                                {guidelineFilterOptions?.year?.map(
                                  (category: string, index: number) => (
                                    <option key={index} value={category}>
                                      {category}
                                    </option>
                                  )
                                )}
                              </FormSelect>
                            </div>
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
              <div className="overflow-auto xl:overflow-visible">
                <TableWrapper isLoading={loading}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Institute Name
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Year
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Category
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Sub Category
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Section
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Policy Guidelines
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50   text-nowrap first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Active
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50 text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Download
                        </Table.Td>
                        <Table.Td className="py-2 font-medium bg-slate-50  text-nowrap  first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Actions
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {proxyVotingGuidelines?.length > 0 &&
                        proxyVotingGuidelines?.map(
                          (guideline: ProxyVotingGuideline) => (
                            <Table.Tr
                              key={guideline?.id}
                              className="[&_td]:last:border-b-0"
                            >
                              <Table.Td className="py-2  text-nowrap border-dashed dark:bg-darkmode-600">
                                {guideline?.institution_name}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {guideline?.year}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                <Tippy
                                  content={guideline?.category}
                                  options={{
                                    theme: "light",
                                  }}
                                >
                                  <div className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                    {guideline?.category}
                                  </div>
                                </Tippy>
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {guideline?.sub_category}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {guideline?.section}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {guideline?.policy_guidelines}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                {guideline?.active === true ? (
                                  <div className="flex items-center justify-center text-xs font-medium rounded-md text-success bg-success/10 border  px-1.5 py-1 mr-auto sm:mr-0">
                                    <span className="-mt-px">Active</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center text-xs font-medium rounded-md text-danger bg-danger/10 border  px-1.5 py-1 mr-auto sm:mr-0">
                                    <span className="-mt-px">In Active</span>
                                  </div>
                                )}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                <a
                                  href={
                                    guideline?.voting_guidelines_pdf_url || ""
                                  }
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="primary" elevated>
                                    <Lucide
                                      icon="Download"
                                      className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                                    />
                                    Download
                                  </Button>
                                </a>
                              </Table.Td>
                              <Table.Td className="py-2  flex gap-3 border-dashed dark:bg-darkmode-600">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  elevated
                                  onClick={() => {
                                    gotoDetailPage(
                                      guideline?.voting_guidelines_pdf_url!
                                    );
                                    console.log(
                                      "guideline?.voting_guidelines_pdf_url: ",
                                      guideline?.voting_guidelines_pdf_url
                                    );
                                    setPdfVisible(true);
                                  }}
                                >
                                  <Lucide
                                    icon="Eye"
                                    className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                                  />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  elevated
                                  onClick={() => {
                                    onEditClickHandler(guideline);
                                  }}
                                >
                                  <Lucide
                                    icon="PenLine"
                                    className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                                  />
                                  Edit
                                </Button>
                              </Table.Td>
                            </Table.Tr>
                          )
                        )}
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
            />
          )}
        </div>
      </div>
    </>
  );
}

export default ProxyGuideline;
