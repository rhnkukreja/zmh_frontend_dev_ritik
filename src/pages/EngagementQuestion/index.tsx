import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
// import TomSelect from "@/components/Base/TomSelect";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useMemo } from "react";

import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
  fetchEngagementQuestions,
  resetFilter,
  resetPage,
  setFilter,
  setPage,
} from "@/stores/engagementQuestionSlice";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate } from "react-router-dom";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    questions,
    loading,
    page,
    totalPages,
    engagementQuestionFilterOptions,
    filters,
  } = useAppSelector((state) => state.engagementQuestions);

  useEffect(() => {
    dispatch(
      fetchEngagementQuestions(
        createDynamicURL(`${baseURL}/engagement_questions/`, filters, page)
      )
    );
  }, [page, filters.institution_name]);

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
    debouncedSearch(e.target.value);
  }
  function handleApplyFilter() {
    dispatch(
      fetchEngagementQuestions(
        createDynamicURL(`${baseURL}/engagement_questions/`, filters, page)
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
      fetchEngagementQuestions(
        createDynamicURL(`${baseURL}/engagement_questions/`, undefined, page)
      )
    );
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            Engagement Questions
          </div>
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
                    placeholder="Search invester..."
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
                          {/* <div>
                            <div className="text-left text-slate-500">
                              Type of Engagement
                            </div>
                            <FormSelect className="flex-1 mt-2">
                              {engagementQuestionFilterOptions.typeOfEngagement.map(
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
                          {/* <div className="mt-3">
                            <div className="text-left text-slate-500">
                              Source
                            </div>
                            <FormSelect className="flex-1 mt-2">
                              {engagementQuestionFilterOptions.source.map(
                                (source: string, index: number) => {
                                  return (
                                    <option key={index} value={source}>
                                      {source}
                                    </option>
                                  );
                                }
                              )}
                            </FormSelect>
                          </div> */}
                          <div className="mt-3">
                            <div className="text-left text-slate-500">
                              Category
                            </div>
                            <FormSelect
                              defaultValue={
                                filters.category.length > 0
                                  ? filters.category
                                  : "Select Category"
                              }
                              className="flex-1 mt-2"
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) => {
                                dispatch(
                                  setFilter({
                                    key: "category",
                                    value: e.target.value,
                                  })
                                );
                              }}
                            >
                              <option disabled selected>
                                Select Category
                              </option>
                              {engagementQuestionFilterOptions.category.map(
                                (category: string, index: number) => {
                                  return (
                                    <option key={index} value={category}>
                                      {category}
                                    </option>
                                  );
                                }
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
            <div className="overflow-auto xl:overflow-scroll">
              <TableWrapper isLoading={loading}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Td className="py-4 font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Institute Name
                      </Table.Td>

                      <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Category
                      </Table.Td>
                      <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Engagement Questions
                      </Table.Td>
                      <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Company
                      </Table.Td>

                      <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Type of Engagement
                      </Table.Td>
                      <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                        Action
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {questions?.length > 0 &&
                      questions?.map((question) => (
                        <Table.Tr
                          key={question?.id}
                          className="[&_td]:last:border-b-0"
                        >
                          <Table.Td className=" py-4 border-dashed dark:bg-darkmode-600">
                            <div className="ml-3.5 ">
                              <a
                                href=""
                                className="font-medium   whitespace-nowrap capitalize"
                              >
                                {question?.institution_name}
                              </a>
                            </div>
                          </Table.Td>

                          <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                            <div className="whitespace-nowrap capitalize">
                              {question?.category}
                            </div>
                          </Table.Td>
                          <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                            <Tippy
                              content={question?.engagement_question}
                              options={{
                                theme: "light",
                              }}
                            >
                              <div className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                {question?.engagement_question}
                              </div>
                            </Tippy>
                          </Table.Td>

                          <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                            <div className="whitespace-nowrap capitalize">
                              {question?.company_name}
                            </div>
                          </Table.Td>

                          <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                            <div className="whitespace-nowrap">
                              {question?.type_of_engagement}
                            </div>
                          </Table.Td>
                          <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                            <Button
                              onClick={() => {
                                navigate(
                                  `/engagement-question/${question?.id}`
                                );
                              }}
                              variant="outline-secondary"
                              className="pl-3.5 pr-4 whitespace-nowrap"
                            >
                              <Lucide
                                icon="Eye"
                                className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                              />{" "}
                              View
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </TableWrapper>
            </div>
            <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
              {questions?.length > 0 && (
                <CPagination
                  page={page}
                  totalPages={totalPages}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />
              )}
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
  );
}

export default Main;
