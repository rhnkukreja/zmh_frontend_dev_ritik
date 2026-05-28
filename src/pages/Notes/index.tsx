import React, { useEffect, useState } from "react";
import SubSidebar from "./components/SubSidebar";
import NotesList from "./components/NotesList";
import NoteDetails from "./components/NoteDetails";
import Header from "./components/Header";

import { useAppSelector } from "@/stores/hooks";

import {
  clearSelectedNote,
  deleteFolder,
  fetchFolders,
  removeAllNotes,
  setSelectedFolder,
  setSelectedGroup,
  setSelectedNote,
} from "@/stores/notesSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/stores/store";
import EmptyState from "./components/EmptyState";
import Lucide from "@/components/Base/Lucide";
import AddDomainNoteModal from "@/components/DomainNotes/AddDomainNotesModal";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { fetchDomainNotes, fetchInstitutionHierarchyNotes, fetchCompanyHierarchyNotes } from "@/stores/domainNotesSlice";

const Notes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "institution" | "other" | "company"
  >("institution");
  const { user } = useAppSelector((state) => state.authentiction);
  const { selectedFolder } = useAppSelector((state) => state.notes);
  const isCorporateUser = user?.user_role?.toLowerCase() === "corporate";
  const [companyName, setCompanyName] = useState<string>("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);
  const dispatch = useDispatch<AppDispatch>();
  const { selectedNote, selectedGroup } = useAppSelector(
    (state) => state.notes
  );
  const handleTabSwitch = (activeTab: "institution" | "other" | "company") => {
    if (isCorporateUser && activeTab !== "institution") {
      return;
    }

    setActiveTab(activeTab);
    
    // Clear selections when switching tabs to allow auto-selection
    if (activeTab === "other") {
      setCompanyName("");
      setInstitutionName("");
      setSelectedInstitution("");
      setSelectedCompany("");
      dispatch(setSelectedGroup(null));
      dispatch(setSelectedNote(null));
    } else {
      // For institution/company tabs, clear all selections to trigger auto-selection
      setSelectedInstitution("");
      setSelectedCompany("");
      dispatch(setSelectedFolder(null));
      dispatch(setSelectedNote(null));
    }

    // Fetch hierarchy data when switching tabs
    if (activeTab === "institution") {
      dispatch(fetchInstitutionHierarchyNotes());
    } else if (activeTab === "company") {
      dispatch(fetchCompanyHierarchyNotes());
    }
  };
  const fetchData = async () => {
    if (activeTab === "institution") {
      // Refresh institution hierarchy for institution tab
      await dispatch(fetchInstitutionHierarchyNotes());
    } else if (activeTab === "company") {
      // Refresh company hierarchy for company tab
      await dispatch(fetchCompanyHierarchyNotes());
    } else if (selectedGroup.institution_id && selectedGroup.company_id) {
      const dynamicURL = createDynamicURL(
        `${baseURL}/user/domain_notes/`,
        {
          institution_id: JSON.stringify(selectedGroup.institution_id),
          company_id: JSON.stringify(selectedGroup.company_id),
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
  useEffect(() => {
    if (isCorporateUser && activeTab !== "institution") {
      setActiveTab("institution");
      return;
    }

    dispatch(setSelectedGroup(null));
    // Fetch hierarchy data on mount based on active tab
    if (activeTab === "institution") {
      dispatch(fetchInstitutionHierarchyNotes());
    } else if (activeTab === "company") {
      dispatch(fetchCompanyHierarchyNotes());
    }
  }, [dispatch, activeTab, isCorporateUser]);

  const visibleTabs = isCorporateUser
    ? ["institution" as const]
    : (["institution", "company", "other"] as const);
  return (
    <div className="container m-auto h-[calc(100vh-70px)] flex flex-col my-[-35px] pb-[30px]">
      <div className="w-full flex justify-between px-4 py-6 bg-white dark:bg-darkmode-800">
        <div className="flex gap-4">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${
                activeTab === tab
                  ? "bg-primary text-white shadow"
                  : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
              }`}
              onClick={() => handleTabSwitch(tab)}
            >
              {tab === "institution"
                ? "Institution"
                : tab === "company"
                  ? "Company"
                  : "Other"}
            </button>
          ))}
        </div>
        {activeTab === "institution" || activeTab === "company" ? (
          <button
            className="flex items-center gap-x-2 px-4 py-2 text-white bg-primary border-primary dark:border-primary rounded "
            onClick={() => setAddNoteModalVisible(true)}
          >
            <Lucide icon="Plus" className="w-4 h-4" />
            Add Notes
          </button>
        ) : null}
      </div>

      <div className="flex h-full">
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

        <div className="flex flex-col ml-5 overflow-hidden w-full">
          <Header />
          <div className="flex flex-col lg:flex-row lg:flex-1 h-full pb-2 bg-white dark:bg-darkmode-800 rounded-b-lg p-4">
            {activeTab === "institution" && (
              <>
                {selectedInstitution && selectedCompany ? (
                  <div className="w-full h-full">
                    <NoteDetails
                      activeTab={activeTab}
                      companyName={companyName}
                      institutionName={institutionName}
                      selectedInstitution={selectedInstitution}
                      selectedCompany={selectedCompany}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon="NotebookPen"
                    message={!selectedInstitution ? "Select an institution" : "Select a company"}
                  />
                )}
              </>
            )}
            {activeTab === "company" && (
              <>
                {selectedCompany && selectedInstitution ? (
                  <div className="w-full h-full">
                    <NoteDetails
                      activeTab={activeTab}
                      companyName={companyName}
                      institutionName={institutionName}
                      selectedInstitution={selectedInstitution}
                      selectedCompany={selectedCompany}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon="NotebookPen"
                    message={!selectedCompany ? "Select a company" : "Select an institution"}
                  />
                )}
              </>
            )}
            {activeTab === "other" && (
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
            )}

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
  );
};

export default Notes;
