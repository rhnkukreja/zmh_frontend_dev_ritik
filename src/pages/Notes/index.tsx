import React from "react";
import SubSidebar from "./components/SubSidebar";
import NotesList from "./components/NotesList";
import NoteDetails from "./components/NoteDetails";
import Header from "./components/Header";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";

const Notes: React.FC = () => {
  const { selectedFolder } = useAppSelector((state) => state.notes);

  return (
    <div className="h-full flex flex-col my-[-35px] ml-[-20px] pb-[30px] ">
      <div className="flex h-full">
        <SubSidebar />

        <div className=" flex flex-col  ml-5  overflow-hidden w-full ">
          <div>
            <Header />
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-1 h-screen pb-2 bg-white">
            {selectedFolder === null ? (
              <div className="flex items-center justify-center h-full flex-col w-full">
                <Lucide
                  icon="NotebookPen"
                  className=" text-gray-200 stroke-[1.3] w-[20%] h-[20%] ml-2  cursor-pointer"
                />
                <p className="text-gray-400 text-xl">No folder selected</p>
              </div>
            ) : (
              <>
                <div className="lg:w-2/5 w-full h-full">
                  <NotesList />
                </div>

                <div className="lg:w-3/5 w-full  h-full">
                  <NoteDetails />
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
