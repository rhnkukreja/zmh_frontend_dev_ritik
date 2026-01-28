import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingWrapper from "@/components/LoadingWrapper";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchInstitutionDocuments,
  getSingleInstitution,
} from "@/stores/institutionSlice";
import { AppDispatch } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft, FileText, ExternalLink, Plus, PenLine } from "lucide-react";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { FormCheck } from "@/components/Base/Form";
import { InstitutionDocument } from "@/types/institutions";
import AddDocumentModal from "./AddDocumentModal";
import EditDocumentModal from "./EditDocumentModal";
import { institutionService } from "@/services/institution";
import { toast } from "react-toastify";

type ProfileSection = "summary" | "engagement_priorities" | "reporting_expectation" | "esg_integration" | "voting_guidelines";

const InstitutionDocuments = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();

  const [addDocumentVisible, setAddDocumentVisible] = useState(false);
  const [editDocumentVisible, setEditDocumentVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InstitutionDocument | null>(null);
  const [linkingInProgress, setLinkingInProgress] = useState<{[key: string]: boolean}>({});

  const {
    singleInstitution,
    institutionDocuments,
    documentsLoading,
    documentsCount,
    loading,
  } = useAppSelector((state) => state.institutions);

  const { user } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
    if (params.id) {
      dispatch(getSingleInstitution(Number(params.id)));
      dispatch(fetchInstitutionDocuments(Number(params.id)));
    }
  }, [params.id, dispatch]);

  const backToPreviousPage = () => {
    navigate(`/institution`);
  };

  const handleViewDocument = (link: string) => {
    window.open(link, "_blank");
  };

  const handleEditDocument = (document: InstitutionDocument) => {
    setSelectedDocument(document);
    setEditDocumentVisible(true);
  };

  const handleDocumentSuccess = () => {
    if (params.id) {
      dispatch(fetchInstitutionDocuments(Number(params.id)));
    }
  };

  const handleLinkToProfile = async (
    document: InstitutionDocument,
    section: ProfileSection,
    isCurrentlyLinked: boolean
  ) => {
    if (!params.id) return;
    
    const linkKey = `${document.id}-${section}`;
    setLinkingInProgress((prev) => ({ ...prev, [linkKey]: true }));

    try {
      await institutionService.linkDocumentToProfile(
        document.id,
        Number(params.id),
        section,
        isCurrentlyLinked ? "unlink" : "link"
      );
      
      dispatch(fetchInstitutionDocuments(Number(params.id)));
      toast.success(
        `Document ${isCurrentlyLinked ? "unlinked from" : "linked to"} ${section.replace("_", " ")}`
      );
    } catch (error) {
      toast.error("Failed to update document link");
    } finally {
      setLinkingInProgress((prev) => ({ ...prev, [linkKey]: false }));
    }
  };

  const isLinkingInProgress = (documentId: number, section: string) => {
    return linkingInProgress[`${documentId}-${section}`] || false;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "extremely high":
        return "bg-purple-100 text-purple-800";
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Button
        onClick={backToPreviousPage}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-4"
      >
        <ChevronLeft
          className="group-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>

      <div className="box box--stacked">
        <div className="p-5 border-b border-slate-200/80">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                {loading ? "Loading..." : (
                  <>
                    {singleInstitution?.institution}
                    {(singleInstitution?.investor_profile_id || institutionDocuments?.[0]?.investor_profile_id) && (
                      <span
                        className="cursor-pointer ml-2"
                        title="Go to Documents"
                        onClick={() => {
                          const id = singleInstitution?.investor_profile_id || institutionDocuments?.[0]?.investor_profile_id;
                          window.open(`/investor-company-details/${id}`, '_blank');
                        }}
                      >
                        <FileText className="w-5 h-5 text-primary hover:text-primary/80 transition-colors" />
                      </span>
                    )}
                  </>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-4 mt-3 md:mt-0">
              {documentsCount > 0 && (
                <span className="text-base font-semibold text-slate-700">
                  Total Documents: {documentsCount}
                </span>
              )}
              {user?.user_type === "Analyst" && (
                <Button
                  onClick={() => setAddDocumentVisible(true)}
                  variant="primary"
                  className="bg-theme-2 border-bg-theme-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          <TableWrapper isLoading={documentsLoading}>
            <div>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] border-header text-[#000000B2] text-xs w-[180px]">
                      Name
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[120px]">
                      Type
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[60px]">
                      Year
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[100px]">
                      Created By
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[90px]">
                      Created
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center" colSpan={5}>
                      Profile Section
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[80px]">
                      Priority
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header last:rounded-tr-[0.6rem] border-header text-[#000000B2] text-xs w-[50px]">
                      Edit
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">
                      Sum
                    </Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">
                      Eng
                    </Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">
                      Rep
                    </Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">
                      ESG
                    </Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">
                      Vote
                    </Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                    <Table.Td className="py-1 font-medium h-[30px] bg-header border-header text-[#000000B2] text-xs"></Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {institutionDocuments?.length > 0 ? (
                    institutionDocuments.map((document: InstitutionDocument) => (
                      <Table.Tr key={document.id}>
                        <Table.Td className="py-1.5 bg-white text-slate-700 border-slate-200/80 text-xs w-[220px] max-w-[220px] align-top">
                          <div className="flex items-start">
                            <FileText className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-slate-400 mr-1.5 mt-0.5" />
                            <button
                              onClick={() => handleViewDocument(document.link)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left break-words whitespace-pre-line w-full"
                              style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                            >
                              {document.name}
                            </button>
                          </div>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.document_type || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.year || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs truncate">
                          {document.created_by_name || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.date_created ? new Date(document.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : "-"}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={document.linked_to_summary || false}
                              disabled={isLinkingInProgress(document.id, "summary") || user?.user_type !== "Analyst"}
                              onChange={() =>
                                handleLinkToProfile(document, "summary", document.linked_to_summary)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={document.linked_to_engagement_priorities || false}
                              disabled={isLinkingInProgress(document.id, "engagement_priorities") || user?.user_type !== "Analyst"}
                              onChange={() =>
                                handleLinkToProfile(document, "engagement_priorities", document.linked_to_engagement_priorities)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={document.linked_to_reporting_expectation || false}
                              disabled={isLinkingInProgress(document.id, "reporting_expectation") || user?.user_type !== "Analyst"}
                              onChange={() =>
                                handleLinkToProfile(document, "reporting_expectation", document.linked_to_reporting_expectation)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={document.linked_to_esg_integration || false}
                              disabled={isLinkingInProgress(document.id, "esg_integration") || user?.user_type !== "Analyst"}
                              onChange={() =>
                                handleLinkToProfile(document, "esg_integration", document.linked_to_esg_integration)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={document.linked_to_voting_guidelines || false}
                              disabled={isLinkingInProgress(document.id, "voting_guidelines") || user?.user_type !== "Analyst"}
                              onChange={() =>
                                handleLinkToProfile(document, "voting_guidelines", document.linked_to_voting_guidelines)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityBadgeClass(document.priority)}`}
                          >
                            {document.priority || "-"}
                          </span>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          {user?.user_type === "Analyst" && (
                            <Tippy content="Edit" options={{ theme: "light" }}>
                              <button
                                onClick={() => handleEditDocument(document)}
                                className="p-0.5 hover:bg-slate-100 rounded"
                              >
                                <PenLine className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </Tippy>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td
                        colSpan={12}
                        className="py-10 text-center text-slate-500"
                      >
                        No documents found for this institution.
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        </div>
      </div>

      {addDocumentVisible && params.id && (
        <AddDocumentModal
          visible={addDocumentVisible}
          setVisible={setAddDocumentVisible}
          institutionId={params.id}
          institutionName={singleInstitution?.institution}
          onSuccess={handleDocumentSuccess}
        />
      )}

      {editDocumentVisible && selectedDocument && (
        <EditDocumentModal
          visible={editDocumentVisible}
          setVisible={setEditDocumentVisible}
          document={selectedDocument}
          onSuccess={handleDocumentSuccess}
        />
      )}
    </>
  );
};

export default InstitutionDocuments;
