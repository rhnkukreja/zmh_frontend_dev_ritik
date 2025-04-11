import React, { SetStateAction, Dispatch } from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import NoteField from "./NoteEditor";
import NameField from "./CreateNoteName";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote } from "@/types/domainNotes";
import DateField from "./CreateDate";
import CategoryField from "./CreateCategory";
import FormInput from "../Base/Form/FormInput";

interface NoteFormProps {
  initialData: Partial<DomainNote>;
  onSubmit: (data: DomainNote) => void;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  mode: "add" | "edit";
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  data: CompanyDashboard
}

const NoteForm: React.FC<NoteFormProps> = ({
  initialData,
  onSubmit,
  setAddNoteModalVisible,
  mode,
  fieldsToEdit = ["attendees", "notes", "date", "category"],
  data
}) => {
  const { notesLoading } = useAppSelector(
    (state) => state.notes
  );

  const today = new Date().toISOString().split("T")[0];

  const { control, handleSubmit, reset } = useForm<DomainNote>({
    defaultValues: mode === "add"
      ? {
        attendees: "",
        notes: "",
        date: today,
        category: "Shareholder Engagement",
        company: data?.company_id || 0,
        institution: data?.institution_id || null,
        investor_name: data?.institution_name || ""
      }
      : {
        attendees: initialData?.attendees || "",
        notes: initialData?.notes || "",
        date: initialData?.date || today,
        category: initialData?.category || "",
        company: data?.company_id || 0,
        institution: data?.institution_id || null,
        investor_name: data?.institution_name || ""
      }
  });


  const fieldsToRender =
    mode === "add" ? ["attendees", "notes", "date", "category"] : fieldsToEdit;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="w-full md:w-[47%]">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Company
          </label>
          <FormInput
            value={data?.company_name}
            disabled
            className="w-full"
          />
        </div>
        <div className="w-full md:w-[47%]">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Institution
          </label>
          <FormInput
            value={data?.institution_name}
            disabled
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {fieldsToRender.includes("category") && (
          <div className="w-full md:w-[47%]">
            <CategoryField
              control={control}
              rules={{ required: "Category is required" }}
            />
          </div>
        )}
        {fieldsToRender.includes("date") && (
          <div className="w-full md:w-[47%]">
            <DateField
              control={control}
              rules={{ required: "Date is required" }}
            />
          </div>
        )}
      </div>
      {fieldsToRender.includes("attendees") && (
        <NameField
          control={control}
          rules={{ required: "Attendees is required" }}
        />
      )}

      {fieldsToRender.includes("notes") && (
        <NoteField
          control={control}
          rules={{ required: "Note Detail is required" }}
        />
      )}
      <div className="w-full flex justify-end">
        <Button
          type="button"
          variant="outline-secondary"
          onClick={() => {
            reset();
            setAddNoteModalVisible(false);
          }}
          className="w-20 mr-3"
        >
          Cancel
        </Button>

        <Button variant="primary" type="submit">
          {notesLoading && (
            <Lucide
              icon="Loader"
              className={`w-4 h-4 mr-1.5 stroke-[1.3] ${notesLoading ? "animate-spin" : ""
                }`}
            />
          )}
          {"Save"}
        </Button>
      </div>
    </form>
  );
};

export default NoteForm;
