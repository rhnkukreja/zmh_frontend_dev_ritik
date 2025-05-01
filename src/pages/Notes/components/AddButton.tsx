import React, { useState } from "react";
import Button from "@/components/Base/Button";
import AddNoteModal from "../AddNotesModal";
import { useAppSelector } from "@/stores/hooks";

interface AddButtonProps {
  onClick?: () => void;
  className?: string;
  title?: string;
  disable:boolean
}

const AddButton: React.FC<AddButtonProps> = ({ onClick, className, title ,disable}) => {
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);

  const { folders } = useAppSelector((state) => state.notes);
  return (
    <>
      {folders?.length > 0 && (
        <Button
          size="sm"
          variant="primary"
          disabled={disable}
          className={`py-1 px-3 rounded-lg shadow-md hover:shadow-lg active:shadow-sm active:translate-y-[1px] transition-shadow duration-200 ease-in-out ${className}`}
          onClick={() => {
            setAddNoteModalVisible(true);
            if (onClick) {
              onClick();
            }
          }}
        >
          <span className="mr-2 text-xl">+</span>
          {title || "New Note"}
        </Button>
      )}

      {addNoteModalVisible && (
        <AddNoteModal
          mode="add"
          addNoteModalVisible={addNoteModalVisible}
          setAddNoteModalVisible={setAddNoteModalVisible}
          title="Create New Note"
        />
      )}
    </>
  );
};

export default AddButton;
