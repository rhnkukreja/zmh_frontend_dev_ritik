import TableWrapper from '../TableWrapper'
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { useEffect, useState } from 'react';

interface ChildProps {
    contacts: any;
}

const index: React.FC<ChildProps> = ({ contacts }) => {

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
            for (const contact of contacts || []) {
                const isValid = await checkImageUrl(contact?.image);
                tempValidImages[contact?.name] = isValid ? contact?.image : userLinkedinImage;
            }

            setValidImages(tempValidImages);
        };

        validateImages();
    }, [contacts]);

    return (
        <div className='p-5 mt-3.5 box '>
            <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                <h1 className='text-lg font-bold'>Contacts</h1>
            </div>

            {/* <div className='w-full h-[250px] pr-6 overflow-y-scroll'>
                <ul>
                    {contacts?.length > 0 &&
                        contacts?.map((contact: any) => (
                            <li className='flex items-center justify-between '>
                                <span className='w-16'>
                                    <img src={validImages[contact.name]} />
                                </span>

                                <span>
                                    <h1>{contact?.name}</h1>
                                    <div dangerouslySetInnerHTML={{ __html: contact?.designation }} className='mt-2'>
                                    </div>
                                </span>

                                <span onClick={() => window.open(contact?.linkedin, '_blank')}
                                    className="text-right cursor-pointer text-blue-800">
                                    linkedin
                                </span>
                            </li>
                        ))
                    }

                </ul>
            </div> */}

            <div className='w-full h-[250px] pr-6 overflow-y-scroll'>
                <TableWrapper>
                    <div>
                        <Table className="table">
                            {/* <Table.Thead>
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
                            </Table.Thead> */}
                            <Table.Tbody>
                                {contacts?.length > 0 &&
                                    contacts?.map((contact: any) => (
                                        <Table.Tr
                                             key={contact.name}
                                            className="row [&_td]:last:border-b-0">
                                            <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[50px]">
                                                <div className=" w-12 h-12 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                    <img
                                                        alt="Tailwise - Admin Dashboard Template"
                                                        src={validImages[contact.name]}
                                                    />
                                                </div>



                                            </Table.Td>
                                            <Table.Td className="px-0 py-3 border-b dark:border-darkmode-300 w-[300px]">


                                                <div className='flex justify-between items-center '>
                                                    <div >
                                                        <h1 className='font-semibold '>{contact?.name}</h1>
                                                        <div className='text-sm ' dangerouslySetInnerHTML={{ __html: contact?.designation }} >
                                                        </div>
                                                    </div>
                                                </div>


                                            </Table.Td>
                                            <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                <div className="text-right font-semibold hover:text-blue-900 hover:underline cursor-pointer text-blue-800 whitespace-nowrap" onClick={() => window.open(contact?.linkedin, '_blank')} >
                                                    linkedin
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