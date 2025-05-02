import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import AddNoteModal from "../AddNotesModal";
import { Note } from "@/types/notes";
import NoteForm from "./AddEditNoteForm";
import clsx from "clsx";
import { toast } from "react-toastify";
import { addNote, setSelectedGroup } from "@/stores/notesSlice";
import { NotesFieldProps } from "./NotesList";
import { RootState } from "@/stores/store";
import AddDomainNoteModal from "@/components/DomainNotes/AddDomainNotesModal";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { deleteDomainNote, fetchDomainNotes } from "@/stores/domainNotesSlice";
interface NoteData {
  company_id?: string;
  institution_id?: string;
  institution_name?: string;
  company_name?: string;
}

const NoteDetails: React.FC<NotesFieldProps> = ({ activeTab }) => {
  const dispatch = useAppDispatch();

  const { selectedNote, selectedGroup } = useAppSelector(
    (state) => state.notes
  );
  console.log(selectedGroup, "=>selectedGroup");
  const [data, setData] = useState<NoteData | undefined>();
  const [noteDetails, setNoteDetails] = useState({});
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);

  const [isEditing, setIsEditing] = useState(false);
  const fetchData = async () => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/user/domain_notes/`,
      {
        institution_id: JSON.stringify(data.institution_id),
        company_id: JSON.stringify(data.company_id),
      },
      undefined,
      1
    );
    const response = await dispatch(fetchDomainNotes(dynamicURL));

    dispatch(
      setSelectedGroup({ ...selectedGroup, data: response?.payload?.results })
    );
  };
  const handleDeleteNote = async (item: any) => {
    try {
      if (item.id) {
        const id = item.id;
        await dispatch(deleteDomainNote({ id }));
        toast.success("Note deleted sucessfully");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the note");
    } finally {
      const dynamicURL = createDynamicURL(
        `${baseURL}/user/domain_notes/`,
        {
          institution_id: JSON.stringify(item.institution),
          company_id: JSON.stringify(item.company),
        },
        undefined,
        1
      );
      const response = await dispatch(fetchDomainNotes(dynamicURL));

      dispatch(
        setSelectedGroup({ ...selectedGroup, data: response?.payload?.results })
      );
    }
  };
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

  const selectedNoteName = useMemo(() => {
    if (activeTab === "other") {
      return selectedNote ? selectedNote?.name : undefined;
    } else {
      return selectedGroup ? selectedGroup?.name : undefined;
    }
  }, [selectedNote, selectedGroup]);

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
      ) : null}
      {selectedGroup ? (
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
                {/*       
                      <p className="text-xs">
                        Last Updated on{" "}
                        {dayjs(selectedNote?.date_updated).format(
                          "MMM DD, YYYY [at] h:mm A"
                        )}
                      </p> */}
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
            <div className="border-b border-muted mb-2 !z-10"></div>
            {selectedGroup?.data.map((item, index) => (
              <div className="mx-4" key={index}>
                {isEditing ? null : (
                  <div className=" flex justify-end  text-gray-500 text-xs mb-2">
                    <div className="flex gap-1 ">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsEditing(true);
                          setData({
                            company_id: item?.company,
                            institution_id: item?.institution,
                            institution_name: item?.institution_name,
                            company_name: item?.company_name,
                          });
                          setNoteDetails(item);
                        }}
                      >
                        <Tippy content="Edit Note" options={{ theme: "light" }}>
                          <Lucide icon="Pen" className="w-4 h-4" />
                        </Tippy>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDeleteNote(item)}
                      >
                        <Tippy
                          content="Delete Note"
                          options={{ theme: "light" }}
                        >
                          <Lucide icon="Trash" className="w-4 h-4" />
                        </Tippy>
                      </Button>
                    </div>
                  </div>
                )}
                {/* <h2 className="text-lg font-semibold text-gray-800">Notes Name</h2>
             <div className="border-t text-gray-700 mb-5 mt-2"></div> */}

                <div
                  className={clsx(
                    "rounded-md mb-4",
                    !isEditing && "border border-gray p-4"
                  )}
                >
                  {isEditing ? null : (
                    <>
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(item.notes),
                        }}
                      />
                      {item.comments?.map((comment, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-primary/80 pl-4 py-1 bg-white dark:bg-darkmode-600 rounded-md shadow-sm mt-5"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div
                              className="text-gray-800 dark:text-gray-100 text-sm"
                              dangerouslySetInnerHTML={{
                                __html: comment.comments,
                              }}
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic whitespace-nowrap">
                              ~ {comment.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <AddDomainNoteModal
            mode="edit"
            addNoteModalVisible={isEditing}
            setAddNoteModalVisible={setIsEditing}
            title="Create New Note"
            data={data}
            selectedNote={noteDetails}
            fetchData={fetchData}
            noteModule={false}
          />
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
      ) : null}
    </>
  );
};

export default NoteDetails;
