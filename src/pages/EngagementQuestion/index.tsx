import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
// import TomSelect from "@/components/Base/TomSelect";
import { FormCheck, FormInput, FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useState } from "react";

import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
  fetchEngagementQuestions,
  resetFilter,
  resetPage,
  setAllFilters,
  setFilter,
  setPage,
} from "@/stores/engagementQuestionSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate } from "react-router-dom";
import { AddEditEngagementQuestion } from "./components/AddEditEngagementQuestion";
import { EngagementQuestions } from "@/types/engagementQuestions";

import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import { FilterObject } from "@/types/common";

interface EngagementQuestionFilter {
  category: string[];
  year: string[];
}
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

  const { handleSubmit, control, reset, setValue, watch } =
    useForm<EngagementQuestionFilter>({
      defaultValues: {
        category: [...filters.category],
        year: [...filters.year],
      },
    });

  const { user } = useAppSelector((state) => state.authentiction);

  const [selectedEngagementQuestion, setSelectedEngagementQuestion] =
    useState<EngagementQuestions | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<any>([]);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const validateImages = async () => {
    if (!questions) return;
    const tempValidImages: { [key: string]: string } = {};
    for (const question of questions) {
      const isValid = await checkImageUrl(question?.institution_logo_url);
      tempValidImages[question?.institution_name] = isValid
        ? question?.institution_logo_url
        : userLinkedinImage;
    }

    setValidImages(tempValidImages);
  };

  const [
    addNewEngagementQuestionModalVisible,
    setAddNewEngagementQuestionModalVisible,
  ] = useState<boolean>(false);

  useEffect(() => {
    dispatch(
      fetchEngagementQuestions(
        createDynamicURL(
          `${baseURL}/engagement_questions/`,
          filters,
          undefined,
          page
        )
      )
    );
    setFiltersLength(countValidFilters(filters));
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

  function handleSearch(searchTerms: string[]) {
    dispatch(
      setFilter({
        key: "institution_name",
        value: searchTerms,
      })
    );

    dispatch(resetPage());
  }

  const handleClearAllFilter = () => {
    dispatch(resetFilter());
    setSearchTerms([]);
    dispatch(resetPage());
    reset();
  };

  const onSubmit = async (engagementQuesFilter: EngagementQuestionFilter) => {
    dispatch(
      setAllFilters({ ...engagementQuesFilter, institution_name: searchTerms })
    );

    setFiltersLength(countValidFilters(filters));
  };

  const onEditClickHandler = (question: EngagementQuestions) => {
    setSelectedEngagementQuestion(question);
    setAddNewEngagementQuestionModalVisible(true);
  };

  useEffect(() => {
    if (addNewEngagementQuestionModalVisible === false) {
      setSelectedEngagementQuestion(null);
    }
  }, [addNewEngagementQuestionModalVisible]);

  useEffect(() => {
    const groupedQuestions = questions?.reduce((acc: any, question: any) => {
      const institutionName = question?.institution_name;
      if (!acc[institutionName]) {
        acc[institutionName] = [];
      }
      acc[institutionName].push(question);
      return acc;
    }, {});

    setGroupedQuestions(groupedQuestions);
  }, [questions]);

  useEffect(() => {
    if (groupedQuestions) {
      const initialOpenGroups = Object.keys(groupedQuestions).reduce(
        (acc, institutionName) => {
          acc[institutionName] = openGroups[institutionName] ?? true;
          return acc;
        },
        {} as { [key: string]: boolean }
      );
      setOpenGroups(initialOpenGroups);

      validateImages();
    }
  }, [groupedQuestions]);

  const toggleGroup = (institutionName: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [institutionName]: !prevState[institutionName],
    }));
  };

  const getSavedSearches = () => {
    setSearchTerms([
      ...user?.saved_search["Engagement Questions"]?.institution,
    ]);
    setValue("year", user?.saved_search?.year || []);
    setValue("category", user?.saved_search?.category || []);
    dispatch(
      setAllFilters({
        year: user?.saved_search?.year || [],
        category: user?.saved_search?.category || [],
      })
    );
  };

  const saveSearch = async () => {
    const filtersToSave = Object.entries(filters).reduce(
      (acc, [key, value]) => {
        if (key !== "institution_name") {
          acc[key] = value;
        }
        return acc;
      },
      {} as Partial<typeof filters>
    );

    const res = await commonService.saveSearches({
      module: "Engagement Questions",
      institution: searchTerms,
      ...(filtersToSave as any),
    });

    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Engagement Questions",
          value: {
            institution: searchTerms,
            ...filtersToSave,
          },
        })
      );
      toast.success(res?.user_id || "Search saved successfully");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="font-semibold text-xl ">Engagement Questions</div>
          {user?.user_type === "Admin" && (
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                onClick={() => {
                  setAddNewEngagementQuestionModalVisible(true);
                }}
                variant="primary"
                className="bg-theme-2 border-bg-theme-2"
              >
                <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />{" "}
                Add New Engagement Question
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
                  url="/engagement_questions/"
                  getOptionKey="institution_name"
                  placeHolder="Search Institution"
                />

                <div className="hover:bg-slate-50">
                  <Button
                    onClick={() => {
                      handleClearAllFilter();
                    }}
                  >
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
                {user?.saved_search?.["Engagement Questions"] !== undefined && (
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
                            <div className="mt-3">
                              <div className="w-full  my-2">
                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                  Year
                                  {engagementQuestionFilterOptions?.year
                                    ?.length > 0 && (
                                    <div>
                                      <FormCheck className="mr-2">
                                        <FormCheck.Label>
                                          Select All
                                        </FormCheck.Label>
                                        <FormCheck.Input
                                          className="ml-1"
                                          id={`year`}
                                          checked={
                                            engagementQuestionFilterOptions
                                              ?.year?.length ===
                                            watch("year")?.length
                                          }
                                          type="checkbox"
                                          onChange={(e) => {
                                            if (e.target.checked === true) {
                                              setValue(
                                                "year",
                                                engagementQuestionFilterOptions?.year
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
                                      <>
                                        {engagementQuestionFilterOptions?.year?.map(
                                          (year: string) => {
                                            return (
                                              <option value={year}>
                                                {year}
                                              </option>
                                            );
                                          }
                                        )}
                                      </>
                                    </TomSelect>
                                  )}
                                />
                              </div>

                              <div className="w-full  my-2">
                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                  Category
                                  {engagementQuestionFilterOptions?.category
                                    ?.length > 0 && (
                                    <div>
                                      <FormCheck className="mr-2">
                                        <FormCheck.Label>
                                          Select All
                                        </FormCheck.Label>
                                        <FormCheck.Input
                                          className="ml-1"
                                          id={`category`}
                                          checked={
                                            engagementQuestionFilterOptions
                                              .category.length ===
                                            watch("category")?.length
                                          }
                                          type="checkbox"
                                          onChange={(e) => {
                                            if (e.target.checked === true) {
                                              setValue(
                                                "category",
                                                engagementQuestionFilterOptions.category
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
                                      <>
                                        {engagementQuestionFilterOptions
                                          ?.category.length > 0 &&
                                          engagementQuestionFilterOptions?.category?.map(
                                            (category: string) => {
                                              return (
                                                <option value={category}>
                                                  {category}
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
                                  reset();
                                }}
                                className="w-32 ml-auto"
                              >
                                Clear
                              </Button>
                              <Button
                                type="submit"
                                variant="primary"
                                className="w-32 ml-2"
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
            <div className="overflow-auto xl:overflow-scroll px-5">
              <TableWrapper isLoading={loading}>
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Institution Name
                        </Table.Td>

                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Category
                        </Table.Td>
                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Engagement Questions
                        </Table.Td>
                        <Table.Td className="text-wrap py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Engagement Date
                        </Table.Td>

                        <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                          Actions
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody className="!max-h-400px overflow-auto">
                      <>
                        {groupedQuestions ? (
                          Object.entries(groupedQuestions).map(
                            ([institutionName, institutionQuestions]: [
                              string,
                              any
                            ]) => (
                              <>
                                <Table.Tr
                                  className="bg-gray-100 dark:bg-darkmode-700 cursor-pointer"
                                  onClick={() => toggleGroup(institutionName)}
                                >
                                  <Table.Td
                                    colSpan={5}
                                    className="font-semibold py-2"
                                  >
                                    <div className="flex flex-row justify-start items-center">
                                      <div className="w-10 h-10 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                        {
                                          <img
                                            alt="ZMH Analytics"
                                            src={
                                              validImages[institutionName] ||
                                              userLinkedinImage
                                            }
                                          />
                                        }
                                      </div>
                                      {institutionName}

                                      <button className="ml-2 text-blue-500">
                                        {openGroups[institutionName] ? (
                                          <Lucide
                                            icon="ChevronUp"
                                            className=" w-6 h-6 mr-2 "
                                          />
                                        ) : (
                                          <Lucide
                                            icon="ChevronDown"
                                            className=" w-6 h-6 mr-2 "
                                          />
                                        )}
                                      </button>
                                    </div>
                                  </Table.Td>
                                </Table.Tr>

                                {openGroups[institutionName] &&
                                  Array.isArray(institutionQuestions) &&
                                  institutionQuestions.map((question: any) => (
                                    <Table.Tr
                                      key={question?.id}
                                      className="[&_td]:last:border-b-0"
                                    >
                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600"></Table.Td>

                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap capitalize">
                                          {question?.engagement_with_category}
                                        </div>
                                      </Table.Td>

                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        {/* <Tippy
                                          content={
                                            question?.engagement_question
                                          }
                                          options={{ theme: "light" }}
                                        > */}
                                        <div className="whitespace-normal capitalize max-w-[300px] overflow-hidden text-ellipsis line-clamp-2">
                                          {question?.engagement_question}
                                        </div>
                                        {/* </Tippy> */}
                                      </Table.Td>

                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap capitalize">
                                          {question?.formatted_engagement_date}
                                        </div>
                                      </Table.Td>

                                      <Table.Td className="py-2 w-20 relative box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] border-x-0 dark:bg-darkmode-600">
                                        <div className="flex gap-3 justify-center">
                                          <Tippy
                                            content="View"
                                            options={{ theme: "light" }}
                                          >
                                            <Lucide
                                              onClick={() =>
                                                navigate(
                                                  `/engagement-question/${question?.id}`
                                                )
                                              }
                                              icon="Eye"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </Tippy>

                                          {user?.user_type === "Admin" && (
                                            <Tippy
                                              content="Edit"
                                              options={{ theme: "light" }}
                                            >
                                              <Lucide
                                                onClick={() =>
                                                  onEditClickHandler(question)
                                                }
                                                icon="PenLine"
                                                className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                              />
                                            </Tippy>
                                          )}
                                        </div>
                                      </Table.Td>
                                    </Table.Tr>
                                  ))}
                              </>
                            )
                          )
                        ) : (
                          <Table.Tr>
                            <Table.Td
                              colSpan={5}
                              className="py-10 text-center text-slate-500"
                            >
                              No engagement questions.
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </>
                    </Table.Tbody>
                  </Table>
                </div>
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

        {addNewEngagementQuestionModalVisible && (
          <AddEditEngagementQuestion
            addNewEngagementQuestionModalVisible={
              addNewEngagementQuestionModalVisible
            }
            setAddNewEngagementQuestionModalVisible={
              setAddNewEngagementQuestionModalVisible
            }
            selectedEngagementQuestion={selectedEngagementQuestion}
          />
        )}
      </div>
    </div>
  );
}

export default Main;
