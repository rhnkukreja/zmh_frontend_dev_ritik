import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";

import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { TomSelectElement } from "@/components/Base/TomSelect";
import { GeneralSelector } from "@/components/ServerSelect";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface AddNewInvesterProfileProps {
  addNewInvesterModalVisible: boolean;
  setAddNewInvesterModalVisible: (visible: boolean) => void;
}

type FormData = {
  engagement_priorities: string;
  voting_guidelines_summary: string;
  voting_guidelines_link: string;
  reporting_expectations: string;
  esg_integration_process: string;
  references: string;
};

const AddNewInvesterProfile: React.FC<AddNewInvesterProfileProps> = ({
  addNewInvesterModalVisible,
  setAddNewInvesterModalVisible,
}) => {
  const selectRef = useRef<TomSelectElement>(null!);
  const selectParentRef = useRef(null);
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const { handleSubmit, control } = useForm<FormData>();

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;
    console.log("elDropzoneSingleRef: ", elDropzoneSingleRef);
    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        console.log("file: ", file);
        if (file?.status === "addedfile") {
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            toast.error("Something went wrong!");
          }
        }

        dropzoneInstance.removeFile(file);
      };

      dropzoneInstance.on("addedfile", handleComplete);

      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, addNewInvesterModalVisible]);

  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [keyContactsFile, setKeyContactsFile] = useState<any>(null);

  const onSubmit = (data: FormData) => {
    console.log(data);
  };
  return (
    <Dialog
      size="xl"
      open={addNewInvesterModalVisible}
      onClose={() => {
        setAddNewInvesterModalVisible(false);
      }}
    >
      <Dialog.Panel className=" text-center">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">Add New Investor</h2>
            <div
              onClick={() => {
                setAddNewInvesterModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="flex flex-col gap-7">
              <div ref={selectParentRef}>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Institution Name
                </label>
                <div className="mt-2 text-left">
                  <GeneralSelector
                    url="/institute/"
                    valueKey="id"
                    labelKey="institution"
                    placeholderText="Select Institute"
                    className="sm:max-w-[300px] w-full"
                    selectedValue={selectedInstitution}
                    setSelectedValue={setSelectedInstitution}
                    selectRef={selectRef}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Key References
                </label>
                <div className="w-full  max-h-[180px]">
                  <Dropzone
                    ref={dropzoneSingleRef}
                    options={{
                      url: "/",
                      autoProcessQueue: false,
                      // previewsContainer: ".dropzone-previews",
                      clickable: true,
                      thumbnailWidth: 100,
                      maxFilesize: 5000,
                      maxFiles: 1,
                      paramName: "excel",
                      acceptedFiles: ".xlsx",
                    }}
                    className="dropzone w-full flex flex-col justify-center items-center h-full "
                  >
                    <div className="text-[14px] font-medium">
                      Drop files here or click to upload.
                    </div>
                    <div className="text-gray-600">
                      Only xlsx files are allowed
                    </div>
                  </Dropzone>
                </div>
              </div>
              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Engagement Priorities
                </label>
                <Controller
                  name="engagement_priorities"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Voting Guidelines Summary
                </label>
                <Controller
                  name="voting_guidelines_summary"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Voting Guidelines Link
                </label>
                <Controller
                  name="voting_guidelines_link"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Reporting Expectations
                </label>
                <Controller
                  name="reporting_expectations"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  ESG Integration Process
                </label>
                <Controller
                  name="esg_integration_process"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  References
                </label>
                <Controller
                  name="references"
                  control={control}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </Dialog.Description>

          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setAddNewInvesterModalVisible(false);
              }}
              className="w-20 mr-3"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-20">
              Save
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddNewInvesterProfile;
