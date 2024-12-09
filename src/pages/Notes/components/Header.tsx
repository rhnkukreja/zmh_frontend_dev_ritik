import Button from "@/components/Base/Button";
import React from "react";
import AddButton from "./AddButton";

const Header: React.FC = () => {
  return (
    <div className="py-3 flex justify-end items-center ">
      <div className="space-x-4">
        <AddButton />
      </div>
    </div>
  );
};

export default Header;
