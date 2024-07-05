import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
import { FormCheck, FormInput, FormSelect } from "@/components/Base/Form";
import TomSelect from "@/components/Base/TomSelect";
import Tippy from "@/components/Base/Tippy";
import users from "@/fakers/users";
import mails from "@/fakers/mails";
import Button from "@/components/Base/Button";
import { useState } from "react";
import clsx from "clsx";
import _ from "lodash";

function Main() {
    const [selectedUser, setSelectedUser] = useState("1");

    return (
        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
            <div className="col-span-12">
                <div className="flex flex-col mt-4 md:mt-0 md:h-10 gap-y-3 md:items-center md:flex-row">
                    <div className="text-base font-medium group-[.mode--light]:text-white">
                        Investor Profile
                    </div>
                    
                </div>
            </div>
        </div>
    );
}

export default Main;
