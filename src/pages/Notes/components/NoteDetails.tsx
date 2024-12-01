import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import AddNoteModal from "../AddNotesModal";
import { Note } from "@/types/notes";
import NoteForm from "./AddEditNoteForm";
import clsx from "clsx";
import { toast } from "react-toastify";
import { addNote } from "@/stores/notesSlice";

const NoteDetails: React.FC = () => {
  const dispatch = useAppDispatch();
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);

  const [isEditing, setIsEditing] = useState(false);

  const handleNoteSubmit = async (data: Note) => {
    try {
      if (selectedNote?.id) {
        const response = await dispatch(
          addNote({ id: selectedNote?.id, data: { text: data?.text } })
        ).unwrap();
        if (response?.results?.id) {
          toast.success("Note updated successfully");
        }
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
                  {" "}
                  Last Updated on{" "}
                  {dayjs(selectedNote?.date_updated).format(
                    "MMM DD, YYYY [at] h:mm A"
                  )}
                </p>
              </div>
              {/* <div className="flex space-x-2">
         <Button
           variant="soft-secondary"
           size="sm"
           className=" py-2 bg-transparent border-gray-500"
         >
           <Lucide
             icon="UserRoundPlus"
             className="w-4 h-4 mr-1 text-gray-500"
           />
           Share
         </Button>
         <Button
           size="sm"
           variant="soft-secondary"
           className=" py-2 bg-transparent border-gray-500"
         >
           <Lucide
             icon="MessageSquareText"
             className="w-4 h-4 mr-1 text-gray-500"
           />
           Comment
         </Button>
       </div> */}
            </div>
            <div className="border-b border-muted mb-4 !z-10"></div>

            <div className="mx-4">
              {/* <h2 className="text-lg font-semibold text-gray-800">Notes Name</h2>
       <div className="border-t text-gray-700 mb-5 mt-2"></div> */}

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

                {isEditing ? null : (
                  <div className="mt-4 flex justify-between items-center text-gray-500 text-xs">
                    <span>
                      {dayjs(selectedNote?.date_created).format("MMM DD, YYYY")}
                    </span>
                    <div className="flex space-x-2">
                      {/* <Button variant="secondary">
               <Lucide icon="Trash2" className="w-4 h-4" />
                </Button> */}
                      <Button
                        variant="secondary"
                        onClick={() => setIsEditing(true)}
                      >
                        <Lucide icon="Pen" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {addNoteModalVisible && (
            <AddNoteModal
              mode="edit"
              selectedNote={selectedNote}
              addNoteModalVisible={addNoteModalVisible}
              setAddNoteModalVisible={setAddNoteModalVisible}
              title="Update Title"
              fieldsToEdit={["name"]}
            />
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full flex-col">
          <Lucide
            icon="NotebookPen"
            className=" text-gray-200 stroke-[1.3] w-[20%] h-[20%] ml-2  cursor-pointer"
          />
          <p className="text-gray-400 text-xl">Detail not found</p>
        </div>
      )}
    </>
  );
};

export default NoteDetails;
