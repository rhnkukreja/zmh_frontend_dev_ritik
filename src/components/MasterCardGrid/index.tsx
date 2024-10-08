import TableWrapper from '../TableWrapper'
import Table from "@/components/Base/Table";

interface ChildProps {
    gridHeaders: any[];
    gridRecords: any[];
    gridTitle: string;
  }

const index: React.FC<ChildProps> = ({ gridHeaders, gridRecords, gridTitle }) => {
  return (
    <div className='p-5 mt-3.5 box '>
          <div className="">
              <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                  <h1 className='text-lg font-bold'>{gridTitle}</h1>
              </div>
              <TableWrapper isLoading={false}>
                  <Table className="table_2 w-full">
                      <Table.Thead className="sticky top-0 z-10">
                          <Table.Tr className="row_2">
                              {gridHeaders?.length > 0 &&
                                  gridHeaders?.map((headerItem: any, headerIndex: number) => (
                                      <Table.Td
                                          key={headerIndex}
                                          className="cell_2 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left"
                                      >
                                          {headerItem?.header}
                                      </Table.Td>
                                  ))}
                          </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                          {gridRecords?.length > 0 &&
                              gridRecords?.map((record: any, recordIndex: number) => (
                                  <Table.Tr key={recordIndex} className="row_2 [&_td]:last:border-b-0">
                                      {gridHeaders?.length > 0 &&
                                          gridHeaders?.map((headerItem: any, headerIndex: number) => (
                                              <Table.Td
                                                  key={headerIndex}
                                                  className="cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left"
                                              >
                                                  <h1>{record[headerItem?.field]}</h1>

                                              </Table.Td>
                                          ))}
                                  </Table.Tr>
                              ))}
                      </Table.Tbody>
                  </Table>
              </TableWrapper>
          </div>
    </div>
  )
}

export default index