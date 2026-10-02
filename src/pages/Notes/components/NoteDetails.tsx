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
import { addNote, setSelectedGroup, setSelectedNote } from "@/stores/notesSlice";
import { NotesFieldProps } from "./NotesList";
import { RootState } from "@/stores/store";
import AddDomainNoteModal from "@/components/DomainNotes/AddDomainNotesModal";
import { DeleteConfirmationModal } from "@/components/DeleteModal";
import { createDynamicURL, groupByValue } from "@/utils/helper";
import { baseURL } from "@/constant";
import {
  addDomainNoteComment,
  deleteDomainNote,
  deleteDomainNoteComment,
  fetchDomainNotes,
  fetchDomainNotesDropDownValuesByCompany,
  fetchDomainNotesDropDownValuesByInstitution,
  fetchInstitutionHierarchyNotes,
  fetchCompanyHierarchyNotes,
  updateDomainNoteComment,
} from "@/stores/domainNotesSlice";
import { DomainNote, DomainNoteComment } from "@/types/domainNotes";
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
  const canManageNote = (value: unknown) => value === true || value === 1 || value === "true";
  const canCommentOnNote = (value: unknown) => value === true || value === 1 || value === "true";
  const formatCommentMeta = (comment: DomainNoteComment) => {
    const author = comment.created_by_name || comment.name || "";
    return author && comment.date ? `${author} • ${comment.date}` : author || comment.date || "";
  };
  const normalizeDisplayValue = (value?: string | null) =>
    (value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const formatDisplayName = (value?: string | null) =>
    (value || "")
      .trim()
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  const dispatch = useAppDispatch();

  const { selectedNote, selectedGroup } = useAppSelector(
    (state) => state.notes
  );
  const { institutionHierarchy, companyHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );
  const { user } = useAppSelector((state: RootState) => state.authentiction);

  const [data, setData] = useState(null);
  const [noteDetails, setNoteDetails] = useState(null);
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);
  const { results } = useAppSelector((state) => state.domainNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCommentNoteId, setActiveCommentNoteId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSavingNoteId, setCommentSavingNoteId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<{
    noteId: number;
    commentId: number;
    value: string;
  } | null>(null);
  const [commentDeletingId, setCommentDeletingId] = useState<number | null>(null);
  const [visibleNotes, setVisibleNotes] = useState<DomainNote[]>([]);

    // Get notes for selected institution and company
  const currentNotes = useMemo(() => {
    if (activeTab === "institution" && selectedInstitution && selectedCompany) {
      const institution = institutionHierarchy.find(
        (item) => item.main_heading === selectedInstitution
      );
      return institution?.sub_heading?.[selectedCompany] || [];
    } else if (activeTab === "company" && selectedCompany && selectedInstitution) {
      const company = companyHierarchy.find(
        (item) => item.main_heading === selectedCompany
      );
      return company?.sub_heading?.[selectedInstitution] || [];
    }
    return selectedGroup?.data || [];
  }, [activeTab, selectedInstitution, selectedCompany, institutionHierarchy, companyHierarchy, selectedGroup]);

  useEffect(() => {
    setVisibleNotes(currentNotes as DomainNote[]);
  }, [currentNotes]);

  const currentUserDisplayName = useMemo(() => {
    const directNoteAuthor = visibleNotes.find(
      (note) => note.created_by === user?.user_id && note.created_by_name
    )?.created_by_name;

    if (directNoteAuthor) {
      return directNoteAuthor;
    }

    const normalizedFirstName = normalizeDisplayValue(user?.first_name);
    const normalizedUserName = normalizeDisplayValue(user?.user_name);
    const authorCandidates = visibleNotes.flatMap((note) => [
      note.created_by_name,
      ...(note.comments || []).flatMap((comment) => [comment.created_by_name, comment.name]),
    ]);

    const matchedAuthor = authorCandidates.find((author) => {
      const normalizedAuthor = normalizeDisplayValue(author);

      return (
        (!!normalizedUserName && normalizedAuthor === normalizedUserName) ||
        (!!normalizedFirstName &&
          (normalizedAuthor === normalizedFirstName ||
            normalizedAuthor.startsWith(`${normalizedFirstName} `)))
      );
    });

    return matchedAuthor || formatDisplayName(user?.first_name) || formatDisplayName(user?.user_name);
  }, [visibleNotes, user?.first_name, user?.user_id, user?.user_name]);

  const updateVisibleNote = (
    noteId: number,
    updater: (note: DomainNote) => DomainNote
  ) => {
    let updatedNote: DomainNote | null = null;

    setVisibleNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        updatedNote = updater(note);
        return updatedNote;
      })
    );

    setNoteDetails((prev) => {
      if (!prev || prev.id !== noteId) return prev;
      return updatedNote || updater(prev as DomainNote);
    });

  };

  const buildCommentFromResponse = (
    response: unknown,
    noteId: number,
    fallbackComment: string
  ): DomainNoteComment => {
    const fallbackAuthor = currentUserDisplayName;
    const fallbackDate = dayjs().format("MMMM DD, YYYY");

    if (response && typeof response === "object") {
      const comment = response as DomainNoteComment & { comments?: unknown };
      return {
        ...comment,
        comments:
          typeof comment.comments === "string" ? comment.comments : fallbackComment,
        domain_notes: comment.domain_notes || noteId,
        created_by_name: comment.created_by_name || comment.name || fallbackAuthor,
        name: comment.name || comment.created_by_name || fallbackAuthor,
        date: comment.date || fallbackDate,
      };
    }

    return {
      id: Date.now(),
      comments: fallbackComment,
      domain_notes: noteId,
      created_by_name: fallbackAuthor,
      name: fallbackAuthor,
      date: fallbackDate,
    };
  };

  // Auto-select first note when currentNotes changes
  useEffect(() => {
    if (activeTab === "institution" || activeTab === "company") {
      setIsEditing(false);
      setAddNoteModalVisible(false);
      setData(null);
      setNoteDetails(null);
      setActiveCommentNoteId(null);
      setCommentDraft("");
      setEditingComment(null);
    }

    if (currentNotes && currentNotes.length > 0 && (activeTab === "institution" || activeTab === "company")) {
      setNoteDetails(currentNotes[0]);
      dispatch(setSelectedNote(currentNotes[0]));
    } else if (activeTab === "institution" || activeTab === "company") {
      setNoteDetails(null);
      dispatch(setSelectedNote(null));
    }
  }, [currentNotes, activeTab, dispatch, selectedInstitution, selectedCompany]);

  const fetchData = async () => {
    if (activeTab === "institution") {
      // Refresh institution hierarchy for institution tab
      await dispatch(fetchInstitutionHierarchyNotes());
    } else if (activeTab === "company") {
      // Refresh company hierarchy for company tab
      await dispatch(fetchCompanyHierarchyNotes());
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

  const handleDeleteNote = async () => {
    if (!deleteTarget?.id || isDeleting) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteDomainNote({ id: deleteTarget.id }));
      toast.success("Note deleted sucessfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("An error occurred while deleting the note");
    } finally {
      const targetItem = deleteTarget;
      setIsDeleting(false);

      if (!targetItem) return;

      if (activeTab === "institution") {
        dispatch(fetchInstitutionHierarchyNotes());
      } else if (activeTab === "company") {
        dispatch(fetchCompanyHierarchyNotes());
      } else {
        const dynamicURL = createDynamicURL(
          `${baseURL}/user/domain_notes/`,
          {
            institution_id: JSON.stringify(targetItem.institution),
            company_id: JSON.stringify(targetItem.company),
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
  const handleCommentActionOpen = (noteId: number) => {
    if (activeCommentNoteId === noteId) {
      setActiveCommentNoteId(null);
      setCommentDraft("");
      return;
    }

    setActiveCommentNoteId(noteId);
    setCommentDraft("");
    setEditingComment(null);
  };

  const handleCommentSubmit = async (noteId: number) => {
    const trimmedComment = commentDraft.trim();
    if (!trimmedComment) {
      toast.error("Comment text is required");
      return;
    }

    setCommentSavingNoteId(noteId);
    try {
      const response = await dispatch(
        addDomainNoteComment({ id: noteId, data: { comments: trimmedComment } })
      ).unwrap();

      updateVisibleNote(noteId, (note) => {
        if (Array.isArray(response?.results?.comments)) {
          return {
            ...note,
            ...response.results,
            comments: response.results.comments,
          };
        }

        return {
          ...note,
          comments: [
            ...(note.comments || []),
            buildCommentFromResponse(response?.results, noteId, trimmedComment),
          ],
        };
      });

      setActiveCommentNoteId(null);
      setCommentDraft("");
      toast.success("Comment added successfully");
    } catch (error) {
      toast.error("An error occurred while adding the comment");
    } finally {
      setCommentSavingNoteId(null);
    }
  };

  const handleCommentEditStart = (noteId: number, comment: DomainNoteComment) => {
    if (!comment.id) return;
    setActiveCommentNoteId(null);
    setCommentDraft("");
    setEditingComment({
      noteId,
      commentId: comment.id,
      value: typeof comment.comments === "string" ? comment.comments : "",
    });
  };

  const handleCommentEditSave = async () => {
    if (!editingComment?.commentId) return;

    const trimmedComment = editingComment.value.trim();
    if (!trimmedComment) {
      toast.error("Comment text is required");
      return;
    }

    setCommentSavingNoteId(editingComment.noteId);
    try {
      const response = await dispatch(
        updateDomainNoteComment({
          id: editingComment.commentId,
          data: { comments: trimmedComment },
        })
      ).unwrap();

      updateVisibleNote(editingComment.noteId, (note) => ({
        ...note,
        comments: (note.comments || []).map((comment) =>
          comment.id === editingComment.commentId
            ? {
                ...comment,
                ...response.results,
                comments: trimmedComment,
              }
            : comment
        ),
      }));

      setEditingComment(null);
      toast.success("Comment updated successfully");
    } catch (error) {
      toast.error("An error occurred while updating the comment");
    } finally {
      setCommentSavingNoteId(null);
    }
  };

  const handleCommentDelete = async (commentId: number, noteId: number) => {
    setCommentDeletingId(commentId);
    try {
      await dispatch(deleteDomainNoteComment({ id: commentId })).unwrap();

      updateVisibleNote(noteId, (note) => ({
        ...note,
        comments: (note.comments || []).filter((comment) => comment.id !== commentId),
      }));

      if (editingComment?.commentId === commentId) {
        setEditingComment(null);
      }
      toast.success("Comment deleted successfully");
    } catch (error) {
      toast.error("An error occurred while deleting the comment");
    } finally {
      setCommentDeletingId(null);
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
          <div className="w-full h-full overflow-y-auto !z-10">
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
      {(selectedGroup || ((activeTab === "institution" || activeTab === "company") && visibleNotes.length > 0) || 
        ((activeTab === "institution" && selectedInstitution && selectedCompany) || 
         (activeTab === "company" && selectedCompany && selectedInstitution))) ? (
        <>
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white !z-10">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold leading-6 text-slate-900">
                    {selectedNoteName}
                  </h2>

                  {activeTab === "other" && (
                    <Lucide
                      icon="FilePen"
                      onClick={() => {
                        setAddNoteModalVisible(true);
                      }}
                      className="ml-2 h-5 w-5 cursor-pointer text-primary stroke-[1.3]"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Display current notes for hierarchy tabs or selectedGroup data for other tab */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {visibleNotes.length > 0 ? (
              visibleNotes.map((item, index) => (
                <div className="mb-5" key={index}>
                  <div
                    className={clsx(
                      "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
                      !isEditing && "transition hover:shadow-md"
                    )}
                  >
                    {isEditing ? null : (
                      <div>
                        <div className="flex">
                          <div className="w-full">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 pr-2">
                                <div
                                  className="prose max-w-none text-sm leading-7 text-slate-700"
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(item.notes),
                                  }}
                                />
                              </div>
                              <div className="flex flex-shrink-0 gap-2">
                                {canCommentOnNote(item.comments_check) && (
                                  <Tippy
                                    content="Comment"
                                    options={{ theme: "light" }}
                                  >
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => handleCommentActionOpen(item.id)}
                                    >
                                      <Lucide icon="MessageCircle" className="h-4 w-4" />
                                    </Button>
                                  </Tippy>
                                )}
                                {canManageNote(item.update_delete_check) && (
                                  <>
                                    <Tippy
                                      content="Edit Note"
                                      options={{ theme: "light" }}
                                    >
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="h-9 w-9 p-0"
                                        onClick={() => {
                                          setIsEditing(true);
                                          setData({
                                            company_id: item?.company || item?.company_id,
                                            institution_id: item?.institution || item?.institution_id,
                                            institution_name: item?.institution_name || item?.investor_name,
                                            company_name: item?.company_name,
                                          });
                                          setNoteDetails(item);
                                        }}
                                      >
                                        <Lucide icon="Pen" className="h-4 w-4" />
                                      </Button>
                                    </Tippy>
                                    <Tippy
                                      content="Delete Note"
                                      options={{ theme: "light" }}
                                    >
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="h-9 w-9 p-0"
                                        onClick={() => setDeleteTarget(item)}
                                      >
                                        <Lucide icon="Trash" className="h-4 w-4" />
                                      </Button>
                                    </Tippy>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <span className="whitespace-nowrap text-xs font-medium text-slate-400">
                            {item.created_by_name
                              ? `By ${item.created_by_name} • ${item.formatted_date || item.date}`
                              : item.formatted_date || item.date}
                          </span>
                        </div>

                        {(activeCommentNoteId === item.id || editingComment?.noteId === item.id || item.comments?.length > 0) && (
                          <div className="mt-5 border-t border-slate-100 pt-5">
                            {activeCommentNoteId === item.id && (
                              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  Add Comment
                                </label>
                                <textarea
                                  value={commentDraft}
                                  onChange={(event) => setCommentDraft(event.target.value)}
                                  rows={4}
                                  placeholder="Write your comment here..."
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={() => {
                                      setActiveCommentNoteId(null);
                                      setCommentDraft("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    disabled={commentSavingNoteId === item.id}
                                    onClick={() => handleCommentSubmit(item.id)}
                                  >
                                    {commentSavingNoteId === item.id ? "Saving..." : "Save Comment"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {item.comments?.length > 0 && (
                              <div className="space-y-3">
                                {item.comments.map((comment, index) => {
                                  const isEditingThisComment = editingComment?.commentId === comment.id;
                                  const commentMeta = formatCommentMeta(comment);

                                  return (
                                    <div
                                      key={comment.id || index}
                                      className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm"
                                    >
                                      {isEditingThisComment ? (
                                        <>
                                          <textarea
                                            value={editingComment?.value || ""}
                                            onChange={(event) =>
                                              setEditingComment((prev) =>
                                                prev
                                                  ? { ...prev, value: event.target.value }
                                                  : prev
                                              )
                                            }
                                            rows={3}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                                          />
                                          <div className="mt-3 flex justify-end gap-2">
                                            <Button
                                              type="button"
                                              variant="outline-secondary"
                                              onClick={() => setEditingComment(null)}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="primary"
                                              disabled={commentSavingNoteId === item.id}
                                              onClick={handleCommentEditSave}
                                            >
                                              {commentSavingNoteId === item.id ? "Saving..." : "Update Comment"}
                                            </Button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div
                                            className="text-sm leading-6 text-slate-700"
                                            dangerouslySetInnerHTML={{
                                              __html: DOMPurify.sanitize(String(comment.comments || "")),
                                            }}
                                          />
                                          <div className="mt-3 flex items-center justify-between gap-3">
                                            <div className="text-xs font-medium text-slate-400">
                                              {commentMeta}
                                            </div>
                                            {canManageNote(comment.update_delete_check) && comment.id && (
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  type="button"
                                                  variant="outline-primary"
                                                  size="sm"
                                                  className="h-8 w-8 p-0"
                                                  onClick={() => handleCommentEditStart(item.id, comment)}
                                                >
                                                  <Lucide icon="Pen" className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline-danger"
                                                  size="sm"
                                                  className="h-8 w-8 p-0"
                                                  disabled={commentDeletingId === comment.id}
                                                  onClick={() => handleCommentDelete(comment.id as number, item.id)}
                                                >
                                                  <Lucide icon="Trash" className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                <Lucide icon="FileText" className="mb-4 h-14 w-14 text-slate-300" />
                <p className="text-base font-semibold text-slate-600">No notes found</p>
                <p className="mt-1 text-sm text-slate-400">There are no notes for this selection yet.</p>
              </div>
            )}
          </div>
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
          <DeleteConfirmationModal
            isVisible={Boolean(deleteTarget)}
            onClose={() => {
              if (isDeleting) return;
              setDeleteTarget(null);
            }}
            onConfirm={handleDeleteNote}
            loading={isDeleting}
            description="Are you sure you want to delete this note? This action cannot be undone."
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