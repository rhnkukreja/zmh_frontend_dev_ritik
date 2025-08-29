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
        <Dialog.Panel className="p-0 text-left max-w-4xl w-full">
          <Dialog.Title className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Vote Details - {selectedShareholderDetail?.company_name || 'Company'}</h2>
              <p className="text-sm text-slate-600 mt-2">
                {selectedShareholderDetail?.proposal_num} - {selectedShareholderDetail?.proposal_name}
              </p>
            </div>
            <button
              onClick={() => {
                setShareholderDetailModalVisible(false);
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 transition-colors"
            >
              <Lucide icon="X" className="w-5 h-5 text-slate-500" />
            </button>
          </Dialog.Title>
          
          <div className="p-6">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-primary text-white px-4 py-3">
                      <th className="px-4 py-3 text-left font-medium text-sm border-b border-slate-200">
                        Institution Name
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm border-b border-slate-200">
                        Vote Decision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedShareholderDetail?.vote_details?.map(
                      (item: any, index: number) => {
                        const institutionName = Object.keys(item)[0];
                        const decision = item[institutionName];
                        
                        // Determine vote color
                        const getVoteColor = (vote: string) => {
                          switch (vote?.toLowerCase()) {
                            case 'for':
                              return 'text-green-700 bg-green-50 border-green-200';
                            case 'against':
                              return 'text-red-700 bg-red-50 border-red-200';
                            case 'abstain':
                              return 'text-orange-800 bg-orange-100 border-orange-300';
                            default:
                              return 'text-slate-700 bg-slate-50 border-slate-200';
                          }
                        };

                        return (
                          <tr key={index} className="hover:bg-slate-25 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {institutionName.includes(". ") ? institutionName.split(". ")[1] : institutionName}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getVoteColor(decision)}`}>
                                {decision}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* </Dialog.Description> */}
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default DetailDialog;
