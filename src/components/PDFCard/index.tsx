import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../Base/Button";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";

interface ChildProps {
  pdfDocuments: any;
}

const index: React.FC<ChildProps> = ({ pdfDocuments }) => {
  const { id } = useParams();
  const navigate = useNavigate();

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
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [pdfDocuments]);

  return (
    <div className="p-5 mt-3.5 box ">
      <div className="flex justify-between items-center xs:flex-col sm:flex-row py-3">
        <h1 className="text-lg font-bold">Documents</h1>

        <Button
          onClick={() =>
            window.open(`/investor-profile/investor/${id}`, "_blank")
          }
          variant="primary"
          className="bg-theme-2 border-bg-theme-2"
        >
          Profile
        </Button>
      </div>

      <div className="w-full h-[250px] pr-6 overflow-y-scroll">
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

                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px] text-center  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]"></Table.Td>
                  <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px] text-center  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                    Download
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
                        <div className=" w-12 h-12 ml-5 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
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
                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600"></Table.Td>
                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                        <div className="flex justify-center items-center h-full">
                          <Tippy
                        //   Download
                            content="View"
                            options={{
                              theme: "dark",
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
                        </div>
                      </Table.Td>

                      {/* <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                <div className="text-center font-semibold  cursor-pointer whitespace-nowrap"
                                                  >
                                                View Details
                                                </div>
                                            </Table.Td> */}
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
