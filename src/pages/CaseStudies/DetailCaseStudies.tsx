import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleSingleCaseStudy } from "@/stores/caseStudySlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AddNewCaseStudies from "./Components/AddEditCaseStudies";
import { Dialog } from "@/components/Base/Headless";
import { caseStudiesService } from "@/services/caseStudies";
import { toast } from "react-toastify";
import Tippy from "@/components/Base/Tippy";

const DetailCaseStudies = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromTab: string | undefined = location.state?.fromTab;

  const { singleCaseStudy, loading } = useAppSelector(
    (state) => state.caseStudies
  );
  const { user } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
    dispatch(getSingleSingleCaseStudy(Number(params.id!)));
  }, [params.id]);

  const backToPreviousPage = () => {
    navigate(fromTab ? `/case-studies?tab=${fromTab}` : `/case-studies`);
  };

  const [editOpen, setEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    setEditOpen(true);
  };

  const handleDeleted = async () => {
    try {
      setIsDeleting(true);
      await caseStudiesService.deleteCaseStudy(Number(params.id!));
      toast.success("Case Study deleted successfully");
      setIsDeleteModalOpen(false);
      const path = fromTab ? `/case-studies?tab=${fromTab}` : `/case-studies`;
      navigate(path, { state: { refresh: true } });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Something went wrong!");
    } finally {
      setIsDeleting(false);
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
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
          <h1 className="font-semibold" style={{fontSize: '18px'}}>Case Studies</h1>
          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
            <div className="flex items-center gap-3">
              <Tippy content="Edit" options={{ theme: "light" }}>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                  <Lucide icon="PenLine" className="text-primary" onClick={handleEdit} />
                </div>
              </Tippy>
              <Tippy content="Delete" options={{ theme: "light" }}>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                  <Lucide icon="Trash2" className="text-danger" onClick={() => setIsDeleteModalOpen(true)} />
                </div>
              </Tippy>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {singleCaseStudy?.institution_name && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2" style={{fontSize: '14px'}}>
                    Institution
                  </h3>
                  <p>{singleCaseStudy?.institution_name}</p>
                </div>
              )}
              {(singleCaseStudy?.esg_themes && singleCaseStudy?.esg_themes !== 'N/A') && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Theme</h3>
                  <p>{singleCaseStudy?.esg_themes}</p>
                </div>
              )}
              {singleCaseStudy?.industry && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Industry</h3>
                  <p>{singleCaseStudy?.industry}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {singleCaseStudy?.company_name && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Company</h3>
                  <p>
                    {singleCaseStudy?.company_name ||
                      singleCaseStudy?.caspio_company_name}
                  </p>
                </div>
              )}
              {singleCaseStudy?.company_ticker && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Company Ticker
                  </h3>
                  <p>{singleCaseStudy?.company_ticker}</p>
                </div>
              )}
              {singleCaseStudy?.company_sector && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Company Sector
                  </h3>
                  <p>{singleCaseStudy?.company_sector}</p>
                </div>
              )}
              {singleCaseStudy?.year && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Year</h3>
                  <p>{singleCaseStudy?.year}</p>
                </div>
              )}
              {singleCaseStudy?.market && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Market</h3>
                  <p>{singleCaseStudy?.market}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {singleCaseStudy?.proposal_type && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Proponent
                  </h3>
                  <p>{singleCaseStudy?.proposal_type}</p>
                </div>
              )}
              {singleCaseStudy?.resolution_engagement_topic && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Resolution
                  </h3>
                  <p>{singleCaseStudy?.resolution_engagement_topic}</p>
                </div>
              )}
              {singleCaseStudy?.vote && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Vote</h3>
                  <p className="text-destructive">{singleCaseStudy?.vote}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1  gap-4">
              {singleCaseStudy?.engagement_details && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Engagement/Voting Details
                  </h3>
                  {singleCaseStudy.engagement_details.split('\n').map((paragraph, index) => (
                    // Only render the paragraph if it's not an empty string
                    paragraph.trim() !== '' && (
                      <p key={index} className="mb-3 text-justify">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1  gap-4">
              {singleCaseStudy?.voting_rationale && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">
                    Rationale
                  </h3>
                  <p className="whitespace-pre-line text-justify">{singleCaseStudy?.voting_rationale}</p>
                </div>
              )}
              {singleCaseStudy?.voting_details && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Details</h3>
                  <p className="whitespace-pre-line text-justify">{singleCaseStudy?.voting_details}</p>
                </div>
              )}
            </div>

            <div>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                {singleCaseStudy?.urls_def14 && (
                  <div>
                    <h3 className="font-semibold">Proxy Statement</h3>
                    <p className="mb-4">
                      <a
                        href={singleCaseStudy?.urls_def14}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy?.urls_def14}
                      </a>
                    </p>
                  </div>
                )}
                {singleCaseStudy?.urls_8k && (
                  <div>
                    <h3 className="font-semibold">Vote Report</h3>
                    <p className="mb-4">
                      <a
                        href={singleCaseStudy?.urls_8k}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy?.urls_8k}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* References Section */}
            {singleCaseStudy?.primary_source_link && 
             Array.isArray(singleCaseStudy.primary_source_link) && 
             singleCaseStudy.primary_source_link.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold min-w-[150px] mb-2">References</h3>
                <div className="space-y-2">
                  {singleCaseStudy.primary_source_link.map((link: string, index: number) => {
                    // Extract filename from URL
                    // Example: "https://.../.../33_US%20Voting%20Policy.pdf" -> "US Voting Policy"
                    const getDocumentName = (url: string) => {
                      try {
                        const parts = url.split('/');
                        const filename = parts[parts.length - 1];
                        // Decode URL encoding and remove file extension
                        const decoded = decodeURIComponent(filename);
                        // Remove number prefix (e.g., "33_") and file extension
                        const nameWithoutPrefix = decoded.replace(/^\d+_/, '');
                        const nameWithoutExt = nameWithoutPrefix.replace(/\.[^/.]+$/, '');
                        return nameWithoutExt;
                      } catch (error) {
                        return url;
                      }
                    };

                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Lucide icon="FileText" className="w-4 h-4 text-gray-500" />
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {getDocumentName(link)}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <AddNewCaseStudies
          addNewCaseStudyModalVisible={editOpen}
          setAddNewCaseStudyModalVisible={setEditOpen}
          selectedCaseStudies={singleCaseStudy}
          onAfterSave={() => {
            dispatch(getSingleSingleCaseStudy(Number(params.id!)));
          }}
        />
      )}

      {isDeleteModalOpen && (
        <Dialog
          size="md"
          open={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
          }}
        >
          <Dialog.Panel className="p-0 text-center">
            <div className="p-5 text-center">
              <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
              <div className="mt-5 text-3xl">Are you sure?</div>
              <div className="mt-2 text-slate-500">
                Do you really want to delete this case study? <br />
                This action cannot be undone.
              </div>
            </div>
            <div className="px-5 pb-8 text-center">
              <Button
                variant="outline-secondary"
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                }}
                className="w-24 mr-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                className="w-24"
                onClick={handleDeleted}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </>
  );
};

export default DetailCaseStudies;
