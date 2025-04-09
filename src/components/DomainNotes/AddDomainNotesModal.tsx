import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import NoteForm from "./AddEditNoteForm";
import { useAppDispatch } from "@/stores/hooks";
import { toast } from "react-toastify";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote } from "@/types/domainNotes";
import { addDomainNote } from "@/stores/domainNotesSlice";

interface AddNoteModalProps {
  mode: "add" | "edit";
  addNoteModalVisible: boolean;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  selectedNote?: DomainNote;
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  data: CompanyDashboard
}

const AddDomainNoteModal = ({
  addNoteModalVisible,
  setAddNoteModalVisible,
  title,
  selectedNote,
  mode,
  fieldsToEdit,
  data
}: AddNoteModalProps) => {
  const dispatch = useAppDispatch();

  const handleNoteSubmit = async (data: DomainNote) => {
    try {
      if (selectedNote?.id) {
        await dispatch(addDomainNote({ id: selectedNote.id, data }));
      } else {
        const response = await dispatch(addDomainNote({ data })).unwrap();
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
          <h2 className="text-xl font-semibold">{data.institution_name} (Create new note)</h2>
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
