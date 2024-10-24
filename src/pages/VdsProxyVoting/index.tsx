import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchAGMSummaryDashboard,
  fetchVdsProxyDashboard,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import LoadingIcon from "../../components/Base/LoadingIcon";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";

const index = () => {
  const location = useLocation();
  const navigate = useNavigate()
  const locationPathName = location?.pathname;
  const dispatch: AppDispatch = useAppDispatch();
  const { vdsProxyDetails, vdsProxyLoading, page } = useAppSelector(
    (state) => state.dashboard
  );
  const [searchParams] = useSearchParams();

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  // const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;

  useEffect(() => {
    dispatch(
      fetchVdsProxyDashboard(
        createDynamicURL(
          `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}`,
          undefined,
          undefined
        )
      )
    );
  }, [companyGlobalSearchTicker]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    }
    else {
      false
    }
  }

  return (
    <>
      {/* <div className="p-y-5 mb-1 font-semibold text-xl ">
        {companyGlobalSearchName}
      </div> */}

      {location.pathname !== "/" && (
        <Button
          onClick={() => {
            navigate("/");
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2 mb-4"
        >
          <ChevronLeft
            className="group-[.mode--light]:text-white text-white"
            size={18}
            strokeWidth={1.5}
          />
          Back
        </Button>
      )}
      {vdsProxyDetails?.vds_report?.length > 0 && (
        <div className="p-5 mt-3.5 box ">
          <div className="w-full">
            <div className="flex justify-between items-center xs:flex-col sm:flex-row py-3">
              <h1 className="text-lg font-bold">Proxy Voting</h1>
            </div>
            <>
              <div className="mt-5">
                <div>
                  <TableWrapper>
                    <div className="overflow-x-auto max-h-[300px] 2xl:max-h-[400px] 3xl:max-h-[500px] overflow-y-scroll">
                      <Table className="table_2 w-full">
                        <Table.Thead className="sticky top-0 z-10"> {/* Make entire header sticky */}
                          <Table.Tr className="row_2">
                            {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                              vdsProxyDetails?.vds_report_headers?.map(
                                (vdsHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left",
                                      "sticky top-0", // Ensure the header remains sticky at the top
                                      headerIndex === 0 &&
                                      "sticky left-0 bg-header z-50 ", // Fix first column
                                      headerIndex === 1 &&
                                      "sticky left-[50px] bg-header z-50 ", // Fix second column (adjust 'left' value according to width)
                                    ])}
                                  >
                                    {vdsHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {vdsProxyDetails?.vds_report?.length > 0 &&
                            vdsProxyDetails?.vds_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_2 [&_td]:last:border-b-0"
                                >
                                  {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                                    vdsProxyDetails?.vds_report_headers?.map(
                                      (vdsHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left",
                                            headerIndex === 0 && "sticky left-0 bg-white  z-5", // Fix first column
                                            headerIndex === 1 &&
                                            "sticky left-[50px] bg-white z-5", // Fix second column
                                          ])}
                                        >
                                          {/* <Tippy
                                            content={isObject(vdsProxy[vdsHeader?.field]) && (vdsProxy[vdsHeader?.field]?.notes)} options={{ theme: "light" }}>
                                            <h1 className={clsx([
                                              isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.vote?.includes("Against") &&
                                              "text-red-700 font-semibold",
                                            ])}> {isObject(vdsProxy[vdsHeader?.field]) ? vdsProxy[vdsHeader?.field]?.vote : vdsProxy[vdsHeader?.field]}</h1>
                                          </Tippy> */}

                                          {/* { isObject(vdsProxy[vdsHeader?.field]) &&
                                            <a
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Lucide
                                              icon="Eye"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </a>
                                          }
                                          
                                          <div className={clsx([
                                            isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.vote?.includes("Against") &&
                                            "text-red-700 font-semibold",
                                          ])}> {

                                              isObject(vdsProxy[vdsHeader?.field]) ? 
                                                <>
                                                  {(vdsProxy[vdsHeader?.field]?.vote)}
                                                 
                                              </>
                                                : vdsProxy[vdsHeader?.field]}

                                          </div> */}
                                         

                                          {isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes !== null ?
                                           
                                              <h1 className={clsx([
                                                vdsProxy[vdsHeader?.field]?.vote?.includes("Against") &&
                                                "text-red-700 font-semibold", 'flex items-center'
                                              ])}>
                                              <Tippy
                                                content={isObject(vdsProxy[vdsHeader?.field]) && (vdsProxy[vdsHeader?.field]?.notes)} options={{ theme: "light" }}>

                                                <span >
                                                  <Lucide
                                                    icon="Info"
                                                    className="w-4 h-4 mr-1.5 stroke-[1.3] text-blue-800"
                                                  />
                                                </span>
                                              </Tippy>
                                               
                                                {/* <span className={clsx([vdsProxy[vdsHeader?.field]?.notes !== null && 'flex flex-col w-2 h-2 bg-red-700 rounded-2xl mr-2'])}></span> */}
                                                {vdsProxy[vdsHeader?.field]?.vote}</h1>

                                            
                                            :


                                            isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes === null ?
                                              <h1 className={clsx([
                                                vdsProxy[vdsHeader?.field]?.vote?.includes("Against") &&
                                                "text-red-700 font-semibold ", 
                                              ])}> {vdsProxy[vdsHeader?.field]?.vote}</h1>
                                              :
                                              <h1> {vdsProxy[vdsHeader?.field]}</h1>
                                          }
                                        </Table.Td>
                                      )
                                    )}
                                </Table.Tr>
                              )
                            )}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </TableWrapper>

                </div>
              </div>
            </>
          </div>
        </div>
      )}

      {!vdsProxyDetails && vdsProxyLoading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {vdsProxyDetails?.vds_report?.length === 0 && !vdsProxyLoading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <h1 className="font-semibold"> Proxy Records Not Found..</h1>
        </div>
      )}
    </>
  );
};

export default index;
