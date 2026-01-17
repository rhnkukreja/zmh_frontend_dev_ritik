import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import FormInput from "@/components/Base/Form/FormInput";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import TomSelect from "@/components/Base/TomSelect";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { bytesToMB } from "@/utils/helper";
import { axiosInstance } from "@/services";

interface DocumentFormData {
  document_name: string;
  document_type: string;
  month: string;
  year: string;
  tags: string;
  priority: string;
}

interface AddDocumentModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  institutionId: string | number;
  onSuccess?: () => void;
}

const documentTypes = [
  "Voting Guidelines",
  "Stewardship Report",
  "Engagement Details",
];

const priorityOptions = ["Low", "Medium", "High", "Extremely High"];

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

const AddDocumentModal = ({
  visible,
  setVisible,
  institutionId,
  onSuccess,
}: AddDocumentModalProps) => {
  const dropzoneRef = useRef<DropzoneElement>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    defaultValues: {
      document_name: "",
      document_type: "",
      month: currentMonth,
      year: currentYear.toString(),
      tags: "",
      priority: "Medium",
    },
  });

  useEffect(() => {
    const elDropzoneRef = dropzoneRef.current;

    if (elDropzoneRef) {
      const dropzoneInstance = elDropzoneRef.dropzone;

      const handleAddedFile = (file: File) => {
        setDocumentFile(file);
      };

      const handleRemovedFile = () => {
        setDocumentFile(null);
      };

      dropzoneInstance?.on("addedfile", handleAddedFile);
      dropzoneInstance?.on("removedfile", handleRemovedFile);

      return () => {
        dropzoneInstance?.off("addedfile", handleAddedFile);
        dropzoneInstance?.off("removedfile", handleRemovedFile);
      };
    }
  }, [visible]);

  const onSubmit = async (data: DocumentFormData) => {
    if (!documentFile) {
      toast.error("Please upload a document");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("institution_id", String(institutionId));
      formData.append("document_name", data.document_name);
      formData.append("document_type", data.document_type);
      formData.append("month", data.month);
      formData.append("year", data.year);
      formData.append("tags", data.tags);
      formData.append("priority", data.priority);
      formData.append("document", documentFile, documentFile.name);

      await axiosInstance.post("/institute_documents/", formData);

      toast.success("Document uploaded successfully");
      handleClose();
      onSuccess?.();
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error?.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setDocumentFile(null);
    if (dropzoneRef.current?.dropzone) {
      dropzoneRef.current.dropzone.removeAllFiles();
    }
    setVisible(false);
  };

  return (
    <Dialog open={visible} onClose={handleClose}>
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="mr-auto text-base font-medium">Add Document</h2>
          <button
            className="absolute top-0 right-0 mt-3 mr-3"
            onClick={handleClose}
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </button>
        </Dialog.Title>
        <Dialog.Description className="grid grid-cols-12 gap-4 gap-y-3">
          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">
              Document Name <span className="text-red-500">*</span>
            </label>
            <Controller
              name="document_name"
              control={control}
              rules={{ required: "Document name is required" }}
              render={({ field }) => (
                <FormInput
                  {...field}
                  type="text"
                  placeholder="Enter document name"
                />
              )}
            />
            {errors.document_name && (
              <span className="text-red-500 text-sm mt-1 block">{errors.document_name.message}</span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Document Type <span className="text-red-500">*</span>
            </label>
            <Controller
              name="document_type"
              control={control}
              rules={{ required: "Document type is required" }}
              render={({ field }) => (
                <TomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={{ placeholder: "Select document type" }}
                  className="w-full"
                >
                  <option value="">Select Type</option>
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
            {errors.document_type && (
              <span className="text-red-500 text-sm mt-1 block">{errors.document_type.message}</span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Month <span className="text-red-500">*</span>
            </label>
            <Controller
              name="month"
              control={control}
              rules={{ required: "Month is required" }}
              render={({ field }) => (
                <TomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={{ placeholder: "Select month" }}
                  className="w-full"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
            {errors.month && (
              <span className="text-red-500 text-sm mt-1 block">{errors.month.message}</span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Year <span className="text-red-500">*</span>
            </label>
            <Controller
              name="year"
              control={control}
              rules={{ required: "Year is required" }}
              render={({ field }) => (
                <TomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={{ placeholder: "Select year" }}
                  className="w-full"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
            {errors.year && (
              <span className="text-red-500 text-sm mt-1 block">{errors.year.message}</span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Priority <span className="text-red-500">*</span>
            </label>
            <Controller
              name="priority"
              control={control}
              rules={{ required: "Priority is required" }}
              render={({ field }) => (
                <TomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={{ placeholder: "Select priority" }}
                  className="w-full"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
            {errors.priority && (
              <span className="text-red-500 text-sm mt-1 block">{errors.priority.message}</span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Tags
            </label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <FormInput
                  {...field}
                  type="text"
                  placeholder="e.g., ESG, Sustainability, Annual"
                />
              )}
            />
            <span className="text-slate-400 text-xs mt-1 block">Separate multiple tags with commas</span>
          </div>

          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">
              Upload Document <span className="text-red-500">*</span>
            </label>
            <Dropzone
              ref={dropzoneRef}
              options={{
                url: "/",
                autoProcessQueue: false,
                maxFiles: 1,
                acceptedFiles: ".pdf,.doc,.docx,.xls,.xlsx",
                addRemoveLinks: true,
                maxFilesize: 10,
              }}
              className="dropzone"
            >
              <div className="text-lg font-medium">
                Drop file here or click to upload.
              </div>
              <div className="text-gray-600">
                Accepted formats: PDF, DOC, DOCX, XLS, XLSX (Max 10MB)
              </div>
            </Dropzone>
            {documentFile && (
              <div className="mt-2 text-sm text-slate-600">
                Selected: {documentFile.name} ({bytesToMB(documentFile.size)} MB)
              </div>
            )}
          </div>
        </Dialog.Description>
        <Dialog.Footer>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
            className="w-20 mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-20"
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export { AddDocumentModal };
export default AddDocumentModal;
