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

  const { control, handleSubmit } = useForm<DomainNote>({
    defaultValues: {
      attendees: initialData?.attendees || "",
      notes: initialData?.notes || "",
      date: initialData?.date || "",
      category: initialData?.category || "",
      company: data?.company_id || 0,
      institution: data?.institution_id || null,
      investor_name: data?.institution_name || ""
    },
  });

  const fieldsToRender =
    mode === "add" ? ["attendees", "notes", "date", "category"] : fieldsToEdit;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      {fieldsToRender.includes("date") && (
        <DateField
          control={control}
          rules={{ required: "Date is required" }}
        />
      )}
      {fieldsToRender.includes("category") && (
        <CategoryField
          control={control}
          rules={{ required: "Category is required" }}
        />
      )}
      <div className="w-full flex justify-end">
        <Button
          type="button"
          variant="outline-secondary"
          onClick={() => setAddNoteModalVisible(false)}
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
