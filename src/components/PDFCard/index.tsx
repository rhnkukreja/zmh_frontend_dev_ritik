import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { useEffect, useState } from 'react';

interface ChildProps {
    pdfDocuments: any;
}

const index: React.FC<ChildProps> = ({ pdfDocuments }) => {

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
                tempValidImages[document?.name] = isValid ? document?.image : userLinkedinImage;
            }

            setValidImages(tempValidImages);
        };

        validateImages();
    }, [pdfDocuments]);


    return (
        <div className='p-5 mt-3.5 box '>
            <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                <h1 className='text-lg font-bold'>PDF</h1>
            </div>

            <div className='w-full h-[250px] pr-6 overflow-y-scroll'>
                <TableWrapper isLoading={false}>
                    <div>
                        <Table className="table">
                            <Table.Thead>
                                <Table.Tr className="row">
                                    <Table.Td className="cell py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                        Name
                                    </Table.Td>
                                    <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                        Year
                                    </Table.Td>
                                    <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                        Download
                                    </Table.Td>

                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {pdfDocuments?.length > 0 &&
                                    pdfDocuments.map(
                                        (document: any) => (
                                            <Table.Tr
                                             key={document.name}
                                            className="row [&_td]:last:border-b-0">
                                            <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[50px]">
                                                <div className=" w-12 h-12 ml-5 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                    <img
                                                        alt="Tailwise - Admin Dashboard Template"
                                                        src={validImages[document.name]}
                                                    />
                                                </div>



                                            </Table.Td>
                                            <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[300px]">


                                                <div className='flex justify-between items-center '>
                                                    <div >
                                                        <h1 className='font-semibold '>{document?.name}</h1>
                                                    </div>
                                                </div>


                                            </Table.Td>
                                            <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                <div className="text-right cursor-pointer text-blue-800 whitespace-nowrap" onClick={() => window.open(document?.link, '_blank')} >
                                                    Download
                                                </div>
                                            </Table.Td>

                                        </Table.Tr>
                                        ))
                                }
                            </Table.Tbody>
                        </Table>
                    </div>
                </TableWrapper>
            </div>
        </div>
    )
}

export default index