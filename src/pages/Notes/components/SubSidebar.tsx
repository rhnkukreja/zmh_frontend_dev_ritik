import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { FolderData, InstitutionOrCompanyData } from "@/types/notes";
import React, { useEffect, useRef, useState } from "react";
import { AddFoldersModal } from "../AddFolderModal";
import {
  clearSelectedNote,
  deleteFolder,
  fetchFolders,
  removeAllNotes,
  setSelectedFolder,
} from "@/stores/notesSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";

import { createDynamicURL, updateQueryParams } from "@/utils/helper";
import { useNavigate } from "react-router-dom";
import { DeleteConfirmationModal } from "@/components/DeleteModal";
import { NotesFieldProps } from "./NotesList";
import { fetchDomainNotes, fetchDomainNotesDropDownValuesByCompany, fetchDomainNotesDropDownValuesByInstitution } from "@/stores/domainNotesSlice";
import { baseURL } from "@/constant";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/stores/store";



const SubSidebar: React.FC<NotesFieldProps> = ({ activeTab, setCompanyName, setInstitutionName }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // const [searchParams] = useSearchParams();
  const [isModalVisible, setModalVisible] = useState<boolean>(false);


  const [folderToBeDeleted, setFolderToBeDeleted] = useState<FolderData | null>(
    null
  );
  const [folderToBeEdited, setFolderToBeEdited] = useState<FolderData | null>(
    null
  );

  const { folders, loading, selectedFolder, selectedNote } = useAppSelector(
    (state) => state.notes
  );

  const [addNotesModalVisible, setAddNotesModalVisible] =
    useState<boolean>(false);

  useEffect(() => {
    dispatch(fetchFolders());
  }, [dispatch]);

  const handleFolderClick = (folder: FolderData) => {
    dispatch(setSelectedFolder(folder));
  };

  const onClickNewFolder = () => {
    setAddNotesModalVisible(true);
    setFolderToBeEdited(null);
  };

  function handleEditFolder(folder: FolderData) {
    setAddNotesModalVisible(true);
    setFolderToBeEdited(folder);
  }

  function onClickDeleteIcon(folder: FolderData) {
    setModalVisible(true);
    setFolderToBeDeleted(folder);
  }

  const onClickFolder = (folder: FolderData) => {
    handleFolderClick(folder);
  };

  useEffect(() => {
    if (selectedFolder?.id) {
      updateQueryParams({
        id: selectedFolder?.id,
        folder: selectedFolder?.folder,
      });
    }
  }, [selectedFolder]);

  const onClickCancel = () => {
    setFolderToBeEdited(null);
    setAddNotesModalVisible(false);
  };

  const removeSearchParams = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.search = "";
    navigate("/notes");
  };

  const handleDelete = async () => {
    try {
      if (!folderToBeDeleted) return;
      const response = await dispatch(
        deleteFolder(folderToBeDeleted?.id)
      ).unwrap();

      if (
        response?.response.status === 200 ||
        response?.response.status === 204
      ) {
        dispatch(fetchFolders());
        if (folderToBeDeleted?.id === selectedNote?.folder) {
          dispatch(clearSelectedNote());
          dispatch(removeAllNotes());
        }

        const id = new URLSearchParams(window.location.search).get("id");
        if (folderToBeDeleted?.id == Number(id)) {
          removeSearchParams();
        }
      }
    } catch (error) {
      console.error("Error deleting the item:", error);
    } finally {
      setModalVisible(false);
      setFolderToBeDeleted(null);
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-darkmode-700 border-r border-gray-300 dark:border-darkmode-500 ml-2 h-full shadow-sm rounded-md mt-2">
      {activeTab === "other" &&
        <div className="w-full flex justify-center mb-3">
          <Button
            onClick={onClickNewFolder}
            variant="soft-secondary"
            className="border-none bg-transparent py-3 w-full text-primary font-semibold hover:opacity-60"
          >
            <span className="mr-2 text-xl">+</span>
            New Folder
          </Button>
        </div>
      }

      {activeTab === "company" &&
        <div className="w-full flex justify-center mb-3 mt-5 font-bold">
          Companies
        </div>
      }

      {activeTab === "institution" &&
        <div className="w-full flex justify-center mb-3 mt-5 font-bold ">
          Institutions
        </div>
      }

      {activeTab === "other" &&
        <FolderList
          folders={folders}
          handleEditFolder={handleEditFolder}
          onClickDeleteIcon={onClickDeleteIcon}
          selectedFolder={selectedFolder}
          onClickFolder={onClickFolder}
        />
      }

      {activeTab !== "other" &&
        <InstitutionOrCompanyList
          isCompany={activeTab == "company" ? true : false}
          setCompanyName={setCompanyName}
          setInstitutionName={setInstitutionName}
        />
      }

      {folders?.length === 0 && !loading && (
        <div className="flex justify-center items-center h-screen">
          <span className="text-gray-500">No Folder Found</span>
        </div>
      )}

      {folders?.length === 0 && loading && (
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-row items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
            <LoadingIcon
              icon="three-dots"
              className="w-10 h-10 text-primary"
              color="#800000"
            />
          </div>
        </div>
      )}

      {addNotesModalVisible && (
        <AddFoldersModal
          title="Add New Folder"
          addNotesModalVisible={addNotesModalVisible}
          setAddNotesModalVisible={setAddNotesModalVisible}
          selectedFolder={folderToBeEdited}
          onClickCancel={onClickCancel}
        />
      )}

      {isModalVisible && (
        <DeleteConfirmationModal
          isVisible={isModalVisible}
          onClose={() => setModalVisible(false)}
          onConfirm={handleDelete}
          description={`Are you sure you want to delete <strong>"${folderToBeDeleted?.folder || ""
            }"</strong> ?`}
          loading={loading}
        />
      )}
    </div>
  );
};

export default SubSidebar;

const FolderList = ({
  folders,
  handleEditFolder,
  selectedFolder,
  onClickFolder,
  onClickDeleteIcon,
}: {
  folders: FolderData[];
  handleEditFolder: (folder: FolderData) => void;
  onClickDeleteIcon: (folder: FolderData) => void;
  selectedFolder: FolderData | null;
  onClickFolder: (folder: FolderData) => void;
}) => {
  const [hoveredFolderId, setHoveredFolderId] = useState<number | null>(null);

  return (
    <>
      {folders?.length > 0 && (
        <ul className="mt-4 space-y-3 text-gray-700 h-screen overflow-y-auto no-scrollbar">
          {folders?.map((folder: FolderData) => (
            <li
              key={folder?.id}
              className={clsx(
                "flex justify-between px-4 py-3 cursor-pointer relative hover:bg-gray-100",
                selectedFolder?.id === folder?.id ? "bg-gray-100" : ""
              )}
              onMouseEnter={() => setHoveredFolderId(folder?.id)}
              onMouseLeave={() => setHoveredFolderId(null)}
              onClick={() => onClickFolder(folder)}
            >
              <div className="flex items-center">
                <span className="truncate max-w-[125px]">
                  <Tippy content={folder?.folder} options={{ theme: "light" }}>
                    {folder?.folder}
                  </Tippy>
                </span>

                {hoveredFolderId === folder?.id && (
                  <div className="flex">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 ml-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFolder(folder);
                      }}
                    >
                      <Lucide
                        icon="Pen"
                        className="w-3 h-3 text-primary stroke-[1.3]"
                      />
                    </div>

                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 ml-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickDeleteIcon(folder);
                      }}
                    >
                      <Lucide
                        icon="Trash"
                        className="w-4 h-4 text-primary stroke-[1.3]"
                      />
                    </div>
                  </div>
                )}
              </div>
              <span className="font-semibold text-sm text-gray-500">
                {folder?.notes_count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};




const InstitutionOrCompanyList = ({
  isCompany,
  setCompanyName,
  setInstitutionName,
}: {
  isCompany: boolean;
  setCompanyName: React.Dispatch<React.SetStateAction<string>>;
  setInstitutionName: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);


  useEffect(() => {
    setSelectedName("");
  }, [isCompany])


  const dropdownData = useSelector((state: RootState) =>
    isCompany ? state.domainNotes.companyDropDown : state.domainNotes.institutionDropDown
  );

  const isLoading = useSelector((state: RootState) =>
    isCompany ? state.domainNotes.loadingCompanyDropdown : state.domainNotes.loadingInstitutionDropdown
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!searchTerm.trim()) return;

      setShowDropdown(true);

      if (isCompany) {
        dispatch(fetchDomainNotesDropDownValuesByCompany(searchTerm));
      } else {
        dispatch(fetchDomainNotesDropDownValuesByInstitution(searchTerm));
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm, dispatch, isCompany]);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    setSearchTerm("");
    setShowDropdown(false); // Close dropdown

    if (isCompany) {
      setCompanyName(name);
    } else {
      setInstitutionName(name);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const listItems = dropdownData?.[isCompany ? "company" : "institution"] || [];

  return (
    <div className="w-full px-4 py-6 bg-gray-50 rounded-lg shadow-inner h-screen">
      <div className="sticky top-0 bg-gray-50 pb-4 z-10">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${isCompany ? "companies" : "institutions"}...`}
          className="w-60 px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2"
          style={{
            boxShadow: showDropdown ? "0 0 0 2px #a0143c" : undefined,
            borderColor: showDropdown ? "#a0143c" : undefined,
          }}
          onFocus={() => {
            if (searchTerm.trim()) setShowDropdown(true);
          }}
        />

        {showDropdown && (
          <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-60 mt-1 max-h-60 overflow-y-auto transition-all duration-200">
            {isLoading ? (
              <li className="px-4 py-2 text-sm text-gray-500">Loading...</li>
            ) : listItems.length > 0 ? (
              listItems.map((name: string, idx: number) => (
                <li
                  key={idx}
                  onClick={() => handleSelect(name)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {name}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500">No results found</li>
            )}
          </ul>
        )}
      </div>

      {selectedName && (
        <div className="mt-4 text-sm text-gray-600">
          <span className="text-gray-500">
            Selected {isCompany ? "Company" : "Institution"}:
          </span>{" "}
          <span className="font-medium text-gray-800">{selectedName}</span>
        </div>
      )}
    </div>
  );
};

