import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { FormCheck, FormInput } from "@/components/Base/Form";

import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import { AppDispatch } from "@/stores/store";
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
import { addNewInvestersProfile, fetchInvestersProfiles } from "@/stores/investersProfileSlice";
import { AddNewInvesterType } from "@/types/investerProfiles";
import { addNewShareHolder } from "@/stores/shareholderProposalSlice";
import { AddShareholderType } from "@/types/shareHolder";

interface AddNewShareholderProps {
  addNewShareholderModalVisible: boolean;
  setAddNewShareholderModalVisible: (visible: boolean) => void;
}

const AddNewShareholder: React.FC<AddNewShareholderProps> = ({
  addNewShareholderModalVisible,
  setAddNewShareholderModalVisible,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const { loading, page } = useAppSelector((state) => state.sharedHolderNoAction);
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddShareholderType>();

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
  }, [dropzoneSingleRef.current, keyContactsFile, addNewShareholderModalVisible]);

  const onSubmit = async (data: AddShareholderType) => {
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
      const response = await dispatch(addNewShareHolder(formData as unknown as any)).unwrap();

      if (response.results?.id) {
        toast.success("New Shareholder Added");
        setAddNewShareholderModalVisible(false);

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

  const onError: SubmitErrorHandler<any> = () => {
    if (!keyContactsFile) {
      setShowRequiredStateErrors(true);
    }
  };
  return (
    <Dialog
      size="xl"
      open={addNewShareholderModalVisible}
      onClose={() => {
        setAddNewShareholderModalVisible(false);
      }}
    >
      <Dialog.Panel className="text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">Add New Shareholder</h2>
            <div
              onClick={() => {
                setAddNewShareholderModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="flex flex-col gap-7">
              {/* Institution Name */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Proponent Name
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
                      {errors?.institution.message}
                    </Error>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Company Name
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
                      {errors?.institution.message}
                    </Error>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Institution Name
                  </FormCheck.Label>
                  <Controller
                    name="institution"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Institution Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Institution Name
                  </FormCheck.Label>
                  <Controller
                    name="institution"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Institution Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Institution Name
                  </FormCheck.Label>
                  <Controller
                    name="institution"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Institution Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Institution Name
                  </FormCheck.Label>
                  <Controller
                    name="institution"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Institution Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

              </div>

            
              

             
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
             
            </div>
          </Dialog.Description>


          <Dialog.Footer className="flex justify-end">
            <Button
              variant="outline-secondary"
              className="mr-3"
              onClick={() => {
                setAddNewShareholderModalVisible(false);
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

export default AddNewShareholder;
