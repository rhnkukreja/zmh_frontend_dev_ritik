import React, { useEffect, useState } from "react";
import MenuNoteList from "./MenuNoteList";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  clearSelectedNote,
  deleteNote,
  fetchFolders,
  fetchNotes,
  setSelectedNote,
} from "@/stores/notesSlice";
import { Note } from "@/types/notes";
import LoadingIcon from "@/components/Base/LoadingIcon";
// import DOMPurify from "dompurify";
// import AddButton from "./AddButton";
import dayjs from "dayjs";
import clsx from "clsx";
import { DeleteConfirmationModal } from "@/components/DeleteModal";
import { toast } from "react-toastify";
import Lucide from "@/components/Base/Lucide";

const NotesList: React.FC = () => {
  const dispatch = useAppDispatch();
  const [noteToBeDeleted, setNoteToBeDeleted] = useState<Note | null>(null);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);

  const { notes, notesLoading, selectedNote, selectedFolder } = useAppSelector(
    (state) => state.notes
  );

  useEffect(() => {
    if (selectedFolder?.id) {
      if (!notes || notes?.length === 0) {
        dispatch(fetchNotes(selectedFolder.id));
      } else if (notes[0]?.folder !== selectedFolder.id) {
        dispatch(fetchNotes(selectedFolder.id));
      } else {
        return;
      }
    }
  }, [dispatch, selectedFolder]);

  useEffect(() => {
    if (notes?.length > 0 && !selectedNote && selectedFolder !== null) {
      dispatch(setSelectedNote(notes[0]));
    } else if (notes?.length === 0) {
      dispatch(clearSelectedNote());
    }
  }, [notes, selectedFolder]);

  useEffect(() => {
    if (selectedNote?.folder !== selectedFolder?.id) {
      dispatch(clearSelectedNote());
    }
  }, [selectedNote]);

  const onClickDeleteIcon = (note: Note) => {
    setNoteToBeDeleted(note);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    try {
      if (!noteToBeDeleted) return;
      const response = await dispatch(deleteNote(noteToBeDeleted?.id)).unwrap();

      if (
        response?.response.status === 200 ||
        response?.response.status === 204
      ) {
        toast.success("Note deleted successfully");
        dispatch(fetchFolders());
        dispatch(fetchNotes(selectedFolder?.id));
      }
    } catch (error) {
      console.error("Error deleting the item:", error);
    } finally {
      setModalVisible(false);
      setNoteToBeDeleted(null);
    }
  };

  return (
    <div className="w-full border-r border-gray-200 h-screen overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center  px-4 py-4  ">
        <h2 className="text-lg font-semibold">{"Notes"}</h2>
        <span className="text-muted-foreground">{`${
          selectedFolder?.notes_count || 0
        } Notes`}</span>
      </div>

      <div className="border-b border-muted "></div>
      {notes?.length > 0 &&
        selectedFolder?.id &&
        selectedFolder?.id === notes[0]?.folder && (
          <div>
            {(notes || []).map((note: Note, index: number) => (
              <div
                key={index}
                className={clsx(
                  "relative py-4 border-b-[1px] bg-muted px-6 hover:bg-red-50 cursor-pointer ",
                  selectedNote?.id === note?.id ? "bg-red-50" : ""
                )}
                onClick={() => {
                  dispatch(setSelectedNote(note));
                }}
              >
                <div className="relative flex justify-between items-center">
                  <h4 className="font-semibold mb-2">{note?.name}</h4>
                  <MenuNoteList
                    onClickDeleteIcon={() => {
                      onClickDeleteIcon(note);
                    }}
                  />
                </div>

                {/* <div
                  className="prose max-w-none  line-clamp-2  max-h-20 overflow-hidden "
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(note?.text),
                  }}
                /> */}
                <section className="flex justify-between items-center mt-3">
                  {/* <span className="text-xs text-muted-foreground">
                    {note?.folder_name}
                  </span> */}
                  <span className="text-xs text-muted-foreground">
                    {dayjs(note?.date_created).format("MMM DD, YYYY")}
                  </span>
                </section>
              </div>
            ))}
          </div>
        )}

      {notes?.length === 0 && !notesLoading && (
        <div className="flex items-center justify-center h-full flex-col">
          <Lucide
            icon="NotebookPen"
            className=" text-gray-200 stroke-[1.3] w-[20%] h-[20%] ml-2  cursor-pointer"
          />
          <p className="text-gray-400 text-xl">No Note found</p>
        </div>
      )}

      {notes?.length === 0 && notesLoading && (
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-row items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
            <LoadingIcon
              icon="three-dots"
              className="w-10 h-10 text-primary"
              color="#800000"
            />
          </div>
        </div>
      )}

      {isModalVisible && (
        <DeleteConfirmationModal
          isVisible={isModalVisible}
          onClose={() => setModalVisible(false)}
          onConfirm={handleDelete}
          description={`Are you sure you want to delete <strong>"${
            noteToBeDeleted?.name || ""
          }"</strong> ?`}
          loading={notesLoading}
        />
      )}
    </div>
  );
};

export default NotesList;
