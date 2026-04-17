import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import documentImage from "../../assets/images/zmh-images/document (2).png";
import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "../Base/Button";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { dashboardService } from "@/services/dashboard";
import { fetchInvestorProfileDetails } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import clsx from "clsx";

interface ChildProps {
  pdfDocuments: any;
}

const index: React.FC<ChildProps> = ({ pdfDocuments }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch: AppDispatch = useAppDispatch();
  const handleDownload = async (pdfUrl: string) => {
    // Create a link element
    try {
      // Fetch the PDF file as a blob
      const response = await fetch(pdfUrl);
      const blob = await response.blob();

      // Create a link element
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);

      // Set the 'download' attribute with a filename
      link.setAttribute("download", "your-file-name.pdf"); // Replace with your desired file name

      // Programmatically click the link to trigger the download
      link.click();

      // Cleanup: revoke the object URL after the download
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading the file:", error);
    }
  };
  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const [loading, setLoading] = useState(false);
  const [pdfId, setPdfId] = useState(0);

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const document of pdfDocuments || []) {
        const isValid = await checkImageUrl(document?.image);
        tempValidImages[document?.name] = isValid
          ? document?.image
          : documentImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [pdfDocuments]);

  const putDocumentStarred = async (documentId: number, isStarred: boolean) => {

    try {
      setPdfId(documentId);
      setLoading(true);
      const res =
        await dashboardService.putDocumentStarred(documentId, {  starred: (isStarred ? false : true) });
      if (res.result) {
        // setApiDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
    
      setTimeout(() => {
      setLoading(false);       
        dispatch(
          fetchInvestorProfileDetails(
            createDynamicURL(
              `${baseURL}/investor_profile_detail_page/?institution_id=${id}`
            )
          )
        );
      }, 1000);
      // setGetDropdownLoader(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Documents</h2>
        {/* Temporarily disabled */}
        {/* <Button
          onClick={() =>
            navigate(`/investor-profile/investor/${id}`, {
              state: { 
                from: location.pathname,
                fromState: location.state 
              },
            })
          }
          className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm"
        >
          View Full Profile
        </Button> */}
      </div>

      <div className="p-6 max-h-[500px] overflow-y-auto">
        <TableWrapper isLoading={false}>
          <div>
            <Table className="table">
              <Table.Thead>
                <Table.Tr className="row">
                  <Table.Td className="cell py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                    Name
                  </Table.Td>
                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                    {/* Year */}
                  </Table.Td>
                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                    Year
                  </Table.Td>

                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px] text-center  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]"></Table.Td>
                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px] text-center  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                    View
                  </Table.Td>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pdfDocuments?.length > 0 &&
                  pdfDocuments.map((document: any) => (
                    <Table.Tr
                      key={document.name}
                      className="row [&_td]:last:border-b-0"
                    >
                      <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[50px]">
                        <div className=" w-10 h-10 ml-5 overflow-hidden rounded-full image-fit-auto border-[3px] border-slate-200/70">
                          <img
                            alt="ZMH Analytics"
                            src={validImages[document.name]}
                          />
                        </div>
                      </Table.Td>

                      <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[300px]">
                        <div className="flex justify-between items-center ">
                          <div>
                            <h1
                              onClick={() =>
                                /* handleDownload(document?.link) */ window.open(
                                document?.link,
                                "_blank"
                              )
                              }
                              className="font-semibold cursor-pointer hover:underline"
                            >
                              {document?.name}
                            </h1>
                          </div>
                        </div>
                      </Table.Td>

                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">{document.year}</Table.Td>
                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600"></Table.Td>
                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                        <div className="flex justify-center items-center h-full">
                          <Tippy
                            content="See Details"
                            options={{
                              theme: "light",
                            }}
                          >
                            <a
                              href={document?.link || ""}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Lucide
                                icon="Eye"
                                className="w-4 h-4 mr-1.5 stroke-[1.3]"
                              />
                            </a>
                          </Tippy>

                          <Tippy
                            content={document?.starred ? 'Starred' : 'Not Starred' }
                            options={{
                              theme: "light",
                            }}
                          >
                            <a
                              onClick={() => putDocumentStarred(document?.id, document?.starred)}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >

                              {pdfId === document?.id && loading ?
                                <Lucide
                                  icon="Loader"
                                  className="w-4 h-4 mr-1.5 stroke-[1.3] animate-spin"
                                />
                                :
                                <Lucide
                                  icon="Star"
                                  className={clsx([ document?.starred &&
                                    " text-[red]", "w-4 h-4 mr-1.5 stroke-[1.3] "
                                  ])}
                                />
                              }


                            </a>
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
    </div>
  );
};

export default index;
