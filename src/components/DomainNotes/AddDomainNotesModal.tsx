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
      
      <Dialog.Panel>
        <Dialog.Title className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === "edit" ? "Edit note" : "New note"}
          </h2>
          <button
            onClick={() => setAddNoteModalVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition"
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>
        <Dialog.Description>
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
