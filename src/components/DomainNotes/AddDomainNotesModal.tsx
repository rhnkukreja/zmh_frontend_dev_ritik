import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { Dialog } from "@/components/Base/Headless";
import NoteForm from "./AddEditNoteForm";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { toast } from "react-toastify";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote } from "@/types/domainNotes";
import { addDomainNote } from "@/stores/domainNotesSlice";
import Lucide from "../Base/Lucide";

interface AddNoteModalProps {
  mode: "add" | "edit";
  addNoteModalVisible: boolean;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  selectedNote?: DomainNote;
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  data?: CompanyDashboard;
  fetchData?: () => Promise<void>;
  noteModule: boolean;
}

interface SelectedNoteData {
  company: number;
  institution: number;
  investor_name: string;
  company_name?: string;
}

const AddDomainNoteModal = ({
  addNoteModalVisible,
  setAddNoteModalVisible,
  title,
  selectedNote,
  mode,
  fieldsToEdit,
  data,
  fetchData,
  noteModule,
}: AddNoteModalProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.authentiction);
  const isCorporateUser =
    !!user?.user_role && user.user_role.toLowerCase() === "corporate";
  const corporateCompanyId = Number(user?.user_actual_company || 0);
  const [selectedData, setSelectedData] = useState<SelectedNoteData>({
    company:
      isCorporateUser && corporateCompanyId
        ? corporateCompanyId
        : selectedNote?.company || 0,
    institution: selectedNote?.institution || 0,
    investor_name: selectedNote?.investor_name || "",
  });

  // Update selectedData when selectedNote changes (for edit mode)
  useEffect(() => {
    if (selectedNote && mode === "edit") {
      console.log("Setting selectedData for edit mode:", {
        selectedNote,
        company: selectedNote.company_name,
        institution: selectedNote.institution,
        investor_name: selectedNote.investor_name
      });
      setSelectedData({
        company:
          isCorporateUser && corporateCompanyId
            ? corporateCompanyId
            : selectedNote.company || 0,
        institution: selectedNote.institution || 0,
        investor_name: selectedNote.investor_name || "",
      });
    }
  }, [selectedNote, mode, isCorporateUser, corporateCompanyId]);

  useEffect(() => {
    if (isCorporateUser && corporateCompanyId) {
      setSelectedData((prev) => ({
        ...prev,
        company: corporateCompanyId,
        company_name: user?.company_name,
      }));
    }
  }, [isCorporateUser, corporateCompanyId, user?.company_name]);
  const handleNoteSubmit = async (data: DomainNote) => {
    function removeTrailingSpaces(htmlContent: string): string {
      const trailingTagsRegex = /^(<[^>]+>(\s|&nbsp;|<br\s*\/?>)*<\/[^>]+>|\s|&nbsp;|<br\s*\/?>)+|(<[^>]+>(\s|&nbsp;|<br\s*\/?>)*<\/[^>]+>|\s|&nbsp;|<br\s*\/?>)+$/gi;
      return htmlContent.replace(trailingTagsRegex, '');
    }
    try {
      const trimmedData = {
        ...data,
        notes: removeTrailingSpaces(data.notes),
        shared: Boolean(data.shared),
      };
      if (selectedNote?.id && mode == "edit") {
        // For edit mode, only send the fields that are actually being edited
        const editCompany = isCorporateUser && corporateCompanyId
          ? corporateCompanyId
          : selectedData.company || selectedNote?.company || data?.company || 0;

        const editData: any = {
            attendees: trimmedData.attendees,
            notes: trimmedData.notes,
            date: trimmedData.date,
            category: trimmedData.category,
            shared: trimmedData.shared,
          };
        // Testing: omit `company` from payload when user is NOT corporate
        if (isCorporateUser) {
          editData.company = editCompany;
        }
        console.log("Edit payload:", editData);
        await dispatch(addDomainNote({ id: selectedNote.id, data: editData }));
      } else {
        if (noteModule) {
          const fallbackCompany = isCorporateUser && corporateCompanyId
            ? corporateCompanyId
            : selectedData.company || selectedNote?.company || data?.company || 0;

          const payload: any = {
            ...trimmedData,
            ...selectedData,
          };
          if (isCorporateUser) {
            payload.company = fallbackCompany;
          } else {
            // Testing behavior: omit company for non-corporate users
            if (!payload.company) delete payload.company;
          }

          const response = await dispatch(addDomainNote({ data: payload })).unwrap();
          if (response?.results) toast.success("Note successfully created");
        } else {
          const payload: any = { ...trimmedData };
          if (isCorporateUser) {
            payload.company = corporateCompanyId || trimmedData.company;
          } else {
            // Testing behavior: omit company for non-corporate users
            if (!payload.company) delete payload.company;
          }
          await dispatch(addDomainNote({ data: payload })).unwrap();
        }
      }
    } catch (error) {
      toast.error("An error occurred while saving the note");
    } finally {
      fetchData();
      setAddNoteModalVisible(false);
    }
  };

  return (
    <Dialog
      size="lg"
      open={addNoteModalVisible}
      onClose={() => setAddNoteModalVisible(false)}
    >
      <Dialog.Panel className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={() => setAddNoteModalVisible(false)}
          className="absolute right-6 top-3 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close note modal"
        >
          <Lucide icon="X" className="h-5 w-5" />
        </button>
        <Dialog.Title>
          <div className="px-6 py-3 pr-20">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-800">
                {mode === "edit" ? "Edit Note" : "New Note"}
              </h2>
            </div>
          </div>
        </Dialog.Title>
        <Dialog.Description className="bg-slate-50 px-6 py-6">
          <NoteForm
            mode={mode}
            initialData={selectedNote || {}}
            onSubmit={handleNoteSubmit}
            setAddNoteModalVisible={setAddNoteModalVisible}
            fieldsToEdit={fieldsToEdit}
            data={data}
            noteModule={noteModule}
            setSelectedData={setSelectedData}
            selectedData={selectedData}
          />
        </Dialog.Description>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddDomainNoteModal;
