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
  CompanyNotesTab,
  fetchInstitutionHierarchyNotes,
  fetchCompanyHierarchyNotes,
  resetCompanyNotesTabs,
  setCompanyNotesTab,
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
  const {
    loadingInstitutionHierarchy,
    loadingCompanyHierarchy,
    companyHierarchy,
    companyHierarchyByTab,
    companyNotesTab,
  } = useAppSelector((state) => state.domainNotes);
  const { companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );
  const companyNotesKey = activeTab === "company" ? companyGlobalSearchName : "";

  const fetchData = async () => {
    if (activeTab === "institution") {
      await dispatch(fetchInstitutionHierarchyNotes());
      return;
    }

    await Promise.all(
      (["Private", "Shared"] as CompanyNotesTab[]).map((tabName) =>
        dispatch(fetchCompanyHierarchyNotes(tabName))
      )
    );
  };

  useEffect(() => {
    setCompanyName("");
    setInstitutionName("");
    setSelectedInstitution("");
    setSelectedCompany("");
    dispatch(setSelectedFolder(null));
    dispatch(setSelectedGroup(null));
    dispatch(setSelectedNote(null));

    if (activeTab === "institution") {
      const request = dispatch(fetchInstitutionHierarchyNotes());
      return () => request.abort();
    }

    dispatch(resetCompanyNotesTabs());
    const requests = (["Private", "Shared"] as CompanyNotesTab[]).map(
      (tabName) => dispatch(fetchCompanyHierarchyNotes(tabName))
    );

    return () => requests.forEach((request) => request.abort());
  }, [dispatch, activeTab, companyNotesKey]);

  const hasSelection = Boolean(selectedInstitution && selectedCompany);
  const isHierarchyLoading =
    activeTab === "institution" ? loadingInstitutionHierarchy : loadingCompanyHierarchy;
  const hasCompanyTabNotes = companyHierarchy.some((company) =>
    Object.values(company?.sub_heading || {}).some(
      (notes) => Array.isArray(notes) && notes.length > 0
    )
  );
  const showCompanyEmptyState =
    activeTab === "company" && !loadingCompanyHierarchy && !hasCompanyTabNotes;

  const handleCompanyNotesTabChange = (tabName: CompanyNotesTab) => {
    const targetHierarchy = companyHierarchyByTab[tabName] || [];
    let firstSelection: { companyName: string; institutionName: string } | undefined;

    for (const company of targetHierarchy) {
      const institutionName = Object.entries(company?.sub_heading || {}).find(
        ([, notes]) => Array.isArray(notes) && notes.length > 0
      )?.[0];

      if (institutionName) {
        firstSelection = { companyName: company.main_heading, institutionName };
        break;
      }
    }

    setSelectedCompany(firstSelection?.companyName || "");
    setSelectedInstitution(firstSelection?.institutionName || "");
    dispatch(setSelectedNote(null));
    dispatch(setCompanyNotesTab(tabName));
  };

  return (
    <div className="container m-auto flex h-full min-h-0 flex-col overflow-hidden pb-3 pt-0">
      <div className="mb-2 flex rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:h-[58px] md:items-center">
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span className="text-slate-500">{sectionLabel}</span>
          <span className="text-slate-400">›</span>
          <span>{pageLabel}</span>
        </h1>
      </div>
      {activeTab === "company" && (
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(["Private", "Shared"] as CompanyNotesTab[]).map((tabName) => {
              const isActive = companyNotesTab === tabName;

              return (
                <button
                  key={tabName}
                  type="button"
                  onClick={() => handleCompanyNotesTabChange(tabName)}
                  className={`min-w-[110px] rounded-lg border px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 ${
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {tabName}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-x-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            onClick={() => setAddNoteModalVisible(true)}
          >
            <Lucide icon="Plus" className="h-4 w-4" />
            Add Notes
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-darkmode-800">
        <div className="flex h-full min-h-0 flex-1">
          {!showCompanyEmptyState && (
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
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-darkmode-800">
            {activeTab === "institution" && (
              <div className="flex justify-end border-b border-slate-200 px-6 py-4">
                <button
                  className="inline-flex items-center gap-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                  onClick={() => setAddNoteModalVisible(true)}
                >
                  <Lucide icon="Plus" className="h-4 w-4" />
                  Add Notes
                </button>
              </div>
            )}

            <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50/40 p-5 dark:bg-darkmode-800">
              {showCompanyEmptyState ? (
                <div className="flex h-full min-h-0 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <Lucide icon="FileText" className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-700">No notes found</p>
                  <p className="mt-1 text-sm text-slate-400">
                    There are no notes available in the {companyNotesTab.toLowerCase()} tab.
                  </p>
                </div>
              ) : isHierarchyLoading ? (
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
