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
  const dispatch = useAppDispatch();

  const { control, handleSubmit, setValue } = useForm<NewFolder>({
    defaultValues: {
      folder: selectedFolder?.folder || "",
    },
  });
  const { loading } = useAppSelector((state) => state.notes);

  const onSubmit = async (data: NewFolder) => {
    try {
      if (selectedFolder?.id) {
        const response = await dispatch(
          addNewFolder({
            id: selectedFolder.id,
            data: data,
          })
        ).unwrap();

        if (response?.results.id) {
          toast.success("Folder updated successfully");
        }
      } else {
        const response = await dispatch(
          addNewFolder({
            data: data,
          })
        ).unwrap();

        if (response?.results?.id) {
          toast.success("Folder created successfully");
        }
      }
    } catch (error) {
      toast.error("An error occurred while saving the folder");
    } finally {
      setAddNotesModalVisible(false);
    }
  };

  useEffect(() => {
    if (selectedFolder) {
      setValue("folder", selectedFolder.folder);
    }
  }, [selectedFolder]);

  return (
    <Dialog
      size="md"
      open={addNotesModalVisible}
      onClose={() => setAddNotesModalVisible(false)}
      staticBackdrop
    >
      <Dialog.Panel>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">
              {selectedFolder ? "Update Folder" : title || "Add New Folder"}
            </h2>
            <div
              onClick={() => setAddNotesModalVisible(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-8">
              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
                  Folder Name
                </FormCheck.Label>
                <Controller
                  name="folder"
                  control={control}
                  rules={{ required: "Folder Name is required" }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <FormInput placeholder="Enter Folder Name" {...field} />
                      {error && (
                        <Error className="text-red-600 ">{error.message}</Error>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={onClickCancel}
              className="w-20 mr-3"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {loading && (
                <Lucide
                  icon="Loader"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              )}

              {"Save"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};
