import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
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
import { baseURL } from "@/constant";
import Error from "@/components/Error";
import {
  addEditNewShareHolder,
  fetchShareHolderProposal,
} from "@/stores/shareholderProposalSlice";
import { AddShareholderType, ShareHolderDropdown } from "@/types/shareHolder";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import MultiSearchBar from "@/components/MultiSearch";
import TomSelect from "@/components/Base/TomSelect";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import CompanySelect from "@/components/ReactSelectAsync";

interface AddNewShareholderProps {
  addNewShareholderModalVisible: boolean;
  setAddNewShareholderModalVisible: (visible: boolean) => void;
  selectedShareholderProposal: AddShareholderType | null;
}

const AddNewShareholder: React.FC<AddNewShareholderProps> = ({
  addNewShareholderModalVisible,
  setAddNewShareholderModalVisible,
  selectedShareholderProposal,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page } = useAppSelector(
    (state) => state.sharedHolderNoAction
  );
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddShareholderType>({
    defaultValues: {
      proponent: selectedShareholderProposal?.proponent,
      category: selectedShareholderProposal?.category,
      company: selectedShareholderProposal?.company,
      // company_name: selectedShareholderProposal?.company_name,
      proposal_text: selectedShareholderProposal?.proposal_text,
      proposal_name: selectedShareholderProposal?.proposal_name,
      vote_outcome_formula: selectedShareholderProposal?.vote_outcome_formula,
      status: selectedShareholderProposal?.status,
      proposal_num: selectedShareholderProposal?.proposal_num,
      sub_category: selectedShareholderProposal?.sub_category,
      year: selectedShareholderProposal?.year,
      actual_proponent_name: selectedShareholderProposal?.actual_proponent_name,
      percentage_support: selectedShareholderProposal?.percentage_support,
      no_shareholder_proposal: selectedShareholderProposal?.no_shareholder_proposal,
    },
  });

  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<ShareHolderDropdown>({
      status: [],
      category: [],
      sub_category: [],
      year: [],
    });

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
    const transformedData: any = {
      ...data,
      proponent: data.proponent ? Number(data.proponent) : 0,
      company: data?.company?.value ?? 0
    };
    try {
      let response;
      if (selectedShareholderProposal) {
        response = await dispatch(
          addEditNewShareHolder({
            id: selectedShareholderProposal?.id!,
            data: transformedData,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditNewShareHolder({ data: transformedData })
        ).unwrap();
      }

      if (response.results?.id) {
        toast.success(
          selectedShareholderProposal
            ? "Shareholder Proposal Updated"
            : "New Shareholder Proposal Added"
        );
        setAddNewShareholderModalVisible(false);
        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(
              `${baseURL}/shareholder_proposal/def14a/`,
              { global_search: companyGlobalSearchName },
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
    // setShowRequiredStateErrors(true);
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
              {selectedShareholderProposal
                ? "Edit Shareholder Proposal"
                : "Add New Shareholder Proposal"}
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
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                    Proponent Name
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="proponent"
                      control={control}
                      rules={{ required: "Proponent Name is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelectServer
                            url="/institute/?type=Proponent"
                            valueKey="id"
                            labelKey="institution"
                            value={field?.value?.toString() || ""}
                            onChange={(value) => field.onChange(value)}
                            options={{ placeholder: "Select proponent" }}
                            className="w-full"
                          />
                          {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>



                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Actual Proponent Name
                  </FormCheck.Label>
                  <Controller
                    name="actual_proponent_name"
                    control={control}
                    rules={{ required: "Actual Proponent Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Actual Proponent Name"
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
                    rules={{ required: "Proposal Number is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Proposal Number"
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
                    Percentage Support
                  </FormCheck.Label>
                  <Controller
                    name="percentage_support"
                    control={control}
                    rules={{ required: "Percentage Support is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Percentage Support"
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
                   Company Name
                  </FormCheck.Label>
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: "Company Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <CompanySelect
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        {...error && (
                          <Error className="text-red-600 ">
                            {error.message}
                          </Error>
                        )}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
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
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Vote Outcome Formula
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="vote_outcome_formula"
                      control={control}
                      rules={{ required: "Vote Outcome Formula is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Vote Outcome Formula",
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
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
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
                </div>
              </div>

              {/* <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Link to Filing
                  </FormCheck.Label>
                  <Controller
                    name="vote_outcome_formula"
                    control={control}
                    rules={{
                      required: "Link to Filing is required",
                      pattern: {
                        value: /^https:\/\/.+$/i,
                        message: "The link must start with 'https://'",
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Link to Filing"
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
              </div> */}

            
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                  Admin Status
                </FormCheck.Label>

                  <div className="mt-2 flex flex-col sm:flex-row">
                    <Controller
                      name="status"
                      control={control}
                      rules={{ required: "Admin Status is required" }}
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
                          {errors.status && (
                            <Error className="max-w-[100%] mt-6">
                              {errors.status?.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="flex-1 w-full">
                <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                  Proposals
                </FormCheck.Label>

                  <div className="mt-2 flex flex-col sm:flex-row">
                    <Controller
                      name="no_shareholder_proposal"
                      control={control}
                      rules={{ required: "Proposals is required" }}
                      render={({ field }) => (
                        <>
                          <FormCheck className="flex items-center mr-2">
                            <FormCheck.Input
                              id="checkbox-switch-4"
                              type="checkbox"
                              {...field}
                              value="true"
                              checked={field.value === true}
                              // onChange={(e) => field.onChange(true)}
                            />
                            <FormCheck.Label
                              htmlFor="checkbox-switch-4"
                              className="ml-2 text-left"
                            >
                              Tick if there are no shareholder proposals for this year
                            </FormCheck.Label>
                          </FormCheck>
                          
                          {errors.status && (
                            <Error className="max-w-[100%] mt-6">
                              {errors.status?.message}
                            </Error>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

               
              </div>

              <div>
                <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
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
                    Proposal Text are required
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
