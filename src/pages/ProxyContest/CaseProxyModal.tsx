import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import Tippy from "@/components/Base/Tippy";
import { fetchCaseStudies } from "@/stores/caseStudySlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import React, { useEffect, useState } from "react";

interface CaseProxyModalProps {
  caseProxyModalVisible: boolean;
  setCaseProxyModalVisible: (visible: boolean) => void;
  caseProxyModalData: any;
}

const CaseProxyModal: React.FC<CaseProxyModalProps> = ({
  caseProxyModalVisible,
  setCaseProxyModalVisible,
  caseProxyModalData,
}) => {
  const dispatch: AppDispatch = useAppDispatch();

  const { caseStudies, loading } = useAppSelector(
    (state) => state.caseStudies
  );

  // State for detailed case study modal
  const [detailedCaseStudy, setDetailedCaseStudy] = useState<any>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    if (caseProxyModalData?.company_name && caseProxyModalVisible) {
      // Fetch case studies filtered by company name
      const url = `/case_studies/?company_name=${encodeURIComponent(JSON.stringify([caseProxyModalData.company_name]))}`;
      dispatch(fetchCaseStudies(url));
    }
  }, [dispatch, caseProxyModalData?.company_name, caseProxyModalVisible]);

  const handleModalClose = () => {
    setShowDetailedView(false);
    setDetailedCaseStudy(null);
    setCaseProxyModalVisible(false);
  };

  return (
    <Dialog
      size="xl"
      open={caseProxyModalVisible}
      onClose={handleModalClose}
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="mr-auto text-xl font-semibold">
            {showDetailedView ? "Case Study Detail" : "Case Studies"}
          </h2>
          <div
            onClick={handleModalClose}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>
        <Dialog.Description className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <LoadingIcon icon="three-dots" className="w-8 h-8" />
            </div>
          ) : showDetailedView && detailedCaseStudy ? (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setShowDetailedView(false)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Lucide icon="ArrowLeft" className="w-4 h-4 mr-2" />
                  Back to Case Studies
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailedCaseStudy?.institution_name && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Institution</h3>
                    <p>{detailedCaseStudy?.institution_name}</p>
                  </div>
                )}
                {detailedCaseStudy?.esg_themes && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Theme</h3>
                    <p>{detailedCaseStudy?.esg_themes}</p>
                  </div>
                )}
                {detailedCaseStudy?.industry && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Industry</h3>
                    <p>{detailedCaseStudy?.industry}</p>
                  </div>
                )}
                {detailedCaseStudy?.company_name && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Company</h3>
                    <p>{detailedCaseStudy?.company_name}</p>
                  </div>
                )}
                {detailedCaseStudy?.year && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Year</h3>
                    <p>{detailedCaseStudy?.year}</p>
                  </div>
                )}
                {detailedCaseStudy?.vote && (
                  <div>
                    <h3 className="font-semibold min-w-[150px] mb-2">Vote</h3>
                    <p className="text-destructive">{detailedCaseStudy?.vote}</p>
                  </div>
                )}
              </div>
              {detailedCaseStudy?.engagement_details && (
                <div>
                  <h3 className="font-semibold mb-2">Engagement/Voting Details</h3>
                  <p>{detailedCaseStudy?.engagement_details}</p>
                </div>
              )}
            </div>
          ) : caseStudies.length > 0 ? (
            <TableWrapper>
              <div className="overflow-x-auto">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Td className="py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700">
                        Institution
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700">
                        Year
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700">
                        Theme
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700">
                        Industry
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 text-center w-20">
                        View
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {caseStudies.map((item: any, index: number) => (
                      <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                        <Table.Td className="py-2 border-dashed">
                          <div className="flex items-center">
                            {item?.institution_logo_url ? (
                              <img
                                alt="Institution Logo"
                                className="w-6 h-6 rounded-full object-contain mr-3"
                                src={item?.institution_logo_url}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 mr-3"></div>
                            )}
                            <span>{item?.institution_name || 'N/A'}</span>
                          </div>
                        </Table.Td>
                        <Table.Td className="py-2 border-dashed">
                          {item?.year || 'N/A'}
                        </Table.Td>
                        <Table.Td className="py-2 border-dashed">
                          {item?.esg_themes || 'N/A'}
                        </Table.Td>
                        <Table.Td className="py-2 border-dashed">
                          {item?.industry || 'N/A'}
                        </Table.Td>
                        <Table.Td className="py-2 border-dashed text-center">
                          <Tippy content="View Details" options={{ theme: "light" }}>
                            <Lucide
                              onClick={() => {
                                setDetailedCaseStudy(item);
                                setShowDetailedView(true);
                              }}
                              icon="Eye"
                              className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                            />
                          </Tippy>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>
          ) : (
            <div className="text-center py-8">
              <Lucide icon="BookOpen" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Case Studies Found</h3>
              <p className="text-gray-500">No case studies available for {caseProxyModalData?.company_name}.</p>
            </div>
          )}
        </Dialog.Description>

        <Dialog.Footer className="flex justify-end"></Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default CaseProxyModal;
