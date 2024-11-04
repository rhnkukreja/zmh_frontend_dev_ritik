import Lucide from "@/components/Base/Lucide";
import { useEffect, useState } from "react";
import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate, useParams } from "react-router-dom";
import { EngagementQuestions } from "@/types/engagementQuestions";
import { fetchUserLoginHistory, setPage } from "@/stores/userDetailSlice";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";

interface EngagementQuestionFilter {
    category: string[];
    year: string[];
}
const loginHistoryLoginHistory = () => {
    const dispatch: AppDispatch = useAppDispatch();
    const navigate = useNavigate();

    const { loading, totalLoginHistoryPages, loginHistoryDetails, totalPages, page, filters } = useAppSelector((state) => state.userDetail);
    const { loginHistory } = useAppSelector((state) => state.authentiction);
    const [groupedUserLogin, setGroupUserLogin] = useState<any>([]);
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
    const [transformedData, setTransformedData] = useState<any>([]);


    const params = useParams();

    useEffect(() => {
        const dynamicURL = createDynamicURL(
            `${baseURL}/user/login_history/?user=${params?.id!}&`,
            filters,
            undefined,
            page
        );
        dispatch(fetchUserLoginHistory(dynamicURL));



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


    useEffect(() => {
        const loginHistoryData = loginHistoryDetails?.flatMap((item: any) =>
            item.times.map((time: any) => ({
                date: item.date,
                count: item.count,
                time: time,
                name: item.name,
                email: item.email
            }))
        );

        setTransformedData(loginHistoryData);
    }, [loginHistoryDetails])


    useEffect(() => {
        const groupUserLoginHistory = transformedData?.reduce((acc: any, login: any) => {
            const userName = login?.name;
            if (!acc[userName]) {
                acc[userName] = [];
            }
            acc[userName].push(login);
            return acc;
        }, {});

        setGroupUserLogin(groupUserLoginHistory);
    }, [transformedData]);

    useEffect(() => {
        if (groupedUserLogin) {
            const initialOpenGroups = Object.keys(groupedUserLogin).reduce(
                (acc, userName) => {
                    acc[userName] = openGroups[userName] ?? true;
                    return acc;
                },
                {} as { [key: string]: boolean }
            );
            setOpenGroups(initialOpenGroups);

            //   validateImages();
        }
    }, [groupedUserLogin]);

    const toggleGroup = (userName: string) => {
        setOpenGroups((prevState) => ({
            ...prevState,
            [userName]: !prevState[userName],
        }));
    };

    const backToPreviousPage = () => {
        navigate(`/user-details`);
      }
    

    return (
        <div className="grid grid-cols-12 gap-y-10 gap-x-6 ">
            <div className="col-span-12">
                <Button
                    onClick={backToPreviousPage}
                    variant="primary"
                    className="bg-theme-2 border-bg-theme-2 mb-4"
                >
                    <ChevronLeft
                        className="roup-[.mode--light]:text-white text-white"
                        size={18}
                        strokeWidth={1.5}
                    />
                    Back
                </Button>
                <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
                    <div className="font-semibold text-xl ">User Login History</div>

                </div>
                <div className="mt-3.5">
                    <div className="flex flex-col box box--stacked">
                        {/* <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
              <div className="flex items-center ">
                <MultiSearchBar
                  onSearch={handleSearch}
                  searchTerms={searchTerms}
                  setSearchTerms={setSearchTerms}
                  url="/engagement_questions/"
                  getOptionKey="institution_name"
                  placeHolder="Search Institution"
                  onSearchChange={resetPage}
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
                {loginHistory?.saved_search?.["Engagement Questions"] !== undefined && (
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
                                  dispatch(resetFilter());
                                  dispatch(resetPage());
                                  resetForm();
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
            </div> */}
                        <div className="overflow-auto px-5 mt-5 ">
                            <TableWrapper isLoading={loading}>
                                <div className="overflow-auto max-h-[400px]">
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Name
                                                </Table.Td>

                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Email
                                                </Table.Td>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Count
                                                </Table.Td>
                                                <Table.Td className="text-wrap py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Date
                                                </Table.Td>

                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Time
                                                </Table.Td>
                                            </Table.Tr>
                                        </Table.Thead>

                                        <Table.Tbody className="!max-h-400px overflow-auto">
                                            <>
                                                {groupedUserLogin ? (
                                                    Object.entries(groupedUserLogin).map(
                                                        ([userName, loginHistory]: [
                                                            string,
                                                            any
                                                        ]) => (
                                                            <>
                                                                <Table.Tr
                                                                    className="bg-gray-100 dark:bg-darkmode-700 cursor-pointer"
                                                                    onClick={() => toggleGroup(userName)}
                                                                >
                                                                    <Table.Td
                                                                        colSpan={5}
                                                                        className="font-semibold py-2"
                                                                    >
                                                                        <div className="flex flex-row justify-start items-center">
                                                                            {userName}
                                                                            <button className="ml-2 text-blue-500">
                                                                                {openGroups[userName] ? (
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

                                                                {openGroups[userName] &&
                                                                    Array.isArray(loginHistory) &&
                                                                    loginHistory.map((login: any) => (
                                                                        <Table.Tr
                                                                            key={login?.id}
                                                                            className="[&_td]:last:border-b-0"
                                                                        >
                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600"></Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-nowrap ">
                                                                                    {login?.email}
                                                                                </div>
                                                                            </Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">

                                                                                <div className="whitespace-normal  max-w-[300px] overflow-hidden text-ellipsis line-clamp-2">
                                                                                    {login?.count}
                                                                                </div>

                                                                            </Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-nowrap ">
                                                                                    {login?.date}
                                                                                </div>
                                                                            </Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-nowrap ">
                                                                                    {login?.time}
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
                                        {loginHistoryDetails?.length === 0 && (
                                            <div className="w-full">
                                                <h1 className="mt-3">No Records Found..</h1>
                                            </div>
                                        )}
                                    </Table>
                                </div>
                            </TableWrapper>
                        </div>
                        <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                            {loginHistoryDetails?.length > 0 && (
                                <CPagination
                                    page={page}
                                    totalPages={totalLoginHistoryPages}
                                    handleNextPage={handleNextPage}
                                    handlePageChange={handlePageChange}
                                    handlePreviousPage={handlePreviousPage}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default loginHistoryLoginHistory;
