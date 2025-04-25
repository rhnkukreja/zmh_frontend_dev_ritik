import React, { useState } from "react";
import SubSidebar from "./components/SubSidebar";
import NotesList from "./components/NotesList";
import NoteDetails from "./components/NoteDetails";
import Header from "./components/Header";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";

import {
  clearSelectedNote,
  deleteFolder,
  fetchFolders,
  removeAllNotes,
  setSelectedFolder,
} from "@/stores/notesSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/stores/store";


const Notes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"institution" | "other" | "company">("institution");
  const { selectedFolder } = useAppSelector((state) => state.notes);
  const [companyName, setCompanyName] = useState<string>("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const dispatch = useDispatch<AppDispatch>();


  const handleTabSwitch = (activeTab: "institution" | "other" | "company") => {
    setActiveTab(activeTab)
    dispatch(setSelectedFolder(null));
    setCompanyName("")
    setInstitutionName("")
  };



  return (
    <div className="h-full flex flex-col my-[-35px] ml-[-20px] pb-[30px]">
      <div className="w-full flex justify-start pl-4 py-6 bg-white dark:bg-darkmode-800">
        <div className="flex gap-4">
          <button
            className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${activeTab === "institution"
              ? "bg-primary text-white shadow"
              : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
              }`}
            onClick={() => handleTabSwitch("institution")}
          >
            Institution
          </button>
          <button
            className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${activeTab === "company"
              ? "bg-primary text-white shadow"
              : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
              }`}
            onClick={() => handleTabSwitch("company")}
          >
            Company
          </button>
          <button
            className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${activeTab === "other"
              ? "bg-primary text-white shadow"
              : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
              }`}
            onClick={() => handleTabSwitch("other")}
          >
            Other
          </button>
        </div>
      </div>


      <div className="flex h-full">
        <SubSidebar activeTab={activeTab} setCompanyName={setCompanyName} setInstitutionName={setInstitutionName} />

        <div className="flex flex-col ml-5 overflow-hidden w-full">
          <Header />
          <div className="flex flex-col lg:flex-row lg:flex-1 h-screen pb-2 bg-white dark:bg-darkmode-800 rounded-b-lg p-4">
            {activeTab === "institution" || activeTab === "company" ? (
              <>
                <div className="lg:w-2/5 w-full h-full">
                  <NotesList activeTab={activeTab} companyName={companyName} institutionName={institutionName} />
                </div>

                <div className="lg:w-3/5 w-full h-full">
                  <NoteDetails activeTab={activeTab} companyName={companyName} institutionName={institutionName} />
                </div>
              </>
            ) : selectedFolder === null && activeTab == "other" ? (
              <div className="flex items-center justify-center h-full flex-col w-full">
                <Lucide
                  icon="NotebookPen"
                  className="text-gray-200 stroke-[1.3] w-[20%] h-[20%] ml-2 cursor-pointer"
                />
                <p className="text-gray-400 text-xl">No folder selected</p>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;

