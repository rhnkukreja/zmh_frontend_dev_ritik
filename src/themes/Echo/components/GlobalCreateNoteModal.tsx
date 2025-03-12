import { Dispatch, SetStateAction, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
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
  const [noteTitle, setNoteTitle] = useState<string>("Create Note");

  return (
    <Dialog
      size="md"
      open={globalCreateNoteModalVisible}
      onClose={() => setGlobalCreateNoteModalVisible(false)}
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-xl font-semibold">{noteTitle}</h2>
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
            setGlobalCreateNoteModalVisible={setGlobalCreateNoteModalVisible}
            setNoteTitle={setNoteTitle}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default GlobalCreateNoteModal;
