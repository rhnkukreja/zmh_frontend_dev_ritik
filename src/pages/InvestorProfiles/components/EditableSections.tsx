import React, { useEffect, useState, useRef } from "react";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { updateInvestersProfile } from "@/stores/investersProfileSlice";
import { InvestersProfile } from "@/types/investerProfiles";
import LoadingWrapper from "@/components/LoadingWrapper";
import ParceHtml from "@/components/ParseHtml";

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

  const { user } = useAppSelector((state) => state.authentiction);

  const handleSave = async () => {
    setLoading(true);
    dispatch(updateInvestersProfile({ id, data: { [field]: value } }));
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

  return (
    <div className="box border-none ">
      {fetchloading && loading === false ? (
        <LoadingWrapper height={300} />
      ) : (
        <>
          <div className="flex flex-row justify-between items-center px-4 py-3.5 border-b-2 border-gray-100 ">
            <h4 className="text-[18px]  font-semibold text-left py-1 leading-none ">
              {title}
            </h4>

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
          </div>
          {isEditing ? (
            <div className="flex  flex-col px-4 py-3  ">
              <div ref={editorRef}>
                <ClassicEditor value={value} onChange={setValue} />
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
                <div className="flex  flex-col px-4 py-3    ">
                  <ParceHtml htmlString={renderHtml} />
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EditableSection;
