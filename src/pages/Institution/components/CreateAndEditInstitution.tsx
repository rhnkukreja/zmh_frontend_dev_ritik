import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addEditInstitution,
  fetchInstitutions,
  getSingleInstitution,
} from "@/stores/institutionSlice";
import { Institutions } from "@/types/institutions";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import { bytesToMB, createDynamicURL, formatedDate } from "@/utils/helper";
import Litepicker from "@/components/Base/Litepicker";
import TomSelect from "@/components/Base/TomSelect";
import { baseURL } from "@/constant";

interface InstitutionFormData {
  institution: string;
  active: boolean;
  uploaded_time: string;
  region: string;
  investor_type: string;
  contact: string;
  email: string;
}

interface AddEditInstitutionProps {
  addEditInstitutionVisible: boolean;
  setAddEditInstitutionVisible: (visible: boolean) => void;
  selectedInstitution: Institutions | null;
}

export const AddEditInstitution: React.FC<AddEditInstitutionProps> = ({
  addEditInstitutionVisible,
  setAddEditInstitutionVisible,
  selectedInstitution,
}) => {
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const dispatch = useAppDispatch();
  const { loading, page } = useAppSelector((state) => state.institutions);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { control, handleSubmit, getValues, setValue } =
    useForm<InstitutionFormData>({
      defaultValues: {
        institution: selectedInstitution?.institution,
        active: selectedInstitution?.active || false,
        uploaded_time: selectedInstitution?.uploaded_time,
        region: selectedInstitution?.region || "NAM",
        investor_type: selectedInstitution?.investor_type,
        contact: selectedInstitution?.contact!,
        email: selectedInstitution?.email!,
      },
    });

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop()?.toLowerCase();

          console.log("file: ", file);
          if (fileType && !["jpeg", "png", "jpg"].includes(fileType)) {
            toast.error("Image type not allowed!");
          } else {
            setLogoFile(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (
            fileType &&
            !["image/jpeg", "image/png", "image/jpg"].includes(fileType)
          ) {
            toast.error("Image type not allowed!");
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
  }, [dropzoneSingleRef.current, addEditInstitutionVisible, logoFile]);

  const onSubmit = async (data: InstitutionFormData) => {
    const transformedData = {
      ...data,
      uploaded_time: data.uploaded_time
        ? formatedDate(data.uploaded_time)
        : null,
    };

    const formData = new FormData();
    for (const [key, value] of Object.entries(transformedData)) {
      formData.append(key, value as any);
    }

    formData.append("logo_url", logoFile as any);

    try {
      let response;
      if (selectedInstitution) {
        response = await dispatch(
          addEditInstitution({
            id: selectedInstitution?.id,
            data: formData as unknown as Partial<Institutions>,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditInstitution({
            data: formData as unknown as Partial<Institutions>,
          })
        ).unwrap();

        dispatch(
          fetchInstitutions(
            createDynamicURL(`${baseURL}/institute/`, undefined, page)
          )
        );
      }

      if (response.results?.id) {
        toast.success(
          selectedInstitution
            ? "Institution updated successfully"
            : "Institution saved successfully"
        );
      }
    } catch (error) {
      toast.error("Failed to save institution");
    } finally {
      setAddEditInstitutionVisible(false);
    }
  };

  return (
    <Dialog
      size="xl"
      open={addEditInstitutionVisible}
      onClose={() => setAddEditInstitutionVisible(false)}
    >
      <Dialog.Panel>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">
              {selectedInstitution ? "Edit Institution" : "Add New Institution"}
            </h2>
            <div
              onClick={() => setAddEditInstitutionVisible(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Institution Name
                </FormCheck.Label>
                <Controller
                  name="institution"
                  control={control}
                  render={({ field }) => (
                    <FormInput
                      placeholder="Enter Institution Name"
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Region
                </FormCheck.Label>

                <TomSelect
                  value={getValues("region") || "NAM"}
                  onChange={(e) => {
                    setValue("region", e.target.value);
                  }}
                  options={{
                    placeholder: "Select Region ",
                  }}
                  className="w-full text-left"
                >
                  <option value="NAM" selected>
                    NAM
                  </option>
                  <option value="EMEA">EMEA</option>
                  <option value="APAC">APAC</option>
                </TomSelect>
              </div>

              <div className="w-full">
                <FormCheck.Label
                  htmlFor="engagement_date"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Upload Time
                </FormCheck.Label>
                <div className="relative">
                  <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                    <Lucide icon="Calendar" className="w-4 h-4" />
                  </div>

                  <Controller
                    name="uploaded_time"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <Litepicker
                        placeholder="Select Upload Time"
                        value={field.value}
                        onChange={(date) => field.onChange(date)}
                        options={{
                          autoApply: false,
                          showWeekNumbers: true,
                          dropdowns: {
                            minYear: 1990,
                            maxYear: null,
                            months: true,
                            years: true,
                          },
                        }}
                        className="pl-12"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Investor Type
                </FormCheck.Label>
                <Controller
                  name="investor_type"
                  control={control}
                  render={({ field }) => (
                    <FormInput placeholder="Enter Investor Type" {...field} />
                  )}
                />
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Contact
                </FormCheck.Label>
                <Controller
                  name="contact"
                  control={control}
                  render={({ field }) => (
                    <FormInput placeholder="Enter Contact" {...field} />
                  )}
                />
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Email
                </FormCheck.Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <FormInput placeholder="Enter Email" {...field} />
                  )}
                />
              </div>

              <div>
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Logo
                </label>
                <div className="w-full  max-h-[180px]">
                  {logoFile ? (
                    <>
                      <div className="flex items-center  w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                        <div className="ml-4">
                          <Lucide
                            icon="FileText"
                            className="w-8  h-8 stroke-[1.7] stroke-slate-400/70"
                          />
                        </div>
                        <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                          <p className="block font-medium capitalize truncate md:max-w-[100px] lg:max-w-[150px] text-ellipsis overflow-hidden whitespace-nowrap lg:text-center">
                            {logoFile?.name}
                          </p>
                          <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                            File size: {bytesToMB(188887)} MB
                          </div>
                        </div>
                        <Lucide
                          onClick={() => {
                            setLogoFile(null);
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

                        acceptedFiles: "image/jpeg|image/png|image/jpg",
                      }}
                      className="dropzone w-full flex flex-col justify-center items-center h-full "
                    >
                      <div className="text-[14px] font-medium">
                        Drop files here or click to upload.
                      </div>
                      <div className="text-gray-600">
                        Only jpeg, png, jpg files are allowed
                      </div>
                    </Dropzone>
                  )}
                </div>
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Active
                </FormCheck.Label>
                <div className="flex flex-col sm:flex-row">
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
                            checked={field.value === true}
                            onChange={(e) => field.onChange(true)}
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
                            checked={field.value === false}
                            onChange={(e) => field.onChange(false)}
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
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => setAddEditInstitutionVisible(false)}
              className="w-20 mr-3"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {loading && (
                <Lucide
                  icon="Loader"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              )}

              {selectedInstitution ? "Update" : "Save"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};
