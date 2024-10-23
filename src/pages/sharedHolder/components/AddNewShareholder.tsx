import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { FormCheck, FormInput } from "@/components/Base/Form";

import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import { AppDispatch } from "@/stores/store";
import { bytesToMB, createDynamicURL } from "@/utils/helper";
import TomSelect from "@/components/Base/TomSelect";
import React, { useEffect, useRef, useState } from "react";
import {
  Controller,
  FieldErrors,
  SubmitErrorHandler,
  useForm,
} from "react-hook-form";
import { toast } from "react-toastify";
// import TomSelect from "@/components/Base/TomSelect/ServerComponent";
import { baseURL } from "@/constant";
import Error from "@/components/Error";
import {
  addNewInvestersProfile,
  fetchInvestersProfiles,
} from "@/stores/investersProfileSlice";
import { AddNewInvesterType } from "@/types/investerProfiles";
import {
  addNewShareHolder,
  fetchShareHolderProposal,
} from "@/stores/shareholderProposalSlice";
import { AddShareholderType, ShareHolderDropdown } from "@/types/shareHolder";
import { shareHolderProposalService } from "@/services/shareholderProposal";

interface AddNewShareholderProps {
  addNewShareholderModalVisible: boolean;
  setAddNewShareholderModalVisible: (visible: boolean) => void;
}

const AddNewShareholder: React.FC<AddNewShareholderProps> = ({
  addNewShareholderModalVisible,
  setAddNewShareholderModalVisible,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page } = useAppSelector(
    (state) => state.sharedHolderNoAction
  );
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddShareholderType>();

  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<ShareHolderDropdown>({
      company: [],
      status: [],
      proponent: [],
      category: [],
      sub_category: [],
      year: [],
    });
  const [showRequiredStateErrors, setShowRequiredStateErrors] =
    useState<boolean>(false);

  const getAllCaseStudyDropdowns = async () => {
    try {
      const res =
        await shareHolderProposalService.getShareHolderDropdownValues();
      if (res.result) {
        setApiDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    }
  };
  useEffect(() => {
    getAllCaseStudyDropdowns();
  }, []);

  const onSubmit = async (data: AddShareholderType) => {
    const transformedData = {
      ...data,
      // institution: data.institution ? Number(data.institution) : null,
    };
    // if (!keyContactsFile) {
    //   return;
    // }
    // else {
    setShowRequiredStateErrors(false);
    // }
    const formData = new FormData();

    for (const [key, value] of Object.entries(transformedData)) {
      formData.append(key, value);
    }
    // if (keyContactsFile) {
    //   formData.append("file", keyContactsFile);
    // }

    try {
      const response = await dispatch(
        addNewShareHolder(formData as unknown as any)
      ).unwrap();

      if (response.results?.id) {
        toast.success("New Shareholder Added");
        setAddNewShareholderModalVisible(false);

        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(
              `${baseURL}/shareholder_proposal/def14a/`,
              undefined,
              page
            )
          )
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const onError: SubmitErrorHandler<any> = () => {
    // if (!keyContactsFile) {
    setShowRequiredStateErrors(true);
    // }
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
            <h2 className="mr-auto text-xl font-semibold">
              Add New Shareholder
            </h2>
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
                      rules={{ required: "institution is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Institution",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.proponent?.map(
                              (proponent: string) => {
                                return (
                                  <option value={proponent}>{proponent}</option>
                                );
                              }
                            )}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.proponent && (
                    <Error className="max-w-[100%] ">
                      {errors?.proponent.message}
                    </Error>
                  )}
                </div>

                {/* <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Company Name
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="company"
                      control={control}
                      rules={{ required: "Company is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ''}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Company",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.company?.map(
                              (company: string) => {
                                return (
                                  <option value={company}>{company}</option>
                                );
                              }
                            )}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.company && (
                    <Error className="max-w-[100%] ">
                      {errors?.company.message}
                    </Error>
                  )}
                </div> */}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Category Name
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="category"
                      control={control}
                      rules={{ required: "Category is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Category",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.category?.map(
                              (category: string) => {
                                return (
                                  <option value={category}>{category}</option>
                                );
                              }
                            )}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.category && (
                    <Error className="max-w-[100%] ">
                      {errors?.category.message}
                    </Error>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Sub Category
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="sub_category"
                      control={control}
                      rules={{ required: "Sub Category is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Sub Category",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.sub_category?.map(
                              (sub_category: string) => {
                                return (
                                  <option value={sub_category}>
                                    {sub_category}
                                  </option>
                                );
                              }
                            )}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.sub_category && (
                    <Error className="max-w-[100%] ">
                      {errors?.sub_category.message}
                    </Error>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Status
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="status"
                      control={control}
                      rules={{ required: "Status is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Status",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.status?.map(
                              (status: string) => {
                                return <option value={status}>{status}</option>;
                              }
                            )}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.status && (
                    <Error className="max-w-[100%] ">
                      {errors?.status.message}
                    </Error>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                    Year
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="year"
                      control={control}
                      rules={{ required: "Year is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Year",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.year?.map((year: string) => {
                              return <option value={year}>{year}</option>;
                            })}
                          </TomSelect>
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {errors.year && (
                    <Error className="max-w-[100%] ">
                      {errors?.year.message}
                    </Error>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Proposal Name
                  </FormCheck.Label>
                  <Controller
                    name="proposal_name"
                    control={control}
                    rules={{ required: "Proposal Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Proposal Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">
                            {error.message}
                          </Error>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Proposal Number
                  </FormCheck.Label>
                  <Controller
                    name="proposal_num"
                    control={control}
                    rules={{ required: "Proposal Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Proposal Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">
                            {error.message}
                          </Error>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Link to Filing
                  </FormCheck.Label>
                  <Controller
                    name="vote_outcome_formula"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Institution Name"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">
                            {error.message}
                          </Error>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* <div className="w-full flex-1">
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
                </div> */}
              </div>

              <div>
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Proposal Text
                </FormCheck.Label>
                <Controller
                  name="proposal_text"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field?.value ?? ""}
                      onChange={(event) => {
                        field.onChange(event);
                      }}
                    />
                  )}
                />
                {errors.proposal_text && (
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
