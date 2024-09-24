import Lucide from '../Base/Lucide';
import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";

const index = () => {
    return (
        <div className="p-5 mt-3.5 box ">
            <div className="w-full">
                <div className='flex justify-between items-center'>
                    <h1 className='text-md font-bold'>Top 5 Investor</h1>
                    <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                </div>

                <div className='mt-5'>
                    <div className="min-h-[300px]">
                        <TableWrapper>
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Td className="py-2 font-medium h-[50px] bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Investor
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Ownership
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            User ISS, GL
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Investor Engaged with Company
                                        </Table.Td>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                <img
                                                    alt="Tailwise - Admin Dashboard Template"
                                                    src={userLinkedinImage}
                                                />
                                            </div>
                                            <div className='flex items-center underline font-semibold'>
                                                Bezos Jeffrey P
                                                <Lucide icon="ChevronUp" className="w-4 h-4 ml-2" />
                                            </div>
                                                
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                11.43%
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className='bg-red-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                    X
                                                </div>
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                <img
                                                    alt="Tailwise - Admin Dashboard Template"
                                                    src={userLinkedinImage}
                                                />
                                            </div>
                                            <div className='flex items-center underline font-semibold'>
                                                Bezos Jeffrey P
                                                <Lucide icon="ChevronUp" className="w-4 h-4 ml-2" />
                                            </div>
                                                
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                11.43%
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className='bg-red-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                    X
                                                </div>
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                <img
                                                    alt="Tailwise - Admin Dashboard Template"
                                                    src={userLinkedinImage}
                                                />
                                            </div>
                                            <div className='flex items-center underline font-semibold'>
                                                Bezos Jeffrey P
                                                <Lucide icon="ChevronUp" className="w-4 h-4 ml-2" />
                                            </div>
                                                
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                11.43%
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className='bg-red-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                    X
                                                </div>
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                <img
                                                    alt="Tailwise - Admin Dashboard Template"
                                                    src={userLinkedinImage}
                                                />
                                            </div>
                                            <div className='flex items-center underline font-semibold'>
                                                Bezos Jeffrey P
                                                <Lucide icon="ChevronUp" className="w-4 h-4 ml-2" />
                                            </div>
                                                
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                11.43%
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className='bg-red-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                    X
                                                </div>
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                <img
                                                    alt="Tailwise - Admin Dashboard Template"
                                                    src={userLinkedinImage}
                                                />
                                            </div>
                                            <div className='flex items-center underline font-semibold'>
                                                Bezos Jeffrey P
                                                <Lucide icon="ChevronUp" className="w-4 h-4 ml-2" />
                                            </div>
                                                
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                11.43%
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className='bg-green-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                    ✔
                                                </div>
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                        
                                </Table.Tbody>
                            </Table>
                        </TableWrapper>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default index;