import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";

import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";

import Error from "@/components/Error";
import { FolderData, NewFolder } from "@/types/notes";
import { addNewFolder } from "@/stores/notesSlice";
import { AddFolderForm } from "./components/AddFolder";

interface AddFoldersModalProps {
  addNotesModalVisible: boolean;
  setAddNotesModalVisible: (visible: boolean) => void;
  title: string;
  selectedFolder: FolderData | null;
  onClickCancel: () => void;
}

export const AddFoldersModal: React.FC<AddFoldersModalProps> = ({
  addNotesModalVisible,
  setAddNotesModalVisible,
  title,
  selectedFolder,
  onClickCancel,
}) => {
  return (
    <Dialog
      size="md"
      open={addNotesModalVisible}
      onClose={onClickCancel}
      staticBackdrop
    >
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-xl font-semibold">
            {selectedFolder ? "Update Folder" : title || "Add New Folder"}
          </h2>
          <div
            onClick={onClickCancel}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>

        <Dialog.Description className="px-6 py-4">
          <AddFolderForm
            selectedFolder={selectedFolder}
            setAddNotesModalVisible={setAddNotesModalVisible}
            onClickCancel={onClickCancel}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};
