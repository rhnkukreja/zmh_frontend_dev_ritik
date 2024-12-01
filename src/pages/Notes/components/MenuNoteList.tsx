import { useEffect, useState } from "react";
import { Menu } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { twMerge } from "tailwind-merge";

export default function MenuNoteList() {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  useEffect(() => {
    return () => {
      setIsSubmenuOpen(false);
    };
  }, []);

  return (
    <Menu>
      <Menu.Button className="w-5 h-5 text-slate-500">
        <Lucide icon="MoreVertical" className="w-4 h-4" />
      </Menu.Button>
      <Menu.Items className="w-48 bg-white z-50" placement="bottom-end">
        <Menu.Item>
          <Lucide icon="Trash" className="w-4 h-4 mr-2" /> Delete
        </Menu.Item>
        {/* <Menu.Item>
          <Lucide icon="Pin" className="w-4 h-4 mr-2" /> Pin
        </Menu.Item>
        <Menu.Item>
          <Lucide icon="Copy" className="w-4 h-4 mr-2" /> Duplicate Note
        </Menu.Item>

        <div
          className="relative"
          onClick={() => setIsSubmenuOpen((prev) => !prev)}
        >
          <div
            className={twMerge(
              "cursor-pointer flex items-center justify-between p-2 transition duration-300 ease-in-out rounded-lg hover:bg-slate-100 dark:bg-darkmode-600 dark:hover:bg-darkmode-400"
            )}
          >
            <div className="flex items-center">
              <Lucide icon="MoveDiagonal" className="w-4 h-4 mr-2" /> Move to
            </div>
            <Lucide icon="ChevronRight" className="w-4 h-4 text-gray-500" />
          </div>

          {isSubmenuOpen && (
            <div className="absolute top-0 right-full w-48 bg-white shadow-md rounded-md z-50">
              <Menu.Item>
                <Lucide icon="Folder" className="w-4 h-4 mr-2" /> Folder 1
              </Menu.Item>
              <Menu.Item>
                <Lucide icon="Folder" className="w-4 h-4 mr-2" /> Folder 2
              </Menu.Item>
              <Menu.Item>
                <Lucide icon="Folder" className="w-4 h-4 mr-2" /> Folder 3
              </Menu.Item>
            </div>
          )}
        </div> */}
      </Menu.Items>
    </Menu>
  );
}
