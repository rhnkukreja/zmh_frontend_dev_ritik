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
  setSelectedGroup,
} from "@/stores/notesSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";

import { createDynamicURL, updateQueryParams } from "@/utils/helper";
import { useNavigate } from "react-router-dom";
import { DeleteConfirmationModal } from "@/components/DeleteModal";
import { NotesFieldProps } from "./NotesList";
import {
  fetchDomainNotes,
  fetchDomainNotesDropDownValuesByCompany,
  fetchDomainNotesDropDownValuesByInstitution,
} from "@/stores/domainNotesSlice";
import { baseURL } from "@/constant";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/stores/store";

const SubSidebar: React.FC<NotesFieldProps> = ({
  activeTab,
  setCompanyName,
  setInstitutionName,
  companyName,
  institutionName,
}) => {
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

  const { folders, loading, selectedFolder, selectedNote, selectedGroup } =
    useAppSelector((state) => state.notes);

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
    <div className={`${activeTab === "other" ? "w-[22rem]" : "w-[17rem]"} bg-white dark:bg-darkmode-700 border-r border-gray-300 dark:border-darkmode-500 h-full shadow-sm rounded-md mt-2 box-border`}>
      {activeTab === "other" && (
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
      )}

      {activeTab === "other" && (
        <FolderList
          folders={folders}
          handleEditFolder={handleEditFolder}
          onClickDeleteIcon={onClickDeleteIcon}
          selectedFolder={selectedFolder}
          onClickFolder={onClickFolder}
        />
      )}

      {activeTab !== "other" && (
        <InstitutionOrCompanyList
          isCompany={activeTab == "company" ? true : false}
          setCompanyName={setCompanyName}
          setInstitutionName={setInstitutionName}
          selectedGroup={selectedGroup}
          activeTab={activeTab}
          companyName={companyName}
          institutionName={institutionName}
        />
      )}

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
          description={`Are you sure you want to delete <strong>"${
            folderToBeDeleted?.folder || ""
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
                <div className="h-6">
                {hoveredFolderId === folder?.id && (
                  <div className="flex">
                    <div
                      className="w-6 h-6 flex items-center justify-center  ml-2 cursor-pointer"
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
                      className="w-6 h-6 rounded-full flex items-center justify-center ml-2 cursor-pointer"
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
  selectedGroup,
  activeTab,
  companyName,
  institutionName,
}: {
  isCompany: boolean;
  setCompanyName: React.Dispatch<React.SetStateAction<string>>;
  setInstitutionName: React.Dispatch<React.SetStateAction<string>>;
  selectedGroup: {
    name: string;
    institution_id?: number | null;
    company_id?: number | null;
    institutionName?: string | null;
    companyName?: string | null;
  } | null;
  activeTab: string;
  companyName: string;
  institutionName: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSelectedName("");
  }, [isCompany]);

  const { results } = useAppSelector((state) => state.domainNotes);

  const dropdownData = useSelector((state: RootState) =>
    isCompany
      ? state.domainNotes.companyDropDown
      : state.domainNotes.institutionDropDown
  );

  const isLoading = useSelector((state: RootState) =>
    isCompany
      ? state.domainNotes.loadingCompanyDropdown
      : state.domainNotes.loadingInstitutionDropdown
  );
  useEffect(() => {
    const dynamicURL = createDynamicURL(
      `${baseURL}/user/domain_notes/`,
      {
        institution_name: institutionName,
        company_name: companyName,
      },
      undefined
    );
    dispatch(fetchDomainNotes(dynamicURL));
  }, [dispatch, companyName, institutionName]);
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

  const handleSelect = (item: any) => {
    const name = item.name;
    setSelectedName(name);
    setSearchTerm("");
    setShowDropdown(false); // Close dropdown

    if (isCompany) {
      setCompanyName(name);
      dispatch(
        setSelectedGroup({
          company_id: item.company,
          companyName:item.name,
          institution_id: null,
          institutionName:null,
          name: "",
          data: [],
        })
      );
    } else {
      setInstitutionName(name);
      dispatch(
        setSelectedGroup({
          company_id: null,
          institution_id: item.institution,
          institutionName:item.name,
          companyName:null,
          name: "",
          data: [],
        })
      );
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
  const key = activeTab === "company" ? "institution_name" : "company_name";
  const listItems = dropdownData?.[isCompany ? "company" : "institution"] || [];
  const groupByValue = (array: any) => {
    const grouped = array.reduce((acc, note) => {
      const companyName = note[key];
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(note);
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, value]) => ({
   
      institution_id: isCompany
        ? value[0]?.institution
        : selectedGroup?.institution_id,
      company_id: isCompany ? selectedGroup?.company_id : value[0]?.company,
      institutionName:selectedGroup?.institutionName,
      companyName:selectedGroup?.companyName,
      name: key,
      data: value as any[],

    }));
  };

  const groupedData = groupByValue(results);

  return (
    <div className="w-full px-4 py-6 rounded-lg h-screen">
      <div className="sticky top-0 pb-4 z-10">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${isCompany ? "companies" : "institutions"}...`}
          className="w-50 px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2"
          style={{
            boxShadow: showDropdown ? "0 0 0 2px #a0143c" : undefined,
            borderColor: showDropdown ? "#a0143c" : undefined,
          }}
          onFocus={() => {
            if (searchTerm.trim()) setShowDropdown(true);
          }}
        />
        {showDropdown && (
          <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-[100%] mt-1 max-h-60 overflow-y-auto transition-all duration-200">
            {isLoading ? (
              <li className="px-4 py-2 text-sm text-gray-500">Loading...</li>
            ) : listItems.length > 0 ? (
              listItems.map((item: any, idx: number) => (
                <li
                  key={idx}
                  onClick={() => handleSelect(item)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {item?.name}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500">
                No results found
              </li>
            )}
          </ul>
        )}
      </div>

      {selectedName && (
        <div className="mb-4 text-sm text-gray-600 ">
       
          <span className="font-medium text-gray-800">{isCompany 
  ?  groupedData?.length > 1 ? 'Institutions' : 'Institution' 
  :  groupedData?.length > 1 ? 'Companies' : 'Company'}
</span>
        </div>
      )}
      {results?.length > 0 &&
        activeTab !== "other" &&
        (institutionName || companyName) && (
          <div>
            {groupedData?.map((result, index) => (
              <div
                key={index}
                className={clsx(
                  "relative py-4 border-b-[1px] bg-muted  pl-4 hover:bg-red-50 cursor-pointer",
                  selectedGroup?.name === result?.name ? "bg-red-50" : ""
                )}
                onClick={() => {
                  dispatch(setSelectedGroup(result));
                }}
              >
                <div className="relative flex justify-between items-czenter">
                  <h4 className="font-semibold mb-2">{result?.name}</h4>
                </div>
              </div>
            ))}
            {/* {results?.map((result, index) => (
                    <div
                      key={index}
                      className={clsx(
                        "relative py-4 border-b-[1px] bg-muted px-6 hover:bg-red-50 cursor-pointer",
                        selectedNote?.id === result?.id ? "bg-red-50" : ""
                      )}
                      onClick={() => {
                        dispatch(setSelectedNote(result)); // You may want a different action if handling differently
                      }}
                    >
                      <div className="relative flex justify-between items-center">
                        <h4 className="font-semibold mb-2">
                          {result?.[key]}
                        </h4>
                        <MenuNoteList
                          onClickDeleteIcon={() => {
                            onClickDeleteIcon(result); // Handle appropriately
                          }}
                        />
                      </div>
                      <section className="flex justify-between items-center mt-3">
                        <span className="text-xs text-muted-foreground">
                          {result?.formatted_date}
                        </span>
                      </section>
                    </div>
                  ))} */}
          </div>
        )}
    </div>
  );
};
