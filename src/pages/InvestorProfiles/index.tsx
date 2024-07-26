import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
import Pagination from "@/components/Base/Pagination";
import TomSelect from "@/components/Base/TomSelect";
import { FormCheck, FormInput, FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import transactions from "@/fakers/transactions";
import users from "@/fakers/users";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useState } from "react";

import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchInvestersProfiles,
  setPage,
} from "@/stores/investersProfileSlice";
import dayjs from "dayjs";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { InvestersProfile } from "@/types/investerProfiles";
import {  useNavigate } from "react-router-dom";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const { loading, investersProfile, page, totalPages } = useAppSelector(
    (state) => state.investersProfile
  );

  useEffect(() => {
    dispatch(fetchInvestersProfiles(page));
  }, [page]);
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

  const gotoDetailPage = (id: number) => {
    navigate(`/investor-profile/${id}`);
  };
  const [selectedUser, setSelectedUser] = useState("1");

  return (
    <>
      
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              Invseter Profile
            </div>
            <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
              <Button
                variant="primary"
                className="group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
              >
                <Lucide icon="PenLine" className="stroke-[1.3] w-4 h-4 mr-2" />{" "}
                Add New Invester
              </Button>
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
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                  <Menu>
                    <Menu.Button
                      as={Button}
                      variant="outline-secondary"
                      className="w-full sm:w-auto"
                    >
                      <Lucide
                        icon="Download"
                        className="stroke-[1.3] w-4 h-4 mr-2"
                      />
                      Export
                      <Lucide
                        icon="ChevronDown"
                        className="stroke-[1.3] w-4 h-4 ml-2"
                      />
                    </Menu.Button>
                    <Menu.Items className="w-40">
                      <Menu.Item>
                        <Lucide icon="FileBarChart" className="w-4 h-4 mr-2" />{" "}
                        PDF
                      </Menu.Item>
                      <Menu.Item>
                        <Lucide icon="FileBarChart" className="w-4 h-4 mr-2" />
                        CSV
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
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
                            3
                          </div>
                        </Popover.Button>
                        <Popover.Panel placement="bottom-end">
                          <div className="p-2">
                            <div>
                              <div className="text-left text-slate-500">
                                User
                              </div>
                              <TomSelect
                                className="flex-1 mt-2"
                                value={selectedUser}
                                onChange={(e) => {
                                  setSelectedUser(e.target.value);
                                }}
                                options={{
                                  placeholder: "Search user",
                                }}
                              >
                                {users.fakeUsers().map((faker, fakerKey) => (
                                  <option key={fakerKey} value={fakerKey}>
                                    {faker.name}
                                  </option>
                                ))}
                              </TomSelect>
                            </div>
                            <div className="mt-3">
                              <div className="text-left text-slate-500">
                                Review Rate
                              </div>
                              <FormSelect className="flex-1 mt-2">
                                <option value="3+">3+</option>
                                <option value="4+">4+</option>
                                <option value="5">5</option>
                              </FormSelect>
                            </div>
                            <div className="flex items-center mt-4">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  close();
                                }}
                                className="w-32 ml-auto"
                              >
                                Close
                              </Button>
                              <Button variant="primary" className="w-32 ml-2">
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
                        <Table.Td className="py-4 font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Institution Name
                        </Table.Td>

                        <Table.Td className="py-4 font-medium flex justify-center bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Date
                        </Table.Td>
                        <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Active
                        </Table.Td>
                        <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          Download
                        </Table.Td>
                        <Table.Td className="py-4 text-center font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                          View
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {investersProfile?.length > 0 &&
                        investersProfile.map((profile: InvestersProfile) => (
                          <Table.Tr
                            key={profile.id}
                            className="[&_td]:last:border-b-0"
                          >
                            <Table.Td className=" py-4 border-dashed dark:bg-darkmode-600">
                              <div className="whitespace-nowrap capitalize">
                                {profile?.institution_name}
                              </div>
                            </Table.Td>

                            <Table.Td className="py-4 text-center  border-dashed dark:bg-darkmode-600">
                              <div className="whitespace-nowrap ">
                                {dayjs(profile?.date_created).format(
                                  "MMMM D, YYYY"
                                )}
                              </div>
                            </Table.Td>
                            <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                              {profile?.active === true ? (
                                <div className="flex items-center justify-center text-xs font-medium rounded-md text-success bg-success/10 border border-success/10 px-1.5 py-px mr-auto sm:mr-0">
                                  <span className="-mt-px">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-xs font-medium rounded-md text-danger bg-danger/10 border border-danger/10 px-1.5 py-px mr-auto sm:mr-0">
                                  <span className="-mt-px">In Active</span>
                                </div>
                              )}
                            </Table.Td>
                            <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                              <Button
                                variant="outline-secondary"
                                className="pl-3.5 pr-4 whitespace-nowrap"
                              >
                                <Lucide
                                  icon="File"
                                  className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                                />{" "}
                                Download PDF
                              </Button>
                            </Table.Td>
                            <Table.Td className="py-4 text-center border-dashed dark:bg-darkmode-600">
                              <Button
                                onClick={() => {
                                  gotoDetailPage(profile.id);
                                }}
                                variant="outline-secondary"
                                className="pl-3.5 pr-4 whitespace-nowrap"
                              >
                                <Lucide
                                  icon="Eye"
                                  className="w-3.5 h-3.5 mr-1.5 stroke-[1.3]"
                                />{" "}
                                Quick View
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                </TableWrapper>
              </div>
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                {investersProfile?.length > 0 && (
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
    </>
  );
}

export default Main;
