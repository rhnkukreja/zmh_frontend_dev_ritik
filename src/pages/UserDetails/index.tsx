import Lucide from "@/components/Base/Lucide";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { useNavigate } from "react-router-dom";
import Tippy from "@/components/Base/Tippy";
import Table from "@/components/Base/Table";
import { useEffect } from "react";
import { fetchEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { fetchUserDetail, setPage } from "@/stores/userDetailSlice";

function UserDetail() {

    const dispatch: AppDispatch = useAppDispatch();
    const navigate = useNavigate();

    const { loading, userDetailList, page, totalPages } = useAppSelector((state) => state.userDetail);


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
        dispatch(
            fetchUserDetail(
                createDynamicURL(
                    `${baseURL}/user/user_info`,
                    {},
                    undefined,
                    page
                )
            )
        );
    }, [page]);


    return (
        <>
            <div className="grid grid-cols-12 gap-y-10 gap-x-6">
                <div className="col-span-12">
                    <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
                        <div className="font-semibold text-xl ">User Details</div>
                    </div>

                    <div className="mt-3.5">
                        <div className="flex flex-col box box--stacked">
                            <div className="flex flex-col p-5 sm:items-center sm:flex-row gap-y-2">
                                {/* <div className="flex items-center ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url={[
                      "/shareholder_proposal/withdrawn/",
                      "/shareholder_proposal/no_action/",
                      "/shareholder_proposal/def14a/",
                    ]}
                    getOptionKey="proponent_name"
                    placeHolder="Search Proponent"
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
                    </Button>
                  </div>

                  <div className="hover:bg-slate-50 ml-2">
                    <Button onClick={saveSearch}>
                      <Tippy
                        content="Save Searches"
                        options={{ theme: "light" }}
                      >
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
                  {user?.saved_search?.["Shareholder Proposal"] !==
                    undefined && (
                      <div className="hover:bg-slate-50 ml-2">
                        <Button onClick={getSavedSearches}>
                          Previous Search
                        </Button>
                      </div>
                    )}
                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                          onClick={handleCollapseFilter}
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
                      </>
                    )}
                  </Popover>
                </div> */}
                            </div>

                            {/* {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="filter-section mb-5">
                    <div className="flex items-center justify-between xs:flex-col md:flex-row">
                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 ">
                          Keyword{" "}
                        </div>
                        <Controller
                          name="keyword"
                          control={control}
                          defaultValue=""
                          render={({ field }) => (
                            <FormInput
                              value={field.value?.toString() || ""}
                              onChange={(value) => field.onChange(value)}
                              type="text"
                              className="col-span-4 flex-1 mt-2"
                              placeholder="Search Keyword"
                              aria-label="default input inline 1"
                            />
                          )}
                        />
                      </div>

                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Year
                          {apiDropdownOptions?.year?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`year`}
                                  checked={
                                    apiDropdownOptions?.year?.length ===
                                    watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "year",
                                        apiDropdownOptions?.year
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
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.year?.map(
                                    (year: string) => {
                                      return (
                                        <option value={year}>{year}</option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className=" w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Status
                          {apiDropdownOptions?.status?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`status`}
                                  checked={
                                    apiDropdownOptions.status.length ===
                                    watch("status")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "status",
                                        apiDropdownOptions.status
                                      );
                                    } else {
                                      setValue("status", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="status"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Status",
                              }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.status?.map(
                                    (status: string) => {
                                      return (
                                        <option value={status} key={status}>
                                          {status}
                                        </option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 xs:flex-col md:flex-row">
                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Category
                          {apiDropdownOptions?.category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`category`}
                                  checked={
                                    apiDropdownOptions.category.length ===
                                    watch("category")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "category",
                                        apiDropdownOptions.category
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
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.category.length > 0 &&
                                    apiDropdownOptions?.category?.map(
                                      (category: string) => {
                                        return (
                                          <option value={category}>
                                            {category}
                                          </option>
                                        );
                                      }
                                    )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Sub Category
                          {apiDropdownOptions?.sub_category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`sub_category`}
                                  checked={
                                    apiDropdownOptions?.sub_category?.length ===
                                    watch("sub_category")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "sub_category",
                                        apiDropdownOptions.sub_category
                                      );
                                    } else {
                                      setValue("sub_category", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="sub_category"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Sub Category",
                              }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader === true ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.sub_category?.map(
                                    (sub_category: string) => {
                                      return (
                                        <option value={sub_category}>
                                          {sub_category}
                                        </option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-4">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleClearAllFilter();
                        }}
                        className="w-32 mx-2"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        className="w-32 mx-2"
                        type="submit"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </form>
              )} */}

                            <div className="overflow-auto xl:overflow-visible px-5">
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
                                                        Sign Up Date
                                                    </Table.Td>
                                                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Sign Up Time
                                                    </Table.Td>
                                                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Login Count
                                                    </Table.Td>
                                                    <Table.Td className="py-2 font-semibold h-[50px] w-[150px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        User Type
                                                    </Table.Td>
                                                    <Table.Td className="py-2 pl-[40px] font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Details
                                                    </Table.Td>
                                                </Table.Tr>
                                            </Table.Thead>

                                            <Table.Tbody>
                                                {userDetailList?.length > 0 &&
                                                    userDetailList?.map((user: any) => (
                                                        <Table.Tr
                                                            key={user?.id}
                                                            className="[&_td]:last:border-b-0"
                                                        >
                                                            <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                                                {user?.first_name} {user?.last_name}
                                                            </Table.Td>
                                                            <Table.Td className="whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis text-wrap">
                                                                {user?.email}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                {user?.signup_date}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                {user?.signup_time}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                {user?.login_count}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                {user?.user_type}
                                                            </Table.Td>
                                                        <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                                          <div className="flex gap-3 justify-center">
                                                            <Tippy
                                                              content=" See Details"
                                                              options={{
                                                                theme: "light",
                                                              }}
                                                            >
                                                              <Lucide
                                                                onClick={() =>
                                                                  navigate(
                                                                    `/user-details/login-history/${user?.id}`
                                                                  )
                                                                }
                                                                icon="Eye"
                                                                className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                              />
                                                            </Tippy>
                                                           
                                                          </div>
                                                        </Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                            </Table.Tbody>
                                            {userDetailList?.length === 0 &&
                                                <div className="w-full">
                                                    <h1 className="mt-3">No Records Found..</h1></div>}
                                        </Table>
                                    </div>
                                </TableWrapper>
                            </div>
                            <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
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

                </div>
            </div>
        </>
    );
}

export default UserDetail;
