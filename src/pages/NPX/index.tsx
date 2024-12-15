import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { convertToTitleCase, createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchAGMSummaryDashboard,
  fetchNpxProxyDashboard,
  fetchVdsProxyDashboard,
  resetPage,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import LoadingIcon from "../../components/Base/LoadingIcon";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft, FilterX } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import MultiSearchBar from "@/components/MultiSearch";
import { Menu, Popover, Tab } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import {
  FormCheck,
  FormInput,
  FormSelect,
  FormSwitch,
} from "@/components/Base/Form";
import { dashboardService } from "@/services/dashboard";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import { setIsCompanySelected } from "@/stores/authenticationSlice";

const index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationPathName = location?.pathname;
  const dispatch: AppDispatch = useAppDispatch();
  const { npxProxyDetails, npxProxyLoading, tempSearch, page, totalNPXCount } = useAppSelector(
    (state) => state.dashboard
  );
  const totalPages = Math.ceil(totalNPXCount / 10);
  const [searchParams] = useSearchParams();

  const { companyGlobalSearchName, companyGlobalSearchTicker, isCompanySelected } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");

  const [filter, setFilter] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [allApplyFilter, setallApplyFilter] = useState<any>();
  const [dropdownValues, setDropdownValues] = useState<any>({ institution_name: [], fund_name: [] });

  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] = useState<boolean>(false);
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] = useState<boolean>(false);


  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<any>({
      institution: [],
    });

  const [apiFundNameDropdown, setApiFundNameDropdown] =
    useState<any>({
      fund_name: [],
    });

  const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
    useState<any>({
      proposal: [],
      vote: [],
      vote_category: []
    });

  const getAllInstitutionDropdown = async () => {
    try {
      setGetDropdownLoader(true);
      const res =
        await dashboardService.getNPXDropdownValues();
      if (res.result) {
        setApiDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDropdownLoader(false);
    }
  };




  const getFundNameDependentDropdown = async (value: any) => {

    if (value !== '') {
      const paramFilter = {
        global_search: companyGlobalSearchName,
        institution_name: [value],
      }
      try {
        setGetFundNameDropdownLoader(true);
        const res =
          await dashboardService.getDynamicNPXDropdownValues(paramFilter);
        if (res.result) {
          setApiFundNameDropdown({ ...res.result });
        }
      } catch (error) {
        return error;
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    }

  }

  const getDependentDropdown = async () => {
    const paramFilter = {
      global_search: companyGlobalSearchName,
      institution_name: dropdownValues?.institution_name !== '' ? [dropdownValues?.institution_name] : [],
      fund_name: dropdownValues?.fund_name
    }

    try {
      setGetDynamicDropdownLoader(true);
      const res =
        await dashboardService.getDynamicNPXDropdownValues(paramFilter);
      if (res.result) {
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  }

  const handleDropdownChange = (key: string, value: any) => {
    // if(value?.length > 0){
    setDropdownValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
    // }

  };

  useEffect(() => {
    // if(!isCompanySelected){
    getDependentDropdown();
    // dispatch(setIsCompanySelected(false));
    // }

  }, [dropdownValues]);


  useEffect(() => {
    getAllInstitutionDropdown();
    // dispatch(setIsCompanySelected(false));
  }, []);

  let updatedFilter: any = [];






  useEffect(() => {


    if (allApplyFilter) {
      if (isCompanySelected) {

        updatedFilter = { ...allApplyFilter, global_search: companyGlobalSearchName };
        updatedFilter.proposal = [];
        // getAllInstitutionDropdown();
        if (updatedFilter?.institution_name[0] !== '') {
          getFundNameDependentDropdown(updatedFilter?.institution_name[0]);
        }
        getDependentDropdown();

        setTimeout(() => {
          if (updatedFilter?.institution_name[0] !== '') {
            setValue("institution_name", updatedFilter?.institution_name[0]);
          }
          setValue("fund_name", updatedFilter?.fund_name);
          setValue("vote", updatedFilter?.vote);
          // setValue("proposal", updatedFilter?.proposal);
          setValue("vote_category", updatedFilter?.vote_category);
          setValue("keyword", updatedFilter?.keyword);

          dispatch(
            fetchNpxProxyDashboard(
              createDynamicURL(
                `${baseURL}/npx/detail/`, updatedFilter, undefined, page)
            )
          );

        }, 1000);

        // dispatch(
        //   fetchNpxProxyDashboard(
        //     createDynamicURL(
        //       `${baseURL}/npx/detail/`, updatedFilter, undefined, 1
        //     )
        //   )
        // );
        dispatch(setIsCompanySelected(false));

      }
      else {

        dispatch(
          fetchNpxProxyDashboard(
            createDynamicURL(
              `${baseURL}/npx/detail/`, allApplyFilter, undefined, page)
          )
        );
      }
      dispatch(setTempSearch(companyGlobalSearchName));
    }
    // else {
    //   dispatch(
    //     fetchNpxProxyDashboard(
    //       createDynamicURL(
    //         `${baseURL}/npx/detail/`,{}, undefined, page)
    //     )
    //   );
    // }

    //  else if (allApplyFilter) {
    //   dispatch(
    //     fetchNpxProxyDashboard(
    //       createDynamicURL(
    //         `${baseURL}/npx/detail/`, allApplyFilter, undefined, page)
    //     )
    //   );
    //   dispatch(setTempSearch(companyGlobalSearchName));
    // }

    return () => {
      dispatch(
        fetchNpxProxyDashboard(
          createDynamicURL(
            `${baseURL}/npx/detail/`, {}, undefined, 1
          )
        )
      );
    }

  }, [companyGlobalSearchTicker, searchTicker, filter, allApplyFilter, page]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const convertDivTableToCSV = () => {
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    const tableProposal = document.querySelector(".table_3");
    const rowsProposal = tableProposal?.querySelectorAll(".row_3");
    let csvContent = "\uFEFF";
    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_2");
      let rowData: any = [];
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }
        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    rowsProposal?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_3");
      let rowData: any = [];
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `NPX-${companyGlobalSearchName}`);
  };


  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(true);
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    defaultValues: {
      institution_name: 'Select',
      fund_name: [],
      proposal: [],
      vote: [],
      vote_category: []
    },
  });


  const onSubmit = async (npxFilter: any) => {

    if (npxFilter?.institution_name === "Select") {
      toast.warning("Please select Institution");
      return;
    }
    setallApplyFilter({
      global_search: companyGlobalSearchName,
      institution_name: "Select" === npxFilter?.institution_name ? '' : [npxFilter?.institution_name],
      fund_name: "Select" === npxFilter?.fund_name ? '' : npxFilter?.fund_name,
      proposal: "Select" === npxFilter?.proposal ? '' : npxFilter?.proposal,
      vote: "Select" === npxFilter?.vote ? '' : npxFilter?.vote,
      vote_category: "Select" === npxFilter?.vote_category ? '' : npxFilter?.vote_category,
      keyword: npxFilter?.keyword

    })
    // setIsFilterCollapse(!isFilterCollapse);
    dispatch(resetPage());
  };

  const onFilterClear = () => {
    resetFormValues();
    setallApplyFilter('');
    dispatch(resetPage());
  };

  const resetFormValues: any = () => {
    // setApiDropdownOptions({ institution: [] });
    // setApiDependentDropdownOptions({ fund_name: [], proposal: [], vote: [] });
    setValue("institution_name", 'Select');
    setValue("fund_name", []);
    setValue("proposal", []);
    setValue("vote", []);
    setValue("vote_category", []);
    setValue("keyword", '');


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

  return (
    <>
      {/* {npxProxyDetails?.npx_report?.length === 0 &&
        !npxProxyLoading &&
        location.pathname !== "/" && ( */}
          <Button
            onClick={() => {
              navigate("/");
            }}
            variant="primary"
            className="bg-theme-2 border-bg-theme-2 mb-1"
          >
            <ChevronLeft
              className="group-[.mode--light]:text-white text-white"
              size={18}
              strokeWidth={1.5}
            />
            Back
          </Button>
        {/* )} */}

      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
        <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
          <span>
            <h1 className="text-lg font-bold">N-PX Voting (Beta)</h1>
          </span>
        </div>
        {/* <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <div
                    className="box p-[5px] cursor-pointer"
                    onClick={convertDivTableToCSV}
                  >
                    <img alt="download-icon" src={downloadIcon} />
                  </div>
                </Tippy>
              </div> */}
      </div>
      <div className="p-5 mt-1 box">



        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          {/* <div className="flex">
            <MultiSearchBar
              onSearch={handleSearch}
              searchTerms={searchTerms}
              setSearchTerms={setSearchTerms}
              url={`/npx/fund_name/?all=true`}
              getOptionKey="fund_name"
              placeHolder="Search Fund Name"
              isSingle={true}
              isAll={true}
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
                    className="text-slate-500 cursor-pointer"
                  />
                </Tippy>
              </Button>
            </div>
          </div> */}
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">

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
          </div>
        </div>

        {isFilterCollapse && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="filter-section mb-5">
              <div className="flex items-center justify-end mt-2 mb-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    onFilterClear();
                    // close();
                  }}
                  type="button"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="w-full">
                  <div className="text-left text-slate-500 flex justify-between mb-1">
                    Institution
                    {/* {apiDropdownOptions?.institution?.length > 0 && (
                      <div>
                        <FormCheck className="mr-2">
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="institution"
                            checked={
                              apiDropdownOptions.institution.length === watch("institution")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "institution",
                                e.target.checked
                                  ? apiDropdownOptions.institution
                                  : []
                              );
                            }}
                          />
                        </FormCheck>
                      </div>
                    )} */}
                  </div>
                  <Controller
                    name="institution_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}

                        onChange={(value) => {
                          field.onChange(value);
                          handleDropdownChange("institution_name", value?.target?.value);
                          // setDropdownValues({institution_name: value?.target?.value})
                          getFundNameDependentDropdown(value?.target?.value);
                        }}
                        options={{ placeholder: "Select Institution" }}
                        className="w-full"

                      >
                        {getDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDropdownOptions.institution?.map((institution: any) => (
                            <option key={institution} value={institution}>
                              {institution}
                            </option>
                          ))
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                <div className="w-full">
                  <div className="text-left text-slate-500 flex justify-between mb-1">
                    Fund
                    {/* {apiDropdownOptions?.institution?.length > 0 && (
                      <div>
                        <FormCheck className="mr-2">
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="institution"
                            checked={
                              apiDropdownOptions.institution.length === watch("institution")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "institution",
                                e.target.checked
                                  ? apiDropdownOptions.institution
                                  : []
                              );
                            }}
                          />
                        </FormCheck>
                      </div>
                    )} */}
                  </div>
                  <Controller
                    name="fund_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          handleDropdownChange("fund_name", value?.target?.value);
                          field.onChange(value);
                          // setDropdownValues((prevSelected:any) => {[...prevSelected, {fund_name: value?.target?.value}]});
                          // setDropdownValues()
                          // getDependentDropdown();
                        }}
                        options={{ placeholder: "Select Fund" }}
                        className="w-full"
                        multiple
                      >
                        {getFundNameDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiFundNameDropdown?.fund_name?.map((fund: any) => (
                            <option key={fund} value={fund}>
                              {/* {(fund)} */}
                              {convertToTitleCase(fund)}

                            </option>
                          ))
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                <div className="w-full">
                  <div className="text-left text-slate-500 flex justify-between mb-1">
                    Category
                    {/* {apiDropdownOptions?.institution?.length > 0 && (
                      <div>
                        <FormCheck className="mr-2">
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="institution"
                            checked={
                              apiDropdownOptions.institution.length === watch("institution")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "institution",
                                e.target.checked
                                  ? apiDropdownOptions.institution
                                  : []
                              );
                            }}
                          />
                        </FormCheck>
                      </div>
                    )} */}
                  </div>
                  <Controller
                    name="vote_category"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => { field.onChange(value) }}
                        options={{ placeholder: "Select Vote Category" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote_category?.map((vote_category: any) => (
                            <option key={vote_category} value={vote_category}>
                              {/* {vote_category} */}
                              {convertToTitleCase(vote_category)}
                            </option>
                          ))
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                <div className="w-full">
                  <div className="text-left text-slate-500 flex justify-between mb-1">
                    Proposal
                    {/* {apiDropdownOptions?.institution?.length > 0 && (
                      <div>
                        <FormCheck className="mr-2">
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="institution"
                            checked={
                              apiDropdownOptions.institution.length === watch("institution")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "institution",
                                e.target.checked
                                  ? apiDropdownOptions.institution
                                  : []
                              );
                            }}
                          />
                        </FormCheck>
                      </div>
                    )} */}
                  </div>
                  <Controller
                    name="proposal"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => { field.onChange(value) }}
                        options={{ placeholder: "Select Proposal" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.proposal?.map((proposal: any) => (
                            <option key={proposal} value={proposal}>
                              {/* {(proposal)} */}
                              {convertToTitleCase(proposal)}
                            </option>
                          ))
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                <div className="w-full">
                  <div className="text-left text-slate-500 flex justify-between mb-1">
                    Vote
                    {/* {apiDropdownOptions?.institution?.length > 0 && (
                      <div>
                        <FormCheck className="mr-2">
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="institution"
                            checked={
                              apiDropdownOptions.institution.length === watch("institution")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "institution",
                                e.target.checked
                                  ? apiDropdownOptions.institution
                                  : []
                              );
                            }}
                          />
                        </FormCheck>
                      </div>
                    )} */}
                  </div>
                  <Controller
                    name="vote"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => { field.onChange(value) }}
                        options={{ placeholder: "Select Vote" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote?.map((vote: any) => (
                            <option key={vote} value={vote}>
                              {/* {vote} */}
                              {convertToTitleCase(vote)}
                            </option>
                          ))
                        )}
                      </TomSelect>
                    )}
                  />
                </div>




                <div className="w-full">
                  <div className="text-left text-slate-500">Keyword</div>
                  <Controller
                    name="keyword"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <FormInput
                        value={field.value?.toString() || ""}
                        onChange={field.onChange}
                        type="text"
                        className="mt-1"
                        placeholder="Search Keyword"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* {npxProxyDetails?.npx_report?.length > 0 && ( */}
        <div className="w-full">

          <>
            <div className="">
              <div>
                <TableWrapper isLoading={allApplyFilter && npxProxyLoading}>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Td
                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                            style={{ width: '30%' }} // Proposal gets more width
                          >
                            Proposal
                          </Table.Td>
                          <Table.Td
                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                            style={{ width: '17.5%' }} // Remaining columns have equal widths
                          >
                            Category
                          </Table.Td>
                          <Table.Td
                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                            style={{ width: '17.5%' }}
                          >
                            Vote
                          </Table.Td>
                          <Table.Td
                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                            style={{ width: '17.5%' }}
                          >
                            Shared Voted
                          </Table.Td>
                          <Table.Td
                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                            style={{ width: '17.5%' }}
                          >
                            Fund Name
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {npxProxyDetails?.length > 0 &&
                          npxProxyDetails?.map((noAction: any) => (
                            <Table.Tr key={noAction?.id} className="[&_td]:last:border-b-0">
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600" style={{ width: '30%' }}>
                                {convertToTitleCase(noAction?.vote_description)}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600" style={{ width: '17.5%' }}>
                                {convertToTitleCase(noAction?.vote_category)}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600" style={{ width: '17.5%' }}>
                                {convertToTitleCase(noAction?.vote)}
                              </Table.Td>
                              <Table.Td
                                className="whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ width: '17.5%' }}
                              >
                                {noAction?.shares_voted
                                  ?.split(' ')
                                  .map((num: string) =>
                                    new Intl.NumberFormat('en-US').format(Math.floor(Number(num)))
                                  )
                                  .join(' ')}
                              </Table.Td>
                              <Table.Td className="whitespace-nowrap text-wrap" style={{ width: '17.5%' }}>
                                {convertToTitleCase(noAction?.fund_name)}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>

                      {npxProxyDetails?.length === 0 && (
                        <div className="w-full">
                          <h1 className="mt-3">No Records Found..</h1>
                        </div>
                      )}
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
          </>
        </div>

        {/* {!allApplyFilter && (
          <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
            <h1 className="font-semibold">Please search institution name</h1>
          </div>
        )} */}

        {/* {!npxProxyDetails && npxProxyLoading && allApplyFilter && (
          <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        )} */}

        {npxProxyDetails?.npx_report?.length === 0 && !npxProxyLoading && allApplyFilter && (
          <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
            <h1 className="font-semibold"> Proxy Records Not Found..</h1>
          </div>
        )}
      </div>




    </>
  );
};

export default index;
