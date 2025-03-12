import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Lucide from "@/components/Base/Lucide";
import Error from "@/components/Error";
import { FolderData, NewFolder } from "@/types/notes";
import { addNewFolder } from "@/stores/notesSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

interface AddFolderFormProps {
  setAddNotesModalVisible?: (visible: boolean) => void;
  selectedFolder: FolderData | null;
  onClickCancel: () => void;
  onSuccess?: (data: any) => void;
}

export const AddFolderForm: React.FC<AddFolderFormProps> = ({
  selectedFolder,
  setAddNotesModalVisible,
  onClickCancel,
  onSuccess,
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
      let response: any;
      if (selectedFolder?.id) {
        response = await dispatch(
          addNewFolder({
            id: selectedFolder.id,
            data: data,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addNewFolder({
            data: data,
          })
        ).unwrap();
      }

      if (onSuccess) onSuccess(response);
    } catch (error) {
      console.log(error);
    } finally {
      if (setAddNotesModalVisible) setAddNotesModalVisible(false);
    }
  };

  useEffect(() => {
    if (selectedFolder) {
      setValue("folder", selectedFolder.folder);
    }
  }, [selectedFolder]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
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
                  <FormInput placeholder="New Folder Name" {...field} />
                  {error && (
                    <Error className="text-red-600 ">{error.message}</Error>
                  )}
                </>
              )}
            />
          </div>
        </div>
        <div className="w-full flex justify-end">
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
        </div>
      </div>
    </form>
  );
};
