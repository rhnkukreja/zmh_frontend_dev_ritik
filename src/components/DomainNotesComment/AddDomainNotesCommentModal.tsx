import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import NoteForm from "./AddEditNoteForm";
import { useAppDispatch } from "@/stores/hooks";
import { toast } from "react-toastify";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote, DomainNoteComment } from "@/types/domainNotes";
import { addDomainNoteComment } from "@/stores/domainNotesSlice";
import Lucide from "../Base/Lucide";

interface AddDomainNoteCommentProps {
  mode: "add" | "edit";
  addCommentModalVisible: boolean;
  setAddNoteCommentsModalVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  selectedNote?: DomainNote;
  fieldsToEdit?: Array<"comments">;
  data: CompanyDashboard;
  fetchData: () => Promise<void>
}

const AddDomainNoteCommentsModal = ({
  addCommentModalVisible,
  setAddNoteCommentsModalVisible,
  title,
  selectedNote,
  mode,
  fieldsToEdit,
  data,
  fetchData,
}: AddDomainNoteCommentProps) => {
  const dispatch = useAppDispatch();

  const handleNoteCommentsSubmit = async (data: DomainNoteComment) => {
    try {
      if (selectedNote?.id) {
        await dispatch(addDomainNoteComment({ id: selectedNote.id, data }));
        fetchData()
      }
    } catch (error) {
      toast.error("An error occurred while adding a comment");
    } finally {
      setAddNoteCommentsModalVisible(false);
    }
  };

  return (
    <Dialog
      size="lg"
      open={addCommentModalVisible}
      onClose={() => setAddNoteCommentsModalVisible(false)}
    >
      <Dialog.Panel>
        <Dialog.Title className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === "edit" ? "Edit comment" : "New comment"}
          </h2>
          <button
            onClick={() => setAddNoteCommentsModalVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition"
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>
        <Dialog.Description>
          <NoteForm
            mode={mode}
            initialData={selectedNote}
            onSubmit={handleNoteCommentsSubmit}
            setAddNoteCommentsModalVisible={setAddNoteCommentsModalVisible}
            fieldsToEdit={fieldsToEdit}
            data={data}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddDomainNoteCommentsModal;
