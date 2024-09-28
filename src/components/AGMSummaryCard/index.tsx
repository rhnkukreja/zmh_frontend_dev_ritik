import Lucide from '../Base/Lucide';
import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import FormSelect from '../Base/Form/FormSelect';
import Tippy from '../Base/Tippy';
import { downloadCSV } from '@/utils/helper';


const index = () => {

    const convertDivTableToCSV = () => {
        // Get the table element
        const table = document.querySelector(".table_2");
        const rows = table?.querySelectorAll(".row_2");
        let csvContent = "";

        // Iterate over each row
        rows?.forEach((row) => {
            const cells = row.querySelectorAll(".cell_2");
            let rowData: any = [];

            // Iterate over each cell and get the text content
            cells.forEach((cell) => {
                rowData.push(cell.textContent);
            });

            // Join cells with commas to form a CSV row
            csvContent += rowData.join(",") + "\n";
        });

        downloadCSV(csvContent, 'Agm-Summary');
    };

    return (
        <div className="p-5 mt-3.5 box ">
            <div className="w-full">
                <div className='flex justify-between items-center xs:flex-col md:flex-row py-3'>
                    <div className='flex justify-between items-center gap-4 xs:flex-col md:flex-row'>
                        <h1 className='text-lg font-bold'>Previous AGM Summary</h1>
                        <div className=''>
                            {/* <div className="text-left text-slate-500">
                                Select Year
                            </div> */}
                            <FormSelect
                                defaultValue={"Select Year"}
                                className="flex-1 xs:w-[240px] md:w-auto">
                                <option >
                                    2024
                                </option>
                                <option >
                                    2023
                                </option>
                            </FormSelect>
                        </div>
                        <div className='p-2 bg-white rounded-md xs:w-[240px] md:w-auto flex items-center justify-center border-red-800 border-2 font-semibold text-red-800 border-solid'>
                            View More
                        </div>
                    </div>
                    <div className='flex justify-between items-center gap-4 xs:mt-4 md:mt-0'>
                        <Tippy
                            content='Download Excel'
                            options={{ theme: "light" }}
                        >
                            <div className='box p-[5px] cursor-pointer' onClick={convertDivTableToCSV}>
                                <img
                                    alt="download-icon"
                                    src={downloadIcon}
                                />
                            </div>
                        </Tippy>
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
                            <Table className="table_2">
                                <Table.Thead>
                                    <Table.Tr className="row_2">
                                        <Table.Td className="cell_2 py-2 font-medium h-[50px] bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Proposal
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            For
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Against
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Abstain
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                            Broker Non-Vote
                                        </Table.Td>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>James Bell</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9465679895
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                66756373
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                27788697
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Tim Cook</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Tim Cook</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Tim Cook</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Al Gore</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Alex Gorsky</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Andrea Jung</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Art Levinson</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>


                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Monica Lozano</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr
                                        className="row_2 [&_td]:last:border-b-0">
                                        <Table.Td className="cell_2 flex h-[50px] w-[260px] flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">

                                            <div className='flex items-center font-semibold gap-2'>
                                                <h1 className=' '>Ron Sugar</h1>
                                            </div>

                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                9384013653
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                154755524
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                21455788
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                            <div className="whitespace-nowrap ">
                                                3199709505
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