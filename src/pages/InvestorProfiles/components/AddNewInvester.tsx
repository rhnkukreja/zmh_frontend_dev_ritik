import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { FormCheck } from "@/components/Base/Form";

import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addNewInvestersProfile,
  fetchInvestersProfiles,
} from "@/stores/investersProfileSlice";
import { AppDispatch } from "@/stores/store";
import { AddNewInvesterType } from "@/types/investerProfiles";
import { bytesToMB, createDynamicURL } from "@/utils/helper";

import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import TomSelect from "@/components/Base/TomSelect/ServerComponent";
import { baseURL } from "@/constant";

interface AddNewInvesterProfileProps {
  addNewInvesterModalVisible: boolean;
  setAddNewInvesterModalVisible: (visible: boolean) => void;
}

const AddNewInvesterProfile: React.FC<AddNewInvesterProfileProps> = ({
  addNewInvesterModalVisible,
  setAddNewInvesterModalVisible,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const { loading, page } = useAppSelector((state) => state.investersProfile);
  const { handleSubmit, control } = useForm<AddNewInvesterType>();

  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [keyContactsFile, setKeyContactsFile] = useState<any>(null);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();

          console.log("file: ", file);
          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            setKeyContactsFile(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            toast.error("Something went wrong!");
          }
        }
      };

      dropzoneInstance.on("addedfile", handleComplete);
      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, keyContactsFile, addNewInvesterModalVisible]);

  const onSubmit = async (data: AddNewInvesterType) => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value ?? "");
    }
    if (keyContactsFile) {
      formData.append("file", keyContactsFile);
    }
    if (selectedInstitution) {
      formData.append("institution", selectedInstitution.toString());
    }

    try {
      const response = await dispatch(
        addNewInvestersProfile(formData as unknown as AddNewInvesterType)
      ).unwrap();

      if (response.results?.id) {
        toast.success("New Invester Profile Added");
        setAddNewInvesterModalVisible(false);

        dispatch(
          fetchInvestersProfiles(
            createDynamicURL(`${baseURL}/investor_profile/`, undefined, page)
          )
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
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
            <div className="flex flex-col gap-7 ">
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-24">
                <div className="flex-1 w-full">
                  <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Institution Name
                  </label>
                  <div className="mt-2 text-left">
                    <TomSelect
                      url="/institute/"
                      valueKey="id"
                      labelKey="institution"
                      value={selectedInstitution}
                      onChange={(e) => {
                        setSelectedInstitution(e.target.value);
                      }}
                      options={{
                        placeholder: "Select Institute",
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex-1 w-full sm:mt-0">
                  <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Active
                  </label>
                  <div className="flex flex-col sm:flex-row mt-2">
                    <Controller
                      name="active"
                      control={control}
                      render={({ field }) => (
                        <>
                          <FormCheck className="flex items-center mr-2">
                            <FormCheck.Input
                              id="radio-switch-4"
                              type="radio"
                              {...field}
                              value="true"
                              checked={field.value === "true"}
                            />
                            <FormCheck.Label
                              htmlFor="radio-switch-4"
                              className="ml-2"
                            >
                              True
                            </FormCheck.Label>
                          </FormCheck>
                          <FormCheck className="flex items-center mt-2 sm:mt-0">
                            <FormCheck.Input
                              id="radio-switch-5"
                              type="radio"
                              {...field}
                              value="false"
                              checked={field.value === "false"}
                            />
                            <FormCheck.Label
                              htmlFor="radio-switch-5"
                              className="ml-2"
                            >
                              False
                            </FormCheck.Label>
                          </FormCheck>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Key Contacts
                </label>
                <div className="w-full  max-h-[180px]">
                  {keyContactsFile ? (
                    <>
                      <div className="flex items-center md:max-w-[60%] w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                        <div className="ml-4">
                          <Lucide
                            icon="FileText"
                            className="w-8  h-8 stroke-[1.7] stroke-slate-400/70"
                          />
                        </div>
                        <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                          <a
                            href=""
                            className="block font-medium capitalize truncate lg:text-center"
                          >
                            {keyContactsFile?.name}
                          </a>
                          <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                            File size: {bytesToMB(188887)} MB
                          </div>
                        </div>
                        <Lucide
                          onClick={() => {
                            setKeyContactsFile(null);
                          }}
                          icon="Trash2"
                          className="w-6  h-6 stroke-[1.7] stroke-slate-400/70"
                        />
                      </div>
                    </>
                  ) : (
                    <Dropzone
                      ref={dropzoneSingleRef}
                      options={{
                        url: "/",
                        autoProcessQueue: false,

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
                  )}
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
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddNewInvesterProfile;
