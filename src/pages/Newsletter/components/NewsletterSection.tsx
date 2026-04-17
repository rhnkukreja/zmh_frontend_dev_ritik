import React, { useEffect, useState } from "react";
import BriefCard, { Brief } from "./BriefCard";
import { newsletterService } from "@/services/newsletter";
import Lucide from "@/components/Base/Lucide";
import { baseURL } from "@/constant";
import { toast } from "react-toastify";
import AddNewsletterModal from "./AddNewsletterModal";
import PDFViewerModal from "./PDFViewerModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface NewsletterSectionProps {
  category: string;
  title: string;
  refreshTrigger?: number;
}

const NewsletterSection: React.FC<NewsletterSectionProps> = ({ 
  category, 
  title, 
  refreshTrigger 
}) => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | undefined>();
  
  const fetchBriefs = async () => {
    setIsLoading(true);
    try {
      const data = await newsletterService.getNewsletterList({
        category: category,
      });

      // Map API response to Brief interface
      const mappedBriefs: Brief[] = data.map((item: any) => {
        let pdfUrl = item.pdf_url || item.pdf_file || item.pdf_link || "#";
        
        if (pdfUrl !== "#" && !pdfUrl.startsWith('http')) {
          const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
          const path = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
          pdfUrl = `${base}${path}`;
        }

        return {
          id: item.id,
          title: title, // Show tab name instead of doc title
          date: `${typeof item.month === 'object' ? item.month.label : item.month} ${item.year}`,
          url: pdfUrl,
          month: typeof item.month === 'object' ? item.month.value : item.month,
          year: item.year?.toString(),
          category: typeof item.category === 'object' ? item.category.value : (item.category_name || item.category),
        };
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
    setSelectedBrief(brief);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (brief: Brief) => {
    setSelectedBrief(brief);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-slate-100 dark:bg-darkmode-400 animate-pulse border border-slate-200 dark:border-darkmode-300" />
            ))}
          </div>
        ) : briefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
             {briefs.map((brief, idx) => (
               <BriefCard
                 key={brief.id || idx}
                 brief={brief}
                 onDelete={() => handleDeleteClick(brief)}
                 onEdit={handleEdit}
                 onView={handleView}
               />
             ))}
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
