import React, { SetStateAction, Dispatch } from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import NoteField from "./NoteEditor";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote, DomainNoteComment } from "@/types/domainNotes";
import FormInput from "../Base/Form/FormInput";

interface NoteFormProps {
  initialData: Partial<DomainNote>;
  onSubmit: (data: DomainNoteComment) => void;
  setAddNoteCommentsModalVisible: Dispatch<SetStateAction<boolean>>;
  mode: "add" | "edit";
  fieldsToEdit?: Array<"comments">;
  data: CompanyDashboard
}

const NoteForm: React.FC<NoteFormProps> = ({
  initialData,
  onSubmit,
  setAddNoteCommentsModalVisible,
  mode,
  fieldsToEdit = ["comments"],
  data,
}) => {
  const { notesLoading } = useAppSelector(
    (state) => state.notes
  );

  const today = new Date().toISOString().split("T")[0];

  const { control, handleSubmit, reset } = useForm<DomainNoteComment>({
    defaultValues: mode === "add"
      ? {
        comments: "",
      }
      : {
        comments: initialData.comments || "",
      }
  });


  const fieldsToRender =
    mode === "add" ? ["comments"] : fieldsToEdit;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fieldsToRender.includes("comments") && (
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
            setAddNoteCommentsModalVisible(false);
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
