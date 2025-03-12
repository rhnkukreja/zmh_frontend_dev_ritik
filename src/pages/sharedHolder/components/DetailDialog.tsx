import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import React, { useEffect, useState } from "react";

interface ShareholderActionDetailProps {
  shareholderDetailModalVisible: boolean;
  setShareholderDetailModalVisible: (visible: boolean) => void;
  selectedShareholderDetail: any | null;
}

const DetailDialog: React.FC<ShareholderActionDetailProps> = ({
  shareholderDetailModalVisible,
  setShareholderDetailModalVisible,
  selectedShareholderDetail,
}) => {
  return (
    <>
      <Dialog
        size="xl"
        open={shareholderDetailModalVisible}
        onClose={() => {
          setShareholderDetailModalVisible(false);
        }}
      >
        <Dialog.Panel className="p-10 text-center h-full">
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">Vote Details</h2>
            <div
              onClick={() => {
                setShareholderDetailModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-5 mr-5 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          {/* <Dialog.Description > */}
          <div className="relative w-full h-full">
            <TableWrapper isLoading={false}>
              <Table className="table_2 w-full">
                <Table.Thead className="sticky top-0 z-10">
                  <Table.Tr className="row_2">
                    <Table.Td className="cell_2 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left">
                      Institution Name
                    </Table.Td>
                    <Table.Td className="cell_2 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left">
                      Vote
                    </Table.Td>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {selectedShareholderDetail?.vote_details?.map(
                    (item: any, index: number) => {
                      const institutionName = Object.keys(item)[0];
                      const decision = item[institutionName];
                      return (
                        <Table.Tr
                          key={index}
                          className="row_2 [&_td]:last:border-b-0"
                        >
                          <Table.Td className="cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                            {institutionName.split(". ")[1]}
                          </Table.Td>
                          <Table.Td className="cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                            {decision}
                          </Table.Td>
                        </Table.Tr>
                      );
                    }
                  )}
                </Table.Tbody>
              </Table>
            </TableWrapper>
          </div>
          {/* </Dialog.Description> */}
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default DetailDialog;
