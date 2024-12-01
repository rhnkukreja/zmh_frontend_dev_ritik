import React, { useState } from "react";
import Button from "@/components/Base/Button";
import AddNoteModal from "../AddNotesModal";

interface AddButtonProps {
  onClick?: () => void;
  className?: string;
  title?: string;
}

const AddButton: React.FC<AddButtonProps> = ({ onClick, className, title }) => {
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);
  return (
    <>
      <Button
        size="sm"
        variant="primary"
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
