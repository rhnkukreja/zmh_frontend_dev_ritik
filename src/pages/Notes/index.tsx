import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/stores/hooks";
import SubSidebar from "./components/SubSidebar";
import NoteDetails from "./components/NoteDetails";
import Lucide from "@/components/Base/Lucide";
import AddDomainNoteModal from "@/components/DomainNotes/AddDomainNotesModal";
import { AppDispatch } from "@/stores/store";
import {
  setSelectedFolder,
  setSelectedGroup,
  setSelectedNote,
} from "@/stores/notesSlice";
import {
  fetchInstitutionHierarchyNotes,
  fetchCompanyHierarchyNotes,
} from "@/stores/domainNotesSlice";

const NoteDetailsSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
    <div className="border-b border-slate-200 px-5 py-4">
      <div className="h-7 w-2/3 animate-pulse rounded-lg bg-slate-100" />
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-7/12 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-5 flex justify-end">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
      <div className="flex min-h-[120px] flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-9/12 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-8/12 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="mt-5 flex justify-end">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  </div>
);

const Notes: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const activeTab: "institution" | "company" =
    location.pathname === "/institution-notes" ? "institution" : "company";
  const sectionLabel = activeTab === "institution" ? "Institution Insights" : "Company";
  const pageLabel = activeTab === "institution" ? "Notes" : "Meeting Notes";

  const [companyName, setCompanyName] = useState<string>("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [addNoteModalVisible, setAddNoteModalVisible] = useState<boolean>(false);
  const { loadingInstitutionHierarchy, loadingCompanyHierarchy } = useAppSelector(
    (state) => state.domainNotes
  );

  const fetchData = async () => {
    if (activeTab === "institution") {
      await dispatch(fetchInstitutionHierarchyNotes());
      return;
    }

    await dispatch(fetchCompanyHierarchyNotes());
  };

  useEffect(() => {
    setCompanyName("");
    setInstitutionName("");
    setSelectedInstitution("");
    setSelectedCompany("");
    dispatch(setSelectedFolder(null));
    dispatch(setSelectedGroup(null));
    dispatch(setSelectedNote(null));

    void fetchData();
  }, [dispatch, activeTab]);

  const hasSelection = Boolean(selectedInstitution && selectedCompany);
  const isHierarchyLoading =
    activeTab === "institution" ? loadingInstitutionHierarchy : loadingCompanyHierarchy;

  return (
    <div className="container m-auto flex h-full min-h-0 flex-col overflow-hidden pt-3 pb-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 mb-3">
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span className="text-slate-500">{sectionLabel}</span>
          <span className="text-slate-400">›</span>
          <span>{pageLabel}</span>
        </h1>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-darkmode-800">
        <div className="flex h-full min-h-0 flex-1">
          <SubSidebar
            activeTab={activeTab}
            setCompanyName={setCompanyName}
            setInstitutionName={setInstitutionName}
            companyName={companyName}
            institutionName={institutionName}
            selectedInstitution={selectedInstitution}
            setSelectedInstitution={setSelectedInstitution}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-darkmode-800">
            <div className="flex justify-end border-b border-slate-200 px-6 py-4">
              <button
                className="inline-flex items-center gap-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                onClick={() => setAddNoteModalVisible(true)}
              >
                <Lucide icon="Plus" className="h-4 w-4" />
                Add Notes
              </button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50/40 p-5 dark:bg-darkmode-800">
              {isHierarchyLoading ? (
                <div className="h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <NoteDetailsSkeleton />
                </div>
              ) : hasSelection ? (
                <div className="h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <NoteDetails
                    key={`${activeTab}-${selectedInstitution}-${selectedCompany}`}
                    activeTab={activeTab}
                    companyName={companyName}
                    institutionName={institutionName}
                    selectedInstitution={selectedInstitution}
                    selectedCompany={selectedCompany}
                  />
                </div>
              ) : (
                <div className="h-full min-h-0 w-full rounded-xl border border-slate-200 bg-white shadow-sm" />
              )}

              {/* {activeTab === "other" && (
                <>
                  {selectedFolder === null ? (
                    <EmptyState icon="NotebookPen" message="No folder selected" />
                  ) : (
                    <>
                      <div className="lg:w-2/5 w-full h-full">
                        <NotesList activeTab={activeTab} />
                      </div>

                      <div className="lg:w-3/5 w-full h-full">
                        <NoteDetails activeTab={activeTab} />
                      </div>
                    </>
                  )}
                </>
              )} */}

              {addNoteModalVisible && (
                <AddDomainNoteModal
                  mode={"add"}
                  addNoteModalVisible={addNoteModalVisible}
                  setAddNoteModalVisible={setAddNoteModalVisible}
                  title="Create New Note"
                  noteModule={true}
                  fetchData={fetchData}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;
