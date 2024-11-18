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
import {
  Controller,
  FieldErrors,
  SubmitErrorHandler,
  useForm,
} from "react-hook-form";
import { toast } from "react-toastify";
import TomSelect from "@/components/Base/TomSelect/ServerComponent";
import { baseURL } from "@/constant";
import Error from "@/components/Error";

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
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddNewInvesterType>();

  const [keyContactsFile, setKeyContactsFile] = useState<any>(null);
  const [showRequiredStateErrors, setShowRequiredStateErrors] =
    useState<boolean>(false);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();

          // console.log("file: ", file);
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
    const transformedData = {
      ...data,
      institution: data.institution ? Number(data.institution) : null,
    };
    if (!keyContactsFile) {
      return;
    } else {
      setShowRequiredStateErrors(false);
    }
    const formData = new FormData();

    for (const [key, value] of Object.entries(transformedData)) {
      formData.append(key, value ?? "");
    }
    if (keyContactsFile) {
      formData.append("file", keyContactsFile);
    }

    try {
      const response = await dispatch(
        addNewInvestersProfile(formData as unknown as AddNewInvesterType)
      ).unwrap();

      if (response.results?.id) {
        toast.success("New Investor Profile Added");
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

  const onError: SubmitErrorHandler<AddNewInvesterType> = () => {
    if (!keyContactsFile) {
      setShowRequiredStateErrors(true);
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
      <Dialog.Panel className="text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
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
              {/* Institution Name */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-24">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Institution Name
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="institution"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Institution Name is required" }}
                      render={({ field }) => (
                        <TomSelect
                          url="/institute/"
                          valueKey="id"
                          labelKey="institution"
                          value={field.value?.toString() || ""}
                          onChange={(value) => field.onChange(value)}
                          options={{ placeholder: "Select Institute" }}
                          className="w-full"
                        />
                      )}
                    />
                  </div>

                  {errors.institution && (
                    <Error className="max-w-[100%] ">
                      {errors.institution.message}
                    </Error>
                  )}
                </div>
                {/* Active */}
                <div className="flex-1 w-full sm:mt-0">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Active
                  </FormCheck.Label>
                  <div className="flex flex-col sm:flex-row mt-2">
                    <Controller
                      name="active"
                      control={control}
                      rules={{ required: true }}
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
                  {errors.active && (
                    <Error className="max-w-[100%] mt-6">
                      Active status is required
                    </Error>
                  )}
                </div>
              </div>

              {/* Engagement Priorities */}
              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Engagement Priorities
                </FormCheck.Label>
                <Controller
                  name="engagement_priorities"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
                {errors.engagement_priorities && (
                  <Error className="lg:max-w-[50%] ">
                    Engagement Priorities are required
                  </Error>
                )}
              </div>

              {/* Voting Guidelines Summary */}
              {/* <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Voting Guidelines Summary
                </FormCheck.Label>
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
              </div> */}

              {/* Voting Guidelines Link */}
              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Voting Guidelines Summary & Link
                </FormCheck.Label>
                <Controller
                  name="voting_guidelines"
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

              {/* Reporting Expectations */}
              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Reporting Expectations
                </FormCheck.Label>
                <Controller
                  name="reporting_expectations"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
                {errors.reporting_expectations && (
                  <Error className="lg:max-w-[50%] ">
                    Reporting Expectations are required
                  </Error>
                )}
              </div>

              {/* ESG Integration Process */}
              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  ESG Integration Process
                </FormCheck.Label>
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

              {/* References */}
              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  References
                </FormCheck.Label>
                <Controller
                  name="references"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
                {errors.references && (
                  <Error className="lg:max-w-[50%] ">
                    References are required
                  </Error>
                )}
              </div>

              <div className={keyContactsFile ? " " : "mb-20"}>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Key Contacts
                </FormCheck.Label>
                <div className="w-full max-h-[220px]  ">
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

                        acceptedFiles: ".xlsx",
                      }}
                      className="dropzone w-full flex flex-col justify-center items-center h-full "
                    >
                      <div className="text-base font-semibold text-gray-800 mb-2">
                        Drop files here or click to upload.
                      </div>
                      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
                        <div className="text-sm text-gray-600 mb-1">
                          Only <span className="font-medium">xlsx</span> files
                          are allowed.
                        </div>
                        <div className="text-sm text-gray-600">
                          File should contain only 4 columns: <br />
                          <span className="font-medium text-gray-800">
                            Name
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            Designation
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            LinkedIn
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            Image
                          </span>
                          .
                        </div>
                      </div>
                    </Dropzone>
                  )}
                  {!keyContactsFile && showRequiredStateErrors && (
                    <Error className=" lg:max-w-[50%] ">
                      Key Contacts are required
                    </Error>
                  )}
                </div>
              </div>
            </div>
          </Dialog.Description>
          <Dialog.Footer className="flex justify-end">
            <Button
              variant="outline-secondary"
              className="mr-3"
              onClick={() => {
                setAddNewInvesterModalVisible(false);
              }}
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
              Save
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddNewInvesterProfile;
