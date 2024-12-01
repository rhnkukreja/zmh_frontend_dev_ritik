import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { FolderData } from "@/types/notes";
import React, { useEffect, useState } from "react";
import { AddFoldersModal } from "../AddFolderModal";
import {
  clearSelectedFolder,
  fetchFolders,
  setSelectedFolder,
} from "@/stores/notesSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";

import { updateQueryParams } from "@/utils/helper";
import { useSearchParams } from "react-router-dom";

const SubSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const { folders, loading, selectedFolder } = useAppSelector(
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
    dispatch(clearSelectedFolder());
  };

  function handleEditFolder(folder: FolderData) {
    setAddNotesModalVisible(true);
    handleFolderClick(folder);
  }

  const onClickFolder = (folder: FolderData) => {
    handleFolderClick(folder);
  };

  useEffect(() => {
    if (!selectedFolder?.id) return;
    updateQueryParams({
      id: selectedFolder?.id,
      folder: selectedFolder?.folder,
    });
  }, [selectedFolder]);

  useEffect(() => {
    if (folders?.length > 0 && !selectedFolder) {
      dispatch(setSelectedFolder(folders[0]));
    }
  }, [folders]);

  const onClickCancel = () => {
    if (!selectedFolder) {
      const id = searchParams.get("id");
      if (id) {
        const lastSelectedFolder = folders?.find(
          (folder: FolderData) => folder?.id === Number(id)
        );
        dispatch(setSelectedFolder(lastSelectedFolder));
      }
    }
    setAddNotesModalVisible(false);
  };

  return (
    <div className="w-64  bg-white border-r  ml-2   h-full">
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

      {/* <div className="flex justify-between px-4 ">
        <span>All Notes</span>
        <span className="font-semibold text-sm text-gray-500">276</span>
      </div> */}

      <FolderList
        folders={folders}
        handleEditFolder={handleEditFolder}
        selectedFolder={selectedFolder}
        onClickFolder={onClickFolder}
      />

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
          selectedFolder={selectedFolder}
          onClickCancel={onClickCancel}
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
}: {
  folders: FolderData[];
  handleEditFolder: (folder: FolderData) => void;
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
