import React, { useEffect } from "react";
import MenuNoteList from "./MenuNoteList";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  clearSelectedNote,
  fetchNotes,
  setSelectedNote,
} from "@/stores/notesSlice";
import { Note } from "@/types/notes";
import LoadingIcon from "@/components/Base/LoadingIcon";
import DOMPurify from "dompurify";
import AddButton from "./AddButton";
import dayjs from "dayjs";
import clsx from "clsx";

const NotesList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notes, notesLoading, selectedNote, selectedFolder } = useAppSelector(
    (state) => state.notes
  );

  useEffect(() => {
    if (selectedFolder?.id) {
      dispatch(fetchNotes(selectedFolder?.id));
    }
  }, [dispatch, selectedFolder]);

  useEffect(() => {
    if (notes?.length > 0 && !selectedNote) {
      dispatch(setSelectedNote(notes[0]));
    }
  }, [notes, selectedFolder]);

  useEffect(() => {
    if (selectedNote?.folder !== selectedFolder?.id) {
      dispatch(clearSelectedNote());
    }
  }, [selectedNote]);

  return (
    <div className="w-full border-r border-gray-200 h-screen overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center  px-4 py-4  ">
        <h2 className="text-lg font-semibold">
          {selectedFolder?.folder || "All Notes"}
        </h2>
        <span className="text-muted-foreground">{`${
          selectedFolder?.notes_count || 0
        } Notes`}</span>
      </div>

      <div className="border-b border-muted "></div>
      {notes?.length > 0 && (
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
                <MenuNoteList />
              </div>

              <div
                className="prose max-w-none  line-clamp-2  max-h-16 overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(note?.text),
                }}
              />
              <section className="flex justify-between items-center mt-3">
                <span className="text-xs text-muted-foreground">
                  {note?.folder_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dayjs(note?.date_created).format("MMM DD, YYYY")}
                </span>
              </section>
            </div>
          ))}
        </div>
      )}

      {notes?.length === 0 && !notesLoading && (
        <div className="flex justify-center items-center h-screen flex-col gap-2">
          <span className="text-gray-500">No notes found</span>
          <AddButton title="Create Note" />
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
    </div>
  );
};

export default NotesList;
