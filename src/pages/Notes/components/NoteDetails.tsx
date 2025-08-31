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
import { createDynamicURL, groupByValue } from "@/utils/helper";
import { baseURL } from "@/constant";
import {
  deleteDomainNote,
  fetchDomainNotes,
  fetchDomainNotesDropDownValuesByCompany,
  fetchDomainNotesDropDownValuesByInstitution,
  fetchInstitutionHierarchyNotes,
  fetchCompanyHierarchyNotes,
} from "@/stores/domainNotesSlice";
interface NoteData {
  company_id?: string;
  institution_id?: string;
  institution_name?: string;
  company_name?: string;
}

const NoteDetails: React.FC<NotesFieldProps> = ({ 
  activeTab, 
  selectedInstitution, 
  selectedCompany 
}) => {
  const dispatch = useAppDispatch();

  const { selectedNote, selectedGroup } = useAppSelector(
    (state) => state.notes
  );
  const { institutionHierarchy, companyHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );

  const [data, setData] = useState(null);
  const [noteDetails, setNoteDetails] = useState(null);
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);
  const { results } = useAppSelector((state) => state.domainNotes);
  const [isEditing, setIsEditing] = useState(false);

    // Get notes for selected institution and company
  const currentNotes = useMemo(() => {
    console.log("currentNotes calculation:", {
      activeTab,
      selectedInstitution,
      selectedCompany,
      institutionHierarchy: institutionHierarchy?.length,
      companyHierarchy: companyHierarchy?.length
    });
    
    if (activeTab === "institution" && selectedInstitution && selectedCompany) {
      const institution = institutionHierarchy.find(
        (item) => item.main_heading === selectedInstitution
      );
      console.log("Found institution:", institution);
      const notes = institution?.sub_heading?.[selectedCompany] || [];
      console.log("Notes for institution tab:", notes);
      return notes;
    } else if (activeTab === "company" && selectedCompany && selectedInstitution) {
      const company = companyHierarchy.find(
        (item) => item.main_heading === selectedCompany
      );
      console.log("Found company:", company);
      const notes = company?.sub_heading?.[selectedInstitution] || [];
      console.log("Notes for company tab:", notes);
      return notes;
    }
    return selectedGroup?.data || [];
  }, [activeTab, selectedInstitution, selectedCompany, institutionHierarchy, companyHierarchy, selectedGroup]);
  const fetchData = async () => {
    if (activeTab === "institution") {
      // Refresh institution hierarchy for institution tab
      dispatch(fetchInstitutionHierarchyNotes());
    } else if (activeTab === "company") {
      // Refresh company hierarchy for company tab
      dispatch(fetchCompanyHierarchyNotes());
    } else if (data?.institution_id && data?.company_id) {
      // Existing logic for other tabs
      const dynamicURL = createDynamicURL(
        `${baseURL}/user/domain_notes/`,
        {
          institution_id: JSON.stringify(data?.institution_id),
          company_id: JSON.stringify(data?.company_id),
        },
        undefined,
        1
      );
      const response = await dispatch(fetchDomainNotes(dynamicURL));
      dispatch(
        setSelectedGroup({
          ...selectedGroup,
          data: (response?.payload as { results: any }).results,
        })
      );
    }
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
      // Refresh data based on active tab
      if (activeTab === "institution") {
        // Refresh the institution hierarchy
        dispatch(fetchInstitutionHierarchyNotes());
      } else if (activeTab === "company") {
        // Refresh the company hierarchy
        dispatch(fetchCompanyHierarchyNotes());
      } else {
        // Existing logic for other tabs
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
        if ((response?.payload as { results: any[] })?.results.length > 0) {
          dispatch(
            setSelectedGroup({
              ...selectedGroup,
              data: (response?.payload as { results: any }).results,
            })
          );
        } else {
          dispatch(setSelectedGroup(null));
        }
      }
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
    if (activeTab === "institution") {
      return selectedCompany ? `${selectedInstitution} - ${selectedCompany}` : selectedInstitution;
    } else if (activeTab === "company") {
      return selectedInstitution ? `${selectedCompany} - ${selectedInstitution}` : selectedCompany;
    } else if (activeTab === "other") {
      return selectedNote ? selectedNote?.name : undefined;
    } else {
      return selectedGroup ? selectedGroup?.name : undefined;
    }
  }, [activeTab, selectedNote, selectedGroup, selectedInstitution, selectedCompany]);

  return (
    <>
      {/* Show individual note for "other" tab when selectedNote exists */}
      {activeTab === "other" && selectedNote ? (
        <>
          <div className="w-full h-full overflow-y-auto no-scrollbar !z-10">
            <div className="flex justify-between items-center px-4 py-2">
              <div>
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold">
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

      {/* Show notes list for hierarchy tabs (institution/company) or selectedGroup */}
      {(selectedGroup || ((activeTab === "institution" || activeTab === "company") && currentNotes.length > 0) || 
        ((activeTab === "institution" && selectedInstitution && selectedCompany) || 
         (activeTab === "company" && selectedCompany && selectedInstitution))) ? (
        <>
          <div className="w-full h-full overflow-y-auto no-scrollbar !z-10">
            <div className="flex justify-between items-center px-4 py-2">
              <div>
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedNoteName}
                  </h2>

                  {activeTab === "other" && (
                    <Lucide
                      icon="FilePen"
                      onClick={() => {
                        setAddNoteModalVisible(true);
                      }}
                      className=" text-primary stroke-[1.3] w-5 h-5 ml-2  cursor-pointer"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="border-b border-muted mb-2 !z-10"></div>
            
            {/* Display current notes for hierarchy tabs or selectedGroup data for other tab */}
            {((activeTab === "institution" || activeTab === "company") ? currentNotes : (selectedGroup?.data || [])).length > 0 ? (
              ((activeTab === "institution" || activeTab === "company") ? currentNotes : (selectedGroup?.data || [])).map((item, index) => (
                <div className="mx-4 mb-6" key={index}>
                  <div
                    className={clsx(
                      "rounded-md mb-4",
                      !isEditing && "border border-gray p-4"
                    )}
                  >
                  {isEditing ? null : (
                    <div>
                      <div className="flex">
                        <div className="w-full">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <div
                                className="prose max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(item.notes),
                                }}
                              />
                            </div>
                            {item.update_delete_check === true && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="secondary"
                                  size="sm"
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
                                  <Tippy
                                    content="Edit Note"
                                    options={{ theme: "light" }}
                                  >
                                    <Lucide icon="Pen" className="w-4 h-4" />
                                  </Tippy>
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
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
                            )}
                          </div>
                        </div>
                      </div>

                      {item.comments?.map((comment, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-primary/80 px-4 py-1 bg-white dark:bg-darkmode-600 rounded-md shadow-sm mt-5"
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
                      <div className="flex justify-end mt-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {item.formatted_date || item.date}
                        </span> 
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 mx-4">
                <Lucide icon="FileText" className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No notes found</p>
                <p className="text-gray-400 text-sm">There are no notes for this selection yet.</p>
              </div>
            )}
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