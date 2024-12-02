import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import NoteForm from "./components/AddEditNoteForm";
import { useAppDispatch } from "@/stores/hooks";
import { addNote, fetchSingleFolder } from "@/stores/notesSlice";
import { toast } from "react-toastify";
import { Note } from "@/types/notes";

interface AddNoteModalProps {
  mode: "add" | "edit";
  addNoteModalVisible: boolean;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  selectedNote?: Note;
  fieldsToEdit?: Array<"name" | "text" | "folder">;
}

const AddNoteModal = ({
  addNoteModalVisible,
  setAddNoteModalVisible,
  title,
  selectedNote,
  mode,
  fieldsToEdit,
}: AddNoteModalProps) => {
  const dispatch = useAppDispatch();

  const handleNoteSubmit = async (data: Note) => {
    try {
      // if (selectedNote?.id) {
      //   const response = await dispatch(
      //     addNote({ id: selectedNote.id, data })
      //   ).unwrap();
      //   if (response?.results?.id) {
      //     toast.success("Note updated successfully");
      //   }
      // } else {
      // }

      const response = await dispatch(addNote({ data })).unwrap();
      if (response?.results?.id) {
        toast.success("Note created successfully");
        dispatch(fetchSingleFolder(response?.results?.folder));
      }
    } catch (error) {
      toast.error("An error occurred while saving the note");
    } finally {
      setAddNoteModalVisible(false);
    }
  };

  return (
    <Dialog
      size="lg"
      open={addNoteModalVisible}
      onClose={() => setAddNoteModalVisible(false)}
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-xl font-semibold">{title}</h2>
        </Dialog.Title>
        <Dialog.Description>
          <NoteForm
            mode={mode}
            initialData={selectedNote || {}}
            onSubmit={handleNoteSubmit}
            setAddNoteModalVisible={setAddNoteModalVisible}
            fieldsToEdit={fieldsToEdit}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddNoteModal;
