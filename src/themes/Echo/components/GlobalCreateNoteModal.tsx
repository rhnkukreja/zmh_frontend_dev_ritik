import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import { useAppDispatch } from "@/stores/hooks";
import CreateAndSelectFolder from "./CreateAndSelectFolder";

interface GlobalCreateNoteModalProps {
  globalCreateNoteModalVisible: boolean;
  setGlobalCreateNoteModalVisible: Dispatch<SetStateAction<boolean>>;
}

const GlobalCreateNoteModal = ({
  globalCreateNoteModalVisible,
  setGlobalCreateNoteModalVisible,
}: GlobalCreateNoteModalProps) => {
  const dispatch = useAppDispatch();

  return (
    <Dialog
      size="md"
      open={globalCreateNoteModalVisible}
      onClose={() => setGlobalCreateNoteModalVisible(false)}
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-xl font-semibold">Select Folder</h2>
        </Dialog.Title>
        <Dialog.Description>
          <CreateAndSelectFolder />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default GlobalCreateNoteModal;
