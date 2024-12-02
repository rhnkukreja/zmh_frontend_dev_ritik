import React from "react";
import SubSidebar from "./components/SubSidebar";
import NotesList from "./components/NotesList";
import NoteDetails from "./components/NoteDetails";
import Header from "./components/Header";

const Notes: React.FC = () => {
  return (
    <div className="h-full flex flex-col my-[-35px] ml-[-20px] pb-[30px] ">
      <div className="flex h-full">
        <SubSidebar />

        <div className=" flex flex-col  ml-5  overflow-hidden w-full ">
          <div>
            <Header />
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-1 h-screen pb-2 bg-white">
            <div className="lg:w-2/5 w-full h-full">
              <NotesList />
            </div>

            <div className="lg:w-3/5 w-full  h-full">
              <NoteDetails />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;
