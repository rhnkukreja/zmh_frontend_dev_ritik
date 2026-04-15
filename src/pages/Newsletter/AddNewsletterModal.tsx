import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import { FormLabel } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import TomSelect from "@/components/Base/TomSelect";
import { newsletterService } from "@/services/newsletter";
import { toast } from "react-toastify";
import { Brief } from "./BriefCard";

interface AddNewsletterModalProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  editData?: Brief;
  onSuccess?: () => void;
  defaultCategory?: string;
}

const AddNewsletterModal = ({
  isOpen,
  setIsOpen,
  editData,
  onSuccess,
  defaultCategory,
}: AddNewsletterModalProps) => {
  const [formData, setFormData] = useState({
    type: "",
    month: "",
    year: "",
    file: null as File | null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<{ value: string; label: string }[]>([]);
  const [dynamicMonths, setDynamicMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [categories, months] = await Promise.all([
          newsletterService.getCategories(),
          newsletterService.getMonths(),
        ]);
        setDynamicCategories(categories);
        setDynamicMonths(months);
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // Initialize form when modal opens or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          type: editData.category || "",
          month: editData.month || "",
          year: editData.year || "2024",
          file: null,
        });
      } else {
        setFormData({
          type: defaultCategory || dynamicCategories[0]?.value || "",
          month: dynamicMonths[0]?.value || "",
          year: "2024",
          file: null,
        });
      }
    }
  }, [isOpen, editData, dynamicCategories, dynamicMonths, defaultCategory]);

  const handleSubmit = async () => {
    // File is optional in Edit mode
    const isEdit = !!editData;
    if (!formData.type || !formData.month || !formData.year || (!isEdit && !formData.file)) {
      toast.error("Please fill all fields and upload a document.");
      return;
    }

    setIsLoading(true);
    try {
      const data = new FormData();
      data.append("year", formData.year);
      data.append("month", formData.month);
      data.append("category", formData.type);
      
      if (formData.file) {
        data.append("pdf_file", formData.file);
      }

      if (isEdit) {
        await newsletterService.updateNewsletter(editData.id!, data);
        toast.success("Document updated successfully!");
      } else {
        await newsletterService.addNewsletter(data);
        toast.success("Document added successfully!");
      }
      
      onSuccess && onSuccess();
      setFormData({
        type: "",
        month: "",
        year: "",
        file: null,
      });
      setIsOpen(false);
    } catch (error) {
       console.error("Error uploading document:", error);
       // Error toast is handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());

  return (
    <Dialog size="lg" open={isOpen} onClose={() => setIsOpen(false)}>
      <Dialog.Panel>
        <Dialog.Title className="flex justify-between items-center px-6 py-4 border-b border-slate-200/60 dark:border-darkmode-400">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {editData ? "Edit Document" : "Add New Document"}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition duration-200"
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>
        <Dialog.Description className="p-6">
          <div className="flex flex-col gap-6 font-medium">
            <div>
              <FormLabel
                htmlFor="doc-type"
                className="text-sm font-semibold mb-2 block"
              >
                Document Type
              </FormLabel>
              <TomSelect
                id="doc-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full"
                options={{
                  placeholder: "Select Document Type",
                }}
              >
                {(Array.isArray(dynamicCategories) ? dynamicCategories : []).map((cat, idx) => (
                  <option key={cat?.value || idx} value={cat?.value || ""}>
                    {typeof cat?.label === 'string' ? cat.label : String(cat?.label || cat || "")}
                  </option>
                ))}
              </TomSelect>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <FormLabel
                  htmlFor="doc-month"
                  className="text-sm font-semibold mb-2 block"
                >
                  Month
                </FormLabel>
                <TomSelect
                  id="doc-month"
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({ ...formData, month: e.target.value })
                  }
                  className="w-full"
                  options={{
                    placeholder: "Select Month",
                  }}
                >
                    {(Array.isArray(dynamicMonths) ? dynamicMonths : []).map((m, idx) => (
                    <option key={m?.value || idx} value={m?.value || ""}>
                      {typeof m?.label === 'string' ? m.label : String(m?.label || m || "")}
                    </option>
                  ))}
                </TomSelect>
              </div>
              <div>
                <FormLabel
                  htmlFor="doc-year"
                  className="text-sm font-semibold mb-2 block"
                >
                  Year
                </FormLabel>
                <TomSelect
                  id="doc-year"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="w-full"
                  options={{
                    placeholder: "Select Year",
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </TomSelect>
              </div>
            </div>

            <div>
              <FormLabel
                htmlFor="doc-file"
                className="text-sm font-semibold mb-2 block"
              >
                Upload Document (PDF)
              </FormLabel>
              <div className="mt-2 flex justify-center px-6 pt-10 pb-10 border-2 border-gray-300 dark:border-darkmode-400 border-dashed rounded-2xl hover:border-primary transition-all duration-300 cursor-pointer bg-slate-50/50 dark:bg-darkmode-800/50 group relative">
                <input
                  id="doc-file"
                  name="doc-file"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      file: e.target.files?.[0] || null,
                    })
                  }
                />
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-110">
                    <Lucide
                      icon="UploadCloud"
                      className="h-8 w-8 text-primary opacity-60 group-hover:opacity-100"
                    />
                  </div>
                  <div className="flex flex-col text-sm text-gray-600 dark:text-slate-400">
                    <span className="font-bold text-primary mb-1">
                      Click to upload or drag and drop
                    </span>
                    <span>PDF (max. 10MB)</span>
                  </div>
                  {formData.file && (
                    <div className="mt-4 flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold animate-fade-in transition-all">
                      <Lucide icon="FileCheck" className="w-4 h-4" />
                      {formData.file.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10">
            <Button
              variant="outline-secondary"
              onClick={() => setIsOpen(false)}
              className="px-8 rounded-xl"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="px-8 rounded-xl shadow-lg shadow-primary/20 transform hover:scale-105 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Lucide icon="Loader2" className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Document"
              )}
            </Button>
          </div>
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddNewsletterModal;
