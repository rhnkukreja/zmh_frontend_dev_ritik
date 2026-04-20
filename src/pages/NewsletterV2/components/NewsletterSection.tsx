import React, { useEffect, useState } from "react";
import BriefCard, { Brief } from "./BriefCard";
import { newsletterService } from "@/services/newsletter";
import Lucide from "@/components/Base/Lucide";
import { baseURL } from "@/constant";
import { toast } from "react-toastify";
import AddNewsletterModal from "@/pages/Newsletter/components/AddNewsletterModal";
import PDFViewerModal from "@/pages/Newsletter/components/PDFViewerModal";
import DeleteConfirmationModal from "@/pages/Newsletter/components/DeleteConfirmationModal";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import PdfThumbnail from "@/pages/Newsletter/components/PdfThumbnail";

interface NewsletterSectionProps {
  category: string;
  title: string;
  refreshTrigger?: number;
}

const NewsletterSection: React.FC<NewsletterSectionProps> = ({
  category,
  title,
  refreshTrigger,
}) => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | undefined>();

  const { user } = useAppSelector((state: RootState) => state.authentiction);
  const canEditOrDelete =
    user?.user_type === "Admin" || user?.user_type === "Analyst";

  const fetchBriefs = async () => {
    setIsLoading(true);
    try {
      const data = await newsletterService.getNewsletterList({
        category: category,
      });

      const mappedBriefs: Brief[] = data.map((item: any) => {
        let pdfUrl = item.pdf_url || item.pdf_file || item.pdf_link || "#";
        let pdfThumb = item.pdf_file || pdfUrl;

        if (pdfUrl !== "#" && !pdfUrl.startsWith("http")) {
          const base = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
          const path = pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`;
          pdfUrl = `${base}${path}`;
        }

        if (pdfThumb !== "#" && !pdfThumb.startsWith("http")) {
          const base = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
          const path = pdfThumb.startsWith("/") ? pdfThumb : `/${pdfThumb}`;
          pdfThumb = `${base}${path}`;
        }

        return {
          id: item.id,
          title: title,
          date: `${
            typeof item.month === "object" ? item.month.label : item.month
          } ${item.year}`,
          url: pdfUrl,
          thumbnailUrl: pdfThumb,
          month: typeof item.month === "object" ? item.month.value : item.month,
          year: item.year?.toString(),
          category:
            typeof item.category === "object"
              ? item.category.value
              : item.category_name || item.category,
        };
      });

      mappedBriefs.sort((a, b) => {
        const yearA = parseInt(a.year || "0");
        const yearB = parseInt(b.year || "0");
        if (yearA !== yearB) return yearB - yearA;

        const monthA = new Date(`${a.month} 1, 2000`).getMonth();
        const monthB = new Date(`${b.month} 1, 2000`).getMonth();
        return monthB - monthA;
      });

      setBriefs(mappedBriefs);
    } catch (error) {
      console.error(`Error fetching ${title}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, [refreshTrigger, category]);

  const handleView = (brief: Brief) => {
    setSelectedBrief(brief);
    setIsViewModalOpen(true);
  };

  const handleEdit = (brief: Brief) => {
    if (!canEditOrDelete) return;
    setSelectedBrief(brief);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (brief: Brief) => {
    if (!canEditOrDelete) return;
    setSelectedBrief(brief);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!canEditOrDelete) return;
    if (!selectedBrief?.id) return;

    setIsDeleting(true);
    try {
      await newsletterService.deleteNewsletter(selectedBrief.id);
      toast.success("Document deleted successfully");
      setBriefs((prev) => prev.filter((b) => b.id !== selectedBrief.id));
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 pb-12 bg-white dark:bg-darkmode-600 border border-gray-200 dark:border-darkmode-400 rounded-xl shadow-sm overflow-hidden p-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 py-1 leading-none">
            {title}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/3 h-[400px] rounded-2xl bg-slate-100 dark:bg-darkmode-400 animate-pulse border border-slate-200 dark:border-darkmode-300" />
            <div className="w-full lg:w-2/3 h-[400px] rounded-2xl bg-slate-100 dark:bg-darkmode-400 animate-pulse border border-slate-200 dark:border-darkmode-300" />
          </div>
        ) : briefs.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              <div className="bg-white dark:bg-darkmode-600 rounded-lg">
                <PdfThumbnail
                  fileUrl={briefs[0].thumbnailUrl || briefs[0].url}
                  onClick={() => handleView(briefs[0])}
                />
                <div className="text-center mt-3 font-semibold text-lg text-slate-700 dark:text-slate-200">
                  {briefs[0].month} {briefs[0].year}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-2/3 flex flex-col gap-4">
              <div className="overflow-x-auto bg-white dark:bg-darkmode-600 border border-slate-200 dark:border-darkmode-400 rounded-lg shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-darkmode-800 border-b border-slate-200 dark:border-darkmode-400">
                      <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Month
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Year
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-right">
                        View
                      </th>
                      {canEditOrDelete && (
                        <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-right">
                          Manage
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {briefs.map((brief, idx) => (
                      <tr
                        key={brief.id || idx}
                        className="border-b border-slate-100 dark:border-darkmode-400/60 hover:bg-slate-50 dark:hover:bg-darkmode-800/50 transition-colors last:border-b-0"
                      >
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 break-words whitespace-normal max-w-[120px]">
                          {brief.month}
                        </td>
                        <td className="py-3 px-4 text-slate-500 break-words whitespace-normal max-w-[80px]">
                          {brief.year}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleView(brief)}
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium text-sm whitespace-nowrap"
                          >
                            <Lucide icon="FileText" className="w-4 h-4" />
                            <span className="hidden sm:inline">View Report</span>
                            <span className="sm:hidden">View</span>
                          </button>
                        </td>

                          {canEditOrDelete && (
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-3">
                              <button
                                onClick={() => handleEdit(brief)}
                                className="text-slate-400 hover:text-primary transition-colors p-1"
                                title="Edit"
                              >
                                <Lucide icon="Pencil" className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(brief)}
                                className="text-slate-400 hover:text-danger transition-colors p-1"
                                title="Delete"
                              >
                                <Lucide icon="Trash2" className="w-4 h-4" />
                              </button>
                              </div>
                            </td>
                          )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-darkmode-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-darkmode-400">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <Lucide icon="FileQuestion" className="w-10 h-10 text-primary opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">No documents found</h3>
            <p className="text-slate-400 text-sm mt-1">Upload a newsletter to see it here.</p>
          </div>
        )}
      </div>

      <AddNewsletterModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        editData={selectedBrief}
        onSuccess={fetchBriefs}
      />

      <PDFViewerModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        pdfUrl={selectedBrief?.url || ""}
        title={title || "Newsletter"}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        onConfirm={confirmDelete}
        title={`${selectedBrief?.month} ${selectedBrief?.year} document`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default NewsletterSection;
