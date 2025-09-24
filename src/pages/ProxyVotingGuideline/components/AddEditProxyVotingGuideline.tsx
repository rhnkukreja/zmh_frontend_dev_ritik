import React, { useEffect, useRef, useState } from "react";
import { Controller, SubmitErrorHandler, useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import { FormCheck, FormInput, FormTextarea } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import ServerTomSelect, {
  TomSelectElement,
} from "@/components/Base/TomSelect/ServerComponent";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { addEditProxyVotingGuideline } from "@/stores/proxyVotingGuidelineSlice";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";
import TomSelect from "@/components/Base/TomSelect";
import { bytesToMB, createDynamicURL, getYearRange } from "@/utils/helper";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { fetchEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { baseURL } from "@/constant";
import Error from "@/components/Error";

interface PolicyGuidelineFormData {
  institution: string;
  year: string;
  category: string;
  sub_category: string;
  section: string;
  policy_guidelines: string;
  active: boolean;
}

interface AddEditPolicyGuidelineProps {
  addNewProxyVotingGuidelineVisible: boolean;
  setAddNewProxyVotingGuidelineVisible: (visible: boolean) => void;
  selectedProxyVotingGuideline: ProxyVotingGuideline | null;
}

export const AddEditPolicyGuideline: React.FC<AddEditPolicyGuidelineProps> = ({
  addNewProxyVotingGuidelineVisible,
  setAddNewProxyVotingGuidelineVisible,
  selectedProxyVotingGuideline,
}) => {
  const instituteSelectRef = useRef<any>(null);
  // const categorySelectRef = useRef<any>(null);
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page } = useAppSelector(
    (state) => state.proxyVotingGuideline
  );

  const [guideLinePdf, setGuideLinePdf] = useState<any>(null);
  const [showRequiredStateErrors, setShowRequiredStateErrors] =
    useState<boolean>(false);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["application/pdf", "pdf"].includes(fileType)) {
            toast.error("Only pdf file are allowed!");
          } else {
            setGuideLinePdf(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only pdf file are allowed!");
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
  }, [
    dropzoneSingleRef.current,
    addNewProxyVotingGuidelineVisible,
    guideLinePdf,
  ]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PolicyGuidelineFormData>({
    defaultValues: {
      institution: selectedProxyVotingGuideline?.institution?.toString(),
      year: selectedProxyVotingGuideline?.year || getYearRange(25)?.[0],
      // category: selectedProxyVotingGuideline?.category || "Environmental",
      // sub_category: selectedProxyVotingGuideline?.sub_category || "",
      // section: selectedProxyVotingGuideline?.section || "",
      // policy_guidelines:
      //   selectedProxyVotingGuideline?.policy_guidelines || "",
      active: selectedProxyVotingGuideline?.active,
    },
  });

  const onSubmit = async (data: PolicyGuidelineFormData) => {
    const formData = new FormData();
    const transformedData = {
      ...data,
      institution: data.institution ? Number(data.institution) : null,
    };

    if (!guideLinePdf) {
      return;
    } else {
      setShowRequiredStateErrors(false);
    }

    for (const [key, value] of Object.entries(transformedData)) {
      formData.append(key, value as any);
    }
    formData.append("voting_guidelines_pdf", guideLinePdf);

    try {
      let response;

      if (selectedProxyVotingGuideline) {
        response = await dispatch(
          addEditProxyVotingGuideline({
            id: selectedProxyVotingGuideline?.id,
            data: formData as unknown as Partial<ProxyVotingGuideline>,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditProxyVotingGuideline({
            data: formData as unknown as Partial<ProxyVotingGuideline>,
          })
        ).unwrap();

       
      }

      if (response?.results?.id) {
        toast.success(
          selectedProxyVotingGuideline
            ? "Policy Guideline updated successfully"
            : "Policy Guideline saved successfully"
        );
         dispatch(
          fetchEngagementQuestions(
            createDynamicURL(
              `${baseURL}/engagement_questions/`,
              undefined,
              page
            )
          )
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setAddNewProxyVotingGuidelineVisible(false);
    }
  };

  const onError: SubmitErrorHandler<AddEditPolicyGuidelineProps> = () => {
    if (!guideLinePdf) {
      setShowRequiredStateErrors(true);
    }
  };
  return (
    <Dialog
      size="xl"
      open={addNewProxyVotingGuidelineVisible}
      onClose={() => setAddNewProxyVotingGuidelineVisible(false)}
    >
      <Dialog.Panel className=" text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
              {selectedProxyVotingGuideline
                ? "Edit Policy Guideline"
                : "Add New Policy Guideline"}
            </h2>
            <div
              onClick={() => setAddNewProxyVotingGuidelineVisible(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="w-full">
                <FormCheck.Label
                  htmlFor="year"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Year
                </FormCheck.Label>

                <Controller
                  name="year"
                  control={control}
                  rules={{ required: "Year is required" }}
                  render={({ field }) => (
                    <TomSelect
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      options={{
                        placeholder: "Select Year",
                      }}
                      className="w-full text-left"
                    >
                      {getYearRange(3)?.map((y: string) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </TomSelect>
                  )}
                />

                {errors.year && (
                  <Error className="max-w-[100%] ">{errors.year.message}</Error>
                )}
              </div>

              {/* <div className="w-full" ref={categorySelectRef}>
                <FormCheck.Label
                  htmlFor="category"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Category
                </FormCheck.Label>
                <TomSelect
                  value={getValues("category") || ""}
                  onChange={(e) => {
                    setValue("category", e.target.value);
                  }}
                  options={{
                    placeholder: "Select your Category",
                  }}
                  className="w-full text-left"
                >
                  <option value="" disabled selected>
                    Select Category
                  </option>
                  <option value="Environmental">Environmental</option>
                  <option value="Governance">Governance</option>
                  <option value="Social">Social</option>
                </TomSelect>
              </div> */}

              {/* <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Sub Category
                </FormCheck.Label>
                <Controller
                  name="sub_category"
                  control={control}
                  render={({ field }) => (
                    <FormInput placeholder="Enter Sub Category" {...field} />
                  )}
                />
              </div> */}

              <div className="w-full" ref={instituteSelectRef}>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Institution Name
                </FormCheck.Label>
                <Controller
                  name="institution"
                  control={control}
                  rules={{ required: "Institution is required" }}
                  render={({ field }) => (
                    <ServerTomSelect
                      url="/institute/"
                      valueKey="id"
                      labelKey="institution"
                      value={field.value?.toString() || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      options={{ placeholder: "Select Institute" }}
                      className="w-full"
                    />
                  )}
                />
                {errors.institution && (
                  <Error className="max-w-[100%] ">
                    {errors.institution.message}
                  </Error>
                )}
              </div>

              {/* <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Section
                </FormCheck.Label>
                <Controller
                  name="section"
                  control={control}
                  render={({ field }) => (
                    <FormInput placeholder="Enter Section" {...field} />
                  )}
                />
              </div> */}

              {/* <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Policy Guidelines
                </FormCheck.Label>
                <Controller
                  name="policy_guidelines"
                  control={control}
                  render={({ field }) => (
                    <FormTextarea
                      placeholder="Enter Policy Guidelines"
                      {...field}
                    />
                  )}
                />
              </div> */}

              <div className="mb-10">
                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Voting Guidelines Pdf
                </label>
                <div className="w-full  max-h-[200px]">
                  {guideLinePdf ? (
                    <>
                      <div className="flex items-center  w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                        <div className="ml-4">
                          <Lucide
                            icon="FileText"
                            className="w-8  h-8 stroke-[1.7] stroke-slate-400/70"
                          />
                        </div>
                        <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                          <p className="block font-medium capitalize truncate md:max-w-[100px] sm:max-w-[80px] lg:max-w-[150px] text-ellipsis overflow-hidden whitespace-nowrap lg:text-center">
                            {guideLinePdf?.name}
                          </p>
                          <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                            File size: {bytesToMB(188887)} MB
                          </div>
                        </div>
                        <Lucide
                          onClick={() => {
                            setGuideLinePdf(null);
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

                        acceptedFiles: ".pdf",
                      }}
                      className="dropzone w-full flex flex-col justify-center items-center h-full "
                    >
                      <div className="text-base font-semibold text-gray-800 mb-2">
                        Drop files here or click to upload.
                      </div>
                      Only <span className="font-medium">pdf</span> files are
                      allowed.
                    </Dropzone>
                  )}
                  {!guideLinePdf && showRequiredStateErrors && (
                    <Error className=" max-w-[100%] ">
                      Voting Guidelines are required
                    </Error>
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
                    rules={{
                      required: "Please select whether Active is true or false",
                    }}
                    render={({ field }) => (
                      <>
                        <FormCheck className="flex items-center mr-2">
                          <FormCheck.Input
                            id="radio-switch-4"
                            type="radio"
                            {...field}
                            value="true"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
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
                            onChange={() => field.onChange(false)}
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
                    {errors.active.message}
                  </Error>
                )}
              </div>
            </div>
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => setAddNewProxyVotingGuidelineVisible(false)}
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

              {selectedProxyVotingGuideline ? "Update" : "Save"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};
