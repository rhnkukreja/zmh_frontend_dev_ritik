import React, { useState } from 'react';
import { FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";

interface MultiSearchBarProps {
  onSearch: (terms: string[]) => void;
  searchTerms : string[],
  setSearchTerms : (terms: string[]) => void;

}

const MultiSearchBar: React.FC<MultiSearchBarProps> = ({ onSearch ,  searchTerms , setSearchTerms}) => {
  const [searchValue, setSearchValue] = useState("");
 

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim() !== "") {
      setSearchTerms([...searchTerms, searchValue.trim()]);
      setSearchValue("");
    }
  };

  const removeTerm = (index: number) => {
    const newTerms = searchTerms.filter((_, i) => i !== index);
    setSearchTerms(newTerms);
  };

  const handleSend = () => {
    onSearch(searchTerms);
   
  };

  return (
    <div className="relative mr-3">
      <Lucide
        icon="Search"
        className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
      />
      
      <div className="search-container">
        <FormInput
          type="text"
          placeholder="Search Institute Name"
          className="pl-9 sm:w-80 rounded-[0.5rem] relative "
          value={searchValue}
          onKeyDown={handleKeyPress}
          onChange={(e) => setSearchValue(e.target.value)}
        />

        {searchTerms.length > 0 && (
          <div className="search-terms-box bg-white mt-2 p-2 border rounded absolute z-50 left-0 right-0">
            <div className="flex flex-wrap gap-2">
              {searchTerms.map((term, index) => (
                <div
                  key={index}
                  className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-lg"
                >
                  <span className="term-text mr-2">{term}</span>
                  <button
                    className="remove-btn text-red-500 font-bold"
                    onClick={() => removeTerm(index)}
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="send-btn bg-primary text-white mt-2 p-1 rounded w-full"
              onClick={handleSend}
              disabled={!searchTerms}
            >
              Search
            </button>
          </div>
        )}
      </div>

      {searchTerms.length > 0 && <Lucide
        icon="X"
       onClick={() => setSearchTerms([])}
        className="cursor-pointer absolute inset-y-0 right-3 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500 hover:text-red-500"
      />}

    </div>
  );
};

export default MultiSearchBar;