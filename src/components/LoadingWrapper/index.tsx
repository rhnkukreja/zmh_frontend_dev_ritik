import React from "react";
import LoadingIcon from "../Base/LoadingIcon";

interface LoadingWrapperProps {
  height: number;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ height }) => {
  return (
    <div
      className="flex my-6 flex-col justify-center items-center px-4 box box--stacked"
      style={{ minHeight: height }}
    >
      <div className="flex flex-col items-center justify-end">
        <LoadingIcon icon="tail-spin" className="w-8 h-8" />
        <div className="mt-2 text-center text-gray-700 font-semibold">
          Loading...
        </div>
      </div>
    </div>
  );
};

export default LoadingWrapper;
