import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import NoteForm from "./AddEditNoteForm";
import { useAppDispatch } from "@/stores/hooks";
import { toast } from "react-toastify";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote } from "@/types/domainNotes";
import { addDomainNote } from "@/stores/domainNotesSlice";
import Lucide from "../Base/Lucide";

interface AddNoteModalProps {
  mode: "add" | "edit";
  addNoteModalVisible: boolean;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  selectedNote?: DomainNote;
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  data: CompanyDashboard;
  fetchData: () => Promise<void>
}

const AddDomainNoteModal = ({
  addNoteModalVisible,
  setAddNoteModalVisible,
  title,
  selectedNote,
  mode,
  fieldsToEdit,
  data,
  fetchData
}: AddNoteModalProps) => {
  const dispatch = useAppDispatch();

  const handleNoteSubmit = async (data: DomainNote) => {
    try {
      if (selectedNote?.id) {
        await dispatch(addDomainNote({ id: selectedNote.id, data }));
        fetchData()
      } else {
        const response = await dispatch(addDomainNote({ data })).unwrap();
        fetchData()
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
        <Dialog.Title className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === "edit" ? "Edit note" : "New note"}
          </h2>
          <button
            onClick={() => setAddNoteModalVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition"
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>
        <Dialog.Description>
          <NoteForm
            mode={mode}
            initialData={selectedNote || {}}
            onSubmit={handleNoteSubmit}
            setAddNoteModalVisible={setAddNoteModalVisible}
            fieldsToEdit={fieldsToEdit}
            data={data}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddDomainNoteModal;
