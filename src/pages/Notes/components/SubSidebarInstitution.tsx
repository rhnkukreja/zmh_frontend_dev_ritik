import React, { } from "react";
import { useAppDispatch } from "@/stores/hooks";

import { useNavigate } from "react-router-dom";

const SubSidebarInstitution: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    // const [searchParams] = useSearchParams();

    return (
        <div className="w-64 bg-white dark:bg-darkmode-700 border-r border-gray-300 dark:border-darkmode-500 ml-2 h-full shadow-sm rounded-md mt-1">

            <div className="flex justify-center items-center h-screen">
                <span className="text-gray-500">No Notes Found</span>
            </div>

        </div>
    );
};

export default SubSidebarInstitution;
