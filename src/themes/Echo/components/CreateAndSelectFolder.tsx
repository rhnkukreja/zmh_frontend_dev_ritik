import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addNote,
  clearSelectedNote,
  fetchNotes,
  fetchSingleFolder,
  setSelectedNote,
} from "@/stores/notesSlice";
import { Note } from "@/types/notes";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { AddFolderForm } from "@/pages/Notes/components/AddFolder";
import NameField from "@/pages/Notes/components/CreateNoteName";
import NoteField from "@/pages/Notes/components/NoteEditor";
import FolderField from "@/pages/Notes/components/SelectFolders";
import SelectNoteField from "@/pages/Notes/components/SelectNote";
import _ from "lodash";

interface CreateAndSelectFolderProps {
  setGlobalCreateNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  selectedText: string;
}

const StepOne: React.FC<{
  folderValue: number;
  control: any;
  handleNext: () => void;
  handleToggleFolderMode: () => void;
}> = ({ folderValue, control, handleNext, handleToggleFolderMode }) => (
  <div>
    <div className="flex w-full gap-3">
      <FolderField
        control={control}
        rules={{ required: "Folder Name is required" }}
      />
      <div className="mt-7">
        <Button variant="primary" onClick={handleToggleFolderMode}>
          <Tippy content="Create Folder" options={{ theme: "light" }}>
            <Lucide icon="Plus" className="w-5 h-5" />
          </Tippy>
        </Button>
      </div>
    </div>
    <div className="w-full flex justify-end mt-3">
      <Button
        type="button"
        variant="primary"
        onClick={handleNext}
        disabled={!folderValue}
      >
        Next
      </Button>
    </div>
  </div>
);

const StepTwo: React.FC<{
  folderValue: number;
  control: any;
  isCreatingNote: boolean;
  setIsCreatingNote: (value: boolean) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleToggleNoteMode: () => void;
  noteValue: string;
}> = ({
  folderValue,
  control,
  isCreatingNote,
  setIsCreatingNote,
  handlePrevious,
  handleNext,
  handleToggleNoteMode,
  noteValue,
}) => {
  return (
    <div>
      {isCreatingNote ? (
        <NameField
          control={control}
          rules={{ required: "Note Name is required" }}
        />
      ) : (
        <div className="flex w-full gap-3">
          <SelectNoteField
            folder={folderValue}
            control={control}
            rules={{ required: "Note Name is required" }}
          />
          <div className="mt-7">
            <Button variant="primary" onClick={handleToggleNoteMode}>
              <Tippy content="Create Note" options={{ theme: "light" }}>
                <Lucide icon="Plus" className="w-5 h-5" />
              </Tippy>
            </Button>
          </div>
        </div>
      )}
      <div className="w-full flex justify-between mt-3">
        <Button
          type="button"
          variant="outline-secondary"
          onClick={handlePrevious}
        >
          Back
        </Button>
        <div>
          {isCreatingNote && (
            <Button
              type="button"
              className="mr-2"
              variant="outline-secondary"
              onClick={() => setIsCreatingNote(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            disabled={!noteValue}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

const StepThree: React.FC<{
  control: any;
  handlePrevious: () => void;
  notesLoading: boolean;
}> = ({ control, handlePrevious, notesLoading }) => (
  <div>
    <NoteField
      control={control}
      rules={{ required: "Note Detail is required" }}
    />
    <div className="w-full flex justify-between mt-3">
      <Button
        type="button"
        variant="outline-secondary"
        onClick={handlePrevious}
      >
        Back
      </Button>
      <Button variant="primary" type="submit">
        {notesLoading && (
          <Lucide
            icon="Loader"
            className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
              notesLoading ? "animate-spin" : ""
            }`}
          />
        )}
        Save
      </Button>
    </div>
  </div>
);

const CreateAndSelectFolder: React.FC<CreateAndSelectFolderProps> = ({
  selectedText,
  setGlobalCreateNoteModalVisible,
}) => {
  const dispatch = useAppDispatch();
  const { notesLoading, selectedNote, notes } = useAppSelector(
    (state) => state.notes
  );

  const { control, handleSubmit, watch, setValue } = useForm<Note>();
  const folderValue = watch("folder");
  const noteValue = watch("name");
  const [step, setStep] = useState(1);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newCreatedFolder, setNewCreatedFolder] = useState<number | undefined>(
    undefined
  );

  const handleToggleFolderMode = () => setIsCreatingFolder(!isCreatingFolder);
  const handleToggleNoteMode = () => {
    setIsCreatingNote(true);
    setValue("name", "");
    dispatch(clearSelectedNote());
  };
  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrevious = () => setStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (values: Partial<Note>) => {
    try {
      const payload =
        selectedNote && !isCreatingNote
          ? { id: selectedNote.id, data: { text: values.text } }
          : { data: { ...values } };
      await dispatch(addNote(payload));
    } catch (error) {
      console.error(error);
    } finally {
      setGlobalCreateNoteModalVisible(false);
    }
  };

  useEffect(() => {
    if (folderValue) {
      dispatch(fetchSingleFolder(folderValue));
      dispatch(fetchNotes(folderValue));
    }
  }, [folderValue, dispatch]);

  useEffect(() => {
    if (noteValue) {
      const note = notes.find((n: Note) => n.id === Number(noteValue));
      if (note) dispatch(setSelectedNote(note));
    }
  }, [noteValue, notes, dispatch]);

  useEffect(() => {
    setValue(
      "text",
      isCreatingNote
        ? selectedText
        : _.join([selectedNote?.text || "", selectedText], "")
    );
  }, [selectedNote, setValue, selectedText, isCreatingNote]);

  useEffect(() => {
    if (newCreatedFolder) setValue("folder", newCreatedFolder);
  }, [newCreatedFolder]);

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && !isCreatingFolder && (
          <StepOne
            folderValue={folderValue}
            control={control}
            handleNext={handleNext}
            handleToggleFolderMode={handleToggleFolderMode}
          />
        )}
        {step === 2 && folderValue && (
          <StepTwo
            folderValue={folderValue}
            control={control}
            isCreatingNote={isCreatingNote}
            setIsCreatingNote={setIsCreatingNote}
            handlePrevious={handlePrevious}
            handleNext={handleNext}
            handleToggleNoteMode={handleToggleNoteMode}
            noteValue={noteValue}
          />
        )}
        {step === 3 && (
          <StepThree
            control={control}
            handlePrevious={handlePrevious}
            notesLoading={notesLoading}
          />
        )}
      </form>
      {step === 1 && isCreatingFolder && (
        <AddFolderForm
          selectedFolder={null}
          onClickCancel={handleToggleFolderMode}
          setAddNotesModalVisible={setIsCreatingFolder}
          onSuccess={(data) => {
            if (data?.results) {
              setNewCreatedFolder(data?.results?.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default CreateAndSelectFolder;
