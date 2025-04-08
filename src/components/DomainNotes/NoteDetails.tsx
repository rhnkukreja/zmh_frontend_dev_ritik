import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Note } from "@/types/notes";
import NoteForm from "./AddEditNoteForm";
import clsx from "clsx";
import { toast } from "react-toastify";
import { addNote } from "@/stores/notesSlice";
import AddDomainNoteModal from "./AddDomainNotesModal";

const NoteDetails: React.FC = () => {
  const dispatch = useAppDispatch();
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);

  const [isEditing, setIsEditing] = useState(false);

  const handleNoteSubmit = async (data: Note) => {
    try {
      if (selectedNote?.id) {
        await dispatch(
          addNote({ id: selectedNote?.id, data: { text: data?.text } })
        );
      }
    } catch (error) {
      toast.error("An error occurred while saving the note");
    } finally {
      setIsEditing(false);
    }
  };

  const { selectedNote } = useAppSelector((state) => state.notes);

  const selectedNoteName = useMemo(() => selectedNote?.name, [selectedNote]);

  return (
    <>
      {selectedNote ? (
        <>
          <div className="w-full  h-screen  overflow-y-auto no-scrollbar !z-10">
            <div className="flex justify-between items-center  px-4 py-2 ">
              <div>
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold truncate max-w-[250px]">
                    <Tippy
                      content={selectedNoteName}
                      options={{ theme: "light" }}
                    >
                      {selectedNoteName}
                    </Tippy>
                  </h2>

                  <Lucide
                    icon="FilePen"
                    onClick={() => {
                      setAddNoteModalVisible(true);
                    }}
                    className=" text-primary stroke-[1.3] w-5 h-5 ml-2  cursor-pointer"
                  />
                </div>

                <p className="text-xs">
                  Last Updated on{" "}
                  {dayjs(selectedNote?.date_updated).format(
                    "MMM DD, YYYY [at] h:mm A"
                  )}
                </p>
              </div>
            </div>
            <div className="border-b border-muted mb-2 !z-10"></div>

            <div className="mx-4">
              {isEditing ? null : (
                <div className=" flex justify-end  text-gray-500 text-xs mb-2">
                  <div className="flex ">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                    >
                      <Tippy content="Edit Note" options={{ theme: "light" }}>
                        <Lucide icon="Pen" className="w-4 h-4" />
                      </Tippy>
                    </Button>
                  </div>
                </div>
              )}
              <div
                className={clsx(
                  "rounded-md mb-4",
                  !isEditing && "border border-gray p-4"
                )}
              >
                {isEditing ? (
                  <NoteForm
                    mode="edit"
                    initialData={selectedNote}
                    onSubmit={handleNoteSubmit}
                    setAddNoteModalVisible={setIsEditing}
                    fieldsToEdit={["text"]}
                  />
                ) : (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(selectedNote?.text),
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {addNoteModalVisible && (
            <AddDomainNoteModal
              mode="edit"
              selectedNote={selectedNote}
              addNoteModalVisible={addNoteModalVisible}
              setAddNoteModalVisible={setAddNoteModalVisible}
              title="Update Title"
              fieldsToEdit={["name"]}
            />
          )}
        </>
      ) : null}
    </>
  );
};

export default NoteDetails;
