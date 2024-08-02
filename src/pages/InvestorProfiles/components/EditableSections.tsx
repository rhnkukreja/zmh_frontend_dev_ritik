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
}

const EditableSection: React.FC<EditableSectionProps> = ({
  id,
  title,

  field,
  fetchloading,
  renderHtml,
}) => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string>(renderHtml);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);


  const {
    user
   } = useAppSelector((state) => state.authentiction);

  const handleSave = async () => {
    setLoading(true);
    dispatch(updateInvestersProfile({ id, data: { [field]: value } }));
    setLoading(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(renderHtml); // Reset the value to initial
  };

  useEffect(() => {
    if (!isEditing) {
      setValue(renderHtml); // Ensure the value is updated when not editing
    }
  }, [renderHtml, isEditing]);

  return (
    <div className="flex flex-col w-full ">
      <div className="flex flex-row justify-between items-center px-4 py-3 box ">
        <h4 className="text-[18px] font-bold text-left  leading-none text-primary">
          {title}
        </h4>

       {user?.user_type === "Admin" && <Button
          variant="secondary"
          elevated
          className="px-6"
          onClick={() => setIsEditing((prevState) => !prevState)}
        >
          <Lucide icon="PenSquare" className="w-4 h-4 mr-1.5 stroke-[1.3]" />
          Edit
        </Button>}
      </div>
      {fetchloading && loading === false ? (
        <LoadingWrapper height={300} />
      ) : (
        <>
          {isEditing ? (
            <div className="flex my-8 flex-col px-6 py-6 box ">
              <div ref={editorRef}>
                <ClassicEditor value={value} onChange={setValue} />
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="secondary"
                  className="px-3 mr-3"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button variant="primary" className="px-8" onClick={handleSave}>
                  {loading && (
                    <Lucide
                      icon="Loader"
                      className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                  )}
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex my-8 flex-col px-4 pt-4 box">
              <div
                className="text-slate-500 mt-0.5 my-3 text-left text-[16px] leading-[25px]"
                dangerouslySetInnerHTML={{ __html: renderHtml }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditableSection;
