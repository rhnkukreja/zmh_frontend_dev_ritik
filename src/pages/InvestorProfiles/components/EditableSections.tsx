import React, { useEffect, useState, useRef } from "react";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { updateInvestersProfile } from "@/stores/investersProfileSlice";
import { InvestersProfile } from "@/types/investerProfiles";
import LoadingWrapper from "@/components/LoadingWrapper";



interface EditableSectionProps {
  id: number;
  title: string;

  field: keyof InvestersProfile;
  fetchloading: boolean;
  renderHtml: string;

  type: string;
  expanded?: boolean; 
  onToggle?: () => void;
  toggleAllGroups?: () => void;
  areAllGroupsExpanded?: () => boolean;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  id,
  title,

  field,
  fetchloading,
  renderHtml,

  type,
  expanded,
  onToggle,
  toggleAllGroups,
  areAllGroupsExpanded,
}) => {

  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string>(renderHtml);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const { user } = useAppSelector((state) => state.authentiction);
  const handleSave = async () => {
    setLoading(true);
    dispatch(
      updateInvestersProfile({ id, type: type, data: { [field]: value } })
    );
    setLoading(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(renderHtml);
  };

  useEffect(() => {
    if (!isEditing) {
      setValue(renderHtml);
    }
  }, [renderHtml, isEditing]);

  const handleChange = (value: string) => {
    setValue(value);
  };
useEffect(() => {
  const applyAttributes = () => {
    const elements = document.querySelectorAll(`.html-link a`);
    
    elements.forEach((link) => {
      const anchor = link as HTMLAnchorElement;
      if (anchor.href) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      }
    });
  };
  const timeout = setTimeout(applyAttributes, 0);

  return () => clearTimeout(timeout);
}, [renderHtml]);

  return (
    <div className="box border-none ">
      {fetchloading && loading === false ? (
        <LoadingWrapper height={300} />
      ) : (
        <>
         <div
         className={`flex flex-row justify-between items-center px-4 py-3.5 border-b-2 border-gray-100 ${
        title !== "Summary" && "bg-gray-50 hover:bg-primary/5 cursor-pointer"
        }`}
          onClick={title !== "Summary" && onToggle}
       >
            <h4 className="text-[18px]  font-semibold text-left py-1 leading-none text-black ">
              {title} 
            </h4>
          <div>
            {user?.user_type === "Admin" && (
              <>
                {isEditing === true ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="px-3 mr-3"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    elevated
                    size="sm"
                    className="px-3 exclude-from-pdf"
                    onClick={() => setIsEditing(true)}
                  >
                    <Lucide
                      icon="PenSquare"
                      className="w-4 h-4 mr-1.5 stroke-[1.3] "
                    />
                    {renderHtml ? "Edit" : "Add"}
                  </Button>
                )}
              </>
            )} 
        {title == "Summary" ?
         <button onClick={toggleAllGroups}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
                            >
                           
                           {areAllGroupsExpanded() ? "Collapse All" : "Expand All"} 
                           <Lucide icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"} className="w-4 h-4" />
                          </button>
        :<button
             className="transition-colors  duration-200 font-medium text-lg">
             <span className="ml-2 text-primary font-bold">{expanded ? '▲' : '▼'}</span>
       </button>}
          </div>
          </div>
          {expanded && <>
 {isEditing ? (
            <div className="flex  flex-col px-4 py-3  ">
              <div ref={editorRef}>
               
                <ClassicEditor  value={value} onChange={setValue}  hideToolbar={user?.user_type !== "Admin"} disabled = {user?.user_type !== "Admin" || !isEditing} />
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  variant="primary"
                  className="px-6"
                  onClick={handleSave}
                >
                  {loading && (
                    <Lucide
                      icon="Loader"
                      className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {renderHtml ? (
                <div className="flex flex-col px-4 py-3">
                <div className="html-link">
                  <ClassicEditor value={renderHtml} onChange={setValue}  hideToolbar={user?.user_type !== "Admin"} disabled = {user?.user_type !== "Admin" || !isEditing}  />
                </div>
                </div>
              ) : null}
            </>
          )}
          </>}
         
        </>
      )}
    </div>
  );
};

export default EditableSection;
