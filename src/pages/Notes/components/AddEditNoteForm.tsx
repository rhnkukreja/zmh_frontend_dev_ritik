import React, { SetStateAction, Dispatch } from "react";
import { useForm, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Error from "@/components/Error";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import { Note } from "@/types/notes";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";

interface NoteFormProps {
  initialData: Partial<Note>;
  onSubmit: (data: Note) => void;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  mode: "add" | "edit";
  fieldsToEdit?: Array<"name" | "text" | "folder">;
}

const NoteForm: React.FC<NoteFormProps> = ({
  initialData,
  onSubmit,
  setAddNoteModalVisible,
  mode,
  fieldsToEdit = ["name", "text", "folder"],
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
        <div>
          <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
            Note Name
          </FormCheck.Label>
          <Controller
            name="name"
            control={control}
            rules={{ required: "Note Name is required" }}
            render={({ field, fieldState: { error } }) => (
              <>
                <FormInput placeholder="Enter Note Name" {...field} />
                {error && (
                  <Error className="text-red-600">{error.message}</Error>
                )}
              </>
            )}
          />
        </div>
      )}

      {fieldsToRender.includes("text") && (
        <div>
          <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left !ml-0">
            Note
          </FormCheck.Label>
          <Controller
            name="text"
            control={control}
            rules={{ required: "Note Detail is required" }}
            render={({ field, fieldState: { error } }) => (
              <>
                <ClassicEditor
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event);
                  }}
                />
                {error && (
                  <Error className="text-red-600">{error.message}</Error>
                )}
              </>
            )}
          />
        </div>
      )}

      {fieldsToRender.includes("folder") && (
        <div>
          <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
            Folder
          </FormCheck.Label>
          <Controller
            name="folder"
            control={control}
            rules={{ required: "Folder Name is required" }}
            render={({ field, fieldState: { error } }) => (
              <>
                <TomSelectServer
                  url="/user/folder/"
                  valueKey="id"
                  labelKey="folder"
                  value={field?.value?.toString() || ""}
                  onChange={(value) => field.onChange(value)}
                  options={{ placeholder: "Select Folder" }}
                  className="w-full"
                />
                {error && (
                  <Error className="text-red-600 mt-2">{error.message}</Error>
                )}
              </>
            )}
          />
        </div>
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
              className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                notesLoading ? "animate-spin" : ""
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
