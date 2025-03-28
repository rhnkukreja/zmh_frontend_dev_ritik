import React, { SetStateAction, Dispatch } from "react";
import { useForm } from "react-hook-form";

import { Note } from "@/types/notes";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import FolderField from "./SelectFolders";
import NoteField from "./NoteEditor";
import NameField from "./CreateNoteName";

interface NoteFormProps {
  initialData: Partial<Note>;
  onSubmit: (data: Note) => void;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  mode: "add" | "edit";
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  isQuestionDialog
}

const NoteForm: React.FC<NoteFormProps> = ({
  initialData,
  onSubmit,
  setAddNoteModalVisible,
  mode,
  fieldsToEdit = ["name", "text", "folder"],
  isQuestionDialog
}) => {
  const { notesLoading, selectedFolder } = useAppSelector(
    (state) => state.notes
  );

  const { control, handleSubmit } = useForm<Note>({
    defaultValues: {
      name: initialData?.name || "",
      text: initialData?.text || "",
      folder: selectedFolder?.id,
    },
  });

  const fieldsToRender =
    mode === "add" ? ["name", "text", "folder"] : fieldsToEdit;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fieldsToRender.includes("name") && (
        <NameField
          control={control}
          rules={{ required: "Note Name is required" }}
          isQuestionDialog={isQuestionDialog}
        />
      )}
      {isQuestionDialog && (
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            type="text"
            placeholder="Enter date"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
      rounded-lg shadow-sm focus:ring focus:ring-blue-300 dark:bg-darkmode-600 
      dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      )}

      {fieldsToRender.includes("text") && (
        <NoteField
          control={control}
          rules={{ required: "Note Detail is required" }}
        />
      )}

      {fieldsToRender.includes("folder") && (
        <FolderField
          control={control}
          rules={{ required: "Folder Name is required" }}
          isQuestionDialog={isQuestionDialog}
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
