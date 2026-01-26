import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import FormInput from "@/components/Base/Form/FormInput";
import { FormCheck } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import TomSelect from "@/components/Base/TomSelect";
import { axiosInstance } from "@/services";
import { InstitutionDocument } from "@/types/institutions";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { bytesToMB } from "@/utils/helper";
import Error from "@/components/Error";

interface EditDocumentFormData {
  document_name: string;
  document_type: string;
  month: string;
  year: string;
  tags: string;
  priority: string;
  active: boolean;
}

interface EditDocumentModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  document: InstitutionDocument | null;
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
const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

const EditDocumentModal = ({
  visible,
  setVisible,
  document,
  onSuccess,
}: EditDocumentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<any>(null);
  const [showRequiredDocError, setShowRequiredDocError] = useState<boolean>(false);
  const dropzoneRef = useRef<DropzoneElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditDocumentFormData>({
    defaultValues: {
      document_name: "",
      document_type: "",
      month: "",
      year: "",
      tags: "",
      priority: "Medium",
      active: true,
    },
  });

  useEffect(() => {
    if (document && visible) {
      reset({
        document_name: (document as any).document_name || document.name || "",
        document_type: document.document_type || "",
        month: "",
        year: document.year?.toString() || "",
        tags: document.tags || "",
        priority: document.priority || "Medium",
        active: document.active ?? true,
      });
      if (document.link) {
        setUploadedDocument({
          name: document.link.split('/').pop(),
          url: document.link,
        });
      }
    }
  }, [document, visible, reset]);

  useEffect(() => {
    const elDropzoneRef = dropzoneRef.current;

    if (elDropzoneRef) {
      const dropzoneInstance = elDropzoneRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["application/pdf", "pdf"].includes(fileType)) {
            toast.error("Only PDF files are allowed!");
          } else {
            setUploadedDocument(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          toast.error("Something went wrong!");
        }
      };

      dropzoneInstance.on("addedfile", handleComplete);

      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneRef.current, visible, uploadedDocument]);

  const onSubmit = async (data: EditDocumentFormData) => {
    if (!document) return;

    if (!uploadedDocument) {
      setShowRequiredDocError(true);
      return;
    } else {
      setShowRequiredDocError(false);
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("document_name", data.document_name);
      formData.append("document_type", data.document_type);
      formData.append("month", data.month);
      formData.append("year", data.year);
      formData.append("tags", data.tags);
      formData.append("priority", data.priority);
      formData.append("active", data.active.toString());
      
      if (!uploadedDocument?.url) {
        formData.append("document", uploadedDocument);
      }

      await axiosInstance.put(`/institute_documents/${document.id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Document updated successfully");
      handleClose();
      onSuccess?.();
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error?.message || "Failed to update document");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setUploadedDocument(null);
    setShowRequiredDocError(false);
    setVisible(false);
  };

  return (
    <Dialog open={visible} onClose={handleClose}>
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="mr-auto text-base font-medium">Edit Document</h2>
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
              <span className="text-red-500 text-sm mt-1 block">
                {errors.document_name.message}
              </span>
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
              <span className="text-red-500 text-sm mt-1 block">
                {errors.document_type.message}
              </span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Month
            </label>
            <Controller
              name="month"
              control={control}
              render={({ field }) => (
                <TomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={{ placeholder: "Select month" }}
                  className="w-full"
                >
                  <option value="">Select Month</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
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
                  <option value="">Select Year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </TomSelect>
              )}
            />
            {errors.year && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.year.message}
              </span>
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
              <span className="text-red-500 text-sm mt-1 block">
                {errors.priority.message}
              </span>
            )}
          </div>

          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">Tags</label>
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
            <span className="text-slate-400 text-xs mt-1 block">
              Separate multiple tags with commas
            </span>
          </div>

          <div className="col-span-12">
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormCheck className="mt-2">
                  <FormCheck.Input
                    id="active-checkbox"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <FormCheck.Label htmlFor="active-checkbox">
                    Active
                  </FormCheck.Label>
                </FormCheck>
              )}
            />
            <span className="text-slate-400 text-xs mt-1 block">
              Inactive documents will not be displayed in reports
            </span>
          </div>

          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">
              Document <span className="text-red-500">*</span>
            </label>
            <div className="w-full">
              {uploadedDocument ? (
                <>
                  <div className="flex items-center w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                    <div className="ml-4">
                      <Lucide
                        icon="FileText"
                        className="w-8 h-8 stroke-[1.7] stroke-slate-400/70"
                      />
                    </div>
                    <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                      <p className="block font-medium capitalize truncate md:max-w-[100px] sm:max-w-[80px] lg:max-w-[150px] text-ellipsis overflow-hidden whitespace-nowrap lg:text-center">
                        {uploadedDocument?.name}
                      </p>
                      {uploadedDocument?.size && (
                        <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                          File size: {bytesToMB(uploadedDocument.size)} MB
                        </div>
                      )}
                    </div>
                    <Lucide
                      onClick={() => {
                        setUploadedDocument(null);
                      }}
                      icon="Trash2"
                      className="w-6 h-6 stroke-[1.7] stroke-slate-400/70"
                    />
                  </div>
                </>
              ) : (
                <Dropzone
                  ref={dropzoneRef}
                  options={{
                    url: "/",
                    autoProcessQueue: false,
                    clickable: true,
                    thumbnailWidth: 100,
                    maxFilesize: 5000,
                    maxFiles: 1,
                    acceptedFiles: ".pdf",
                  }}
                  className="dropzone w-full flex flex-col justify-center items-center h-full"
                >
                  <div className="text-base font-semibold text-gray-800 mb-2">
                    Drop files here or click to upload.
                  </div>
                  Only <span className="font-medium">PDF</span> files are allowed.
                </Dropzone>
              )}
              {!uploadedDocument && showRequiredDocError && (
                <Error className="max-w-[100%] mt-1">
                  Document is required
                </Error>
              )}
            </div>
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
            {loading ? "Saving..." : "Save"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export { EditDocumentModal };
export default EditDocumentModal;
