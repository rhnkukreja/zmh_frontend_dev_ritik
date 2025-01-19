import { Dispatch, SetStateAction } from "react";
import { Dialog } from "@/components/Base/Headless";
import { useAppDispatch } from "@/stores/hooks";
import CreateAndSelectFolder from "./CreateAndSelectFolder";
import Lucide from "@/components/Base/Lucide";

interface GlobalCreateNoteModalProps {
  globalCreateNoteModalVisible: boolean;
  setGlobalCreateNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  selectedText: string;
}

const GlobalCreateNoteModal = ({
  globalCreateNoteModalVisible,
  setGlobalCreateNoteModalVisible,
  selectedText,
}: GlobalCreateNoteModalProps) => {
  console.log({ selectedText });
  return (
    <Dialog
      size="md"
      open={globalCreateNoteModalVisible}
      onClose={() => setGlobalCreateNoteModalVisible(false)}
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-xl font-semibold">Create Note</h2>
          <div
            onClick={() => setGlobalCreateNoteModalVisible(false)}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>
        <Dialog.Description>
          <CreateAndSelectFolder
            selectedText={selectedText}
            globalCreateNoteModalVisible={globalCreateNoteModalVisible}
            setGlobalCreateNoteModalVisible={setGlobalCreateNoteModalVisible}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default GlobalCreateNoteModal;
