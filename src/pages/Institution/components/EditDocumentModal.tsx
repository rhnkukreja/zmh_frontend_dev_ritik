import { useEffect, useState } from "react";
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

interface EditDocumentFormData {
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

const priorityOptions = ["Low", "Medium", "High", "Extremely High"];

const EditDocumentModal = ({
  visible,
  setVisible,
  document,
  onSuccess,
}: EditDocumentModalProps) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditDocumentFormData>({
    defaultValues: {
      tags: "",
      priority: "Medium",
      active: true,
    },
  });

  useEffect(() => {
    if (document && visible) {
      reset({
        tags: document.tags || "",
        priority: document.priority || "Medium",
        active: document.active ?? true,
      });
    }
  }, [document, visible, reset]);

  const onSubmit = async (data: EditDocumentFormData) => {
    if (!document) return;

    setLoading(true);

    try {
      await axiosInstance.put(`/institute_documents/${document.id}/`, {
        tags: data.tags,
        priority: data.priority,
        active: data.active,
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
            <label className="block mb-1 text-sm font-medium text-slate-500">
              Document Name
            </label>
            <p className="text-slate-700 font-medium">{document?.name}</p>
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

          <div className="col-span-12 sm:col-span-6">
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
