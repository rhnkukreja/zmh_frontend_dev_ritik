import { useEffect, useRef, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import TomSelect from "@/components/Base/TomSelect";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { bytesToMB } from "@/utils/helper";
import { axiosInstance } from "@/services";
import { FormCheck } from "@/components/Base/Form";
import { baseURL } from "@/constant";
import AsyncSelect from "react-select/async";
import _ from "lodash";

interface EngagementDetailsFormData {
  institution_id: string;
  year: string;
  month: string;
  delete_previous: boolean;
  document_name: string;
}

interface Institution {
  id: number;
  institution: string;
}

interface InstitutionOption {
  value: number;
  label: string;
}

interface AddEngagementDetailsModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  onSuccess?: () => void;
}

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
const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

const AddEngagementDetailsModal = ({
  visible,
  setVisible,
  onSuccess,
}: AddEngagementDetailsModalProps) => {
  const dropzoneRef = useRef<DropzoneElement>(null);
  const documentDropzoneRef = useRef<DropzoneElement>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionOption | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EngagementDetailsFormData>({
    defaultValues: {
      institution_id: "",
      year: currentYear.toString(),
      month: currentMonth,
      delete_previous: false,
      document_name: "",
    },
  });

  const deletePrevious = watch("delete_previous");

  // Fetch institutions based on search query (same API as Institution page)
  const fetchInstitutionOptions = async (inputValue: string): Promise<InstitutionOption[]> => {
    try {
      const response = await axiosInstance.get(
        `${baseURL}/institute/?institution_name=${inputValue}&all=true`
      );
      // API returns array directly when all=true, otherwise it's in results
      const institutions = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.results || []);
      return institutions.map((inst: Institution) => ({
        value: inst.id,
        label: inst.institution,
      }));
    } catch (error) {
      console.error("Failed to fetch institutions:", error);
      return [];
    }
  };

  // Debounced load options for AsyncSelect
  const loadOptions = useCallback(
    _.debounce(
      (inputValue: string, callback: (options: InstitutionOption[]) => void) => {
        fetchInstitutionOptions(inputValue).then((options) => {
          callback(options);
        });
      },
      300
    ),
    []
  );

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

  // Document upload dropzone handlers
  useEffect(() => {
    const elDocumentDropzoneRef = documentDropzoneRef.current;

    if (elDocumentDropzoneRef) {
      const dropzoneInstance = elDocumentDropzoneRef.dropzone;

      const handleAddedFile = (file: File) => {
        setUploadedDocument(file);
      };

      const handleRemovedFile = () => {
        setUploadedDocument(null);
      };

      dropzoneInstance?.on("addedfile", handleAddedFile);
      dropzoneInstance?.on("removedfile", handleRemovedFile);

      return () => {
        dropzoneInstance?.off("addedfile", handleAddedFile);
        dropzoneInstance?.off("removedfile", handleRemovedFile);
      };
    }
  }, [visible]);

  const onSubmit = async (data: EngagementDetailsFormData) => {
    if (!documentFile) {
      toast.error("Please upload an Excel file");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("institution_id", data.institution_id);
      formData.append("year", data.year);
      formData.append("month", data.month);
      formData.append("delete_previous", data.delete_previous ? "true" : "false");
      formData.append("file", documentFile, documentFile.name);
      
      // Add document and document_name if provided
      if (data.document_name) {
        formData.append("document_name", data.document_name);
      }
      if (uploadedDocument) {
        formData.append("document", uploadedDocument, uploadedDocument.name);
      }

      await axiosInstance.post("/peer_analysis_excel_upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Engagement details uploaded successfully");
      handleClose();
      onSuccess?.();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error?.response?.data?.message || error?.message || "Failed to upload engagement details");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setDocumentFile(null);
    setUploadedDocument(null);
    setSelectedInstitution(null);
    if (dropzoneRef.current?.dropzone) {
      dropzoneRef.current.dropzone.removeAllFiles();
    }
    if (documentDropzoneRef.current?.dropzone) {
      documentDropzoneRef.current.dropzone.removeAllFiles();
    }
    setVisible(false);
  };

  return (
    <Dialog open={visible} onClose={handleClose}>
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="mr-auto text-base font-medium">Add Engagement Details</h2>
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
              Institution <span className="text-red-500">*</span>
            </label>
            <Controller
              name="institution_id"
              control={control}
              rules={{ required: "Institution is required" }}
              render={({ field }) => (
                <AsyncSelect
                  value={selectedInstitution}
                  onChange={(option: InstitutionOption | null) => {
                    setSelectedInstitution(option);
                    field.onChange(option?.value?.toString() || "");
                  }}
                  loadOptions={loadOptions}
                  placeholder="Search Institution..."
                  isClearable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  noOptionsMessage={({ inputValue }) =>
                    inputValue ? "No institutions found" : "Type to search institutions"
                  }
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "38px",
                      borderColor: "#e2e8f0",
                      "&:hover": {
                        borderColor: "#cbd5e1",
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                />
              )}
            />
            {errors.institution_id && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.institution_id.message}
              </span>
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
              <span className="text-red-500 text-sm mt-1 block">
                {errors.month.message}
              </span>
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
              <span className="text-red-500 text-sm mt-1 block">
                {errors.year.message}
              </span>
            )}
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-2 text-sm font-medium">
              Delete Previous Data <span className="text-red-500">*</span>
            </label>
            <Controller
              name="delete_previous"
              control={control}
              render={({ field }) => (
                <div className="flex gap-6">
                  <FormCheck>
                    <FormCheck.Input
                      id="delete-previous-yes"
                      type="radio"
                      name="delete_previous"
                      checked={field.value === true}
                      onChange={() => field.onChange(true)}
                    />
                    <FormCheck.Label htmlFor="delete-previous-yes" className="ml-2">
                      Yes
                    </FormCheck.Label>
                  </FormCheck>
                  <FormCheck>
                    <FormCheck.Input
                      id="delete-previous-no"
                      type="radio"
                      name="delete_previous"
                      checked={field.value === false}
                      onChange={() => field.onChange(false)}
                    />
                    <FormCheck.Label htmlFor="delete-previous-no" className="ml-2">
                      No
                    </FormCheck.Label>
                  </FormCheck>
                </div>
              )}
            />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="block mb-1 text-sm font-medium">
              Document Name
            </label>
            <Controller
              name="document_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter document name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              )}
            />
          </div>

          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">
              Upload Document
            </label>
            <Dropzone
              ref={documentDropzoneRef}
              options={{
                url: "/",
                autoProcessQueue: false,
                maxFiles: 1,
                acceptedFiles: ".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx",
                addRemoveLinks: true,
                maxFilesize: 10,
              }}
              className="dropzone"
            >
              <div className="text-lg font-medium">
                Drop document here or click to upload.
              </div>
              <div className="text-gray-600">
                Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (Max 10MB)
              </div>
            </Dropzone>
            {uploadedDocument && (
              <div className="mt-2 text-sm text-slate-600">
                Selected: {uploadedDocument.name} ({bytesToMB(uploadedDocument.size)} MB)
              </div>
            )}
          </div>

          <div className="col-span-12">
            <label className="block mb-1 text-sm font-medium">
              Upload Excel File <span className="text-red-500">*</span>
            </label>
            <Dropzone
              ref={dropzoneRef}
              options={{
                url: "/",
                autoProcessQueue: false,
                maxFiles: 1,
                acceptedFiles: ".xlsx",
                addRemoveLinks: true,
                maxFilesize: 10,
              }}
              className="dropzone"
            >
              <div className="text-lg font-medium">
                Drop file here or click to upload.
              </div>
              <div className="text-gray-600">
                Accepted format: XLSX only (Max 10MB)
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

export { AddEngagementDetailsModal };
export default AddEngagementDetailsModal;
