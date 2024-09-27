import Lucide from '../Base/Lucide';
import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import FormSelect from '../Base/Form/FormSelect';


const index = () => {
    return (
        <div className="p-5 mt-3.5 box ">
            <div className="w-full">
                <div className='flex justify-between items-center xs:flex-col md:flex-row'>
                    <div className='flex justify-between items-center gap-4 xs:flex-col md:flex-row'>
                    <h1 className='text-lg font-bold'>Previous AGM Summary</h1>
                        <div className=''>
                            {/* <div className="text-left text-slate-500">
                                Select Year
                            </div> */}
                            <FormSelect 
                                defaultValue={"Select Year"}
                                className="flex-1">
                                <option >
                                    2024
                                </option>
                                <option >
                                    2023
                                </option>
                            </FormSelect>
                        </div>
                        <div className='p-2 bg-white rounded-md  border-red-800 border-2 font-semibold text-red-800 border-solid'>
                           View More
                        </div>
                    </div>
                    <div className='flex justify-between items-center gap-4'>
                        <div className='box p-[5px]'>
                            <img
                                alt="download-icon"
                                src={downloadIcon}
                            />
                        </div>
                        <div className='box p-2'>
                            <img
                                alt="tab-icon"
                                src={tabIcon}
                            />
                        </div>
                    </div>
                </div>

                <div className='mt-5'>
                    <div className="min-h-[300px] max-h-[300px] overflow-y-scroll">
                        <TableWrapper>
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Td className="py-2 font-medium h-[50px] bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Proposal
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        For
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Against
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Abstain
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Label
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Label
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Label
                                        </Table.Td>
                                        <Table.Td className="py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                        Label
                                        </Table.Td>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>

                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>


                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>


                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>


                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>

                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                       
                                    </Table.Tr>


                                    <Table.Tr
                                        className="[&_td]:last:border-b-0">
                                        <Table.Td className="flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                           
                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Bezos Jeffrey P</h1>
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
                                            <div className="whitespace-nowrap ">
                                            Yes
                                            </div>
                                        </Table.Td>
                                        
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                            -
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