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

const getCompanyId = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => Number(note?.company || note?.company_id || fallback?.company_id || 0);

const getInstitutionId = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => Number(note?.institution || note?.institution_id || fallback?.institution_id || 0);

const getInstitutionDisplayName = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => note?.institution_name || note?.investor_name || fallback?.institution_name || "";

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
        : getCompanyId(selectedNote, data),
    institution: getInstitutionId(selectedNote, data),
    investor_name: getInstitutionDisplayName(selectedNote, data),
    company_name: selectedNote?.company_name || data?.company_name || "",
  });

  useEffect(() => {
    if (selectedNote && mode === "edit") {
      setSelectedData({
        company:
          isCorporateUser && corporateCompanyId
            ? corporateCompanyId
            : getCompanyId(selectedNote, data),
        institution: getInstitutionId(selectedNote, data),
        investor_name: getInstitutionDisplayName(selectedNote, data),
        company_name: selectedNote.company_name || data?.company_name || "",
      });
    }
  }, [
    selectedNote,
    mode,
    isCorporateUser,
    corporateCompanyId,
    data?.company_id,
    data?.company_name,
    data?.institution_id,
    data?.institution_name,
  ]);

  useEffect(() => {
    if (isCorporateUser && corporateCompanyId) {
      setSelectedData((prev) => ({
        ...prev,
        company: corporateCompanyId,
        company_name: user?.company_name,
      }));
    }
  }, [isCorporateUser, corporateCompanyId, user?.company_name]);
  const handleNoteSubmit = async (formData: DomainNote) => {
    function removeTrailingSpaces(htmlContent: string): string {
      const trailingTagsRegex = /^(<[^>]+>(\s|&nbsp;|<br\s*\/?>)*<\/[^>]+>|\s|&nbsp;|<br\s*\/?>)+|(<[^>]+>(\s|&nbsp;|<br\s*\/?>)*<\/[^>]+>|\s|&nbsp;|<br\s*\/?>)+$/gi;
      return htmlContent.replace(trailingTagsRegex, '');
    }
    try {
      const trimmedData = {
        ...formData,
        notes: removeTrailingSpaces(formData.notes),
        shared: Boolean(formData.shared),
      };
      if (selectedNote?.id && mode == "edit") {
        const editCompany = isCorporateUser && corporateCompanyId
          ? corporateCompanyId
          : selectedData.company || getCompanyId(selectedNote, data);
        const editInstitution =
          selectedData.institution || getInstitutionId(selectedNote, data);

        const editData: Partial<DomainNote> = {
          attendees: trimmedData.attendees,
          notes: trimmedData.notes,
          date: trimmedData.date,
          category: trimmedData.category,
          shared: trimmedData.shared,
          company: editCompany,
          institution: editInstitution,
          investor_name:
            selectedData.investor_name || selectedNote?.institution_name || selectedNote?.investor_name || "",
        };

        await dispatch(addDomainNote({ id: selectedNote.id, data: editData }));
      } else {
        if (noteModule) {
          const fallbackCompany = isCorporateUser && corporateCompanyId
            ? corporateCompanyId
            : selectedData.company || selectedNote?.company || data?.company_id || 0;

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
