import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import Litepicker from "@/components/Base/Litepicker";
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
import { baseURL } from "@/constant";
import Error from "@/components/Error";
import { addEditNewNoAction, fetchShareHolderProposal } from "@/stores/shareholderProposalSlice";
import { AddNoActionType, ShareHolderDropdown } from "@/types/shareHolder";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import MultiSearchBar from "@/components/MultiSearch";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import CompanySelect from "@/components/ReactSelectAsync";
interface AddNoActionProps {
  addNewNoActionModalVisible: boolean;
  setAddNewNoActionModalVisible: (visible: boolean) => void;
  selectedShareholderNoAction: AddNoActionType | null;
}



const AddNewNoAction: React.FC<AddNoActionProps> = ({
  addNewNoActionModalVisible,
  setAddNewNoActionModalVisible,
  selectedShareholderNoAction
}) => {

  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page } = useAppSelector((state) => state.sharedHolderNoAction);
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddNoActionType>(
    {
      defaultValues:
      {
        proponent: selectedShareholderNoAction?.proponent,
        company: selectedShareholderNoAction?.company,
        category: selectedShareholderNoAction?.category,
        proposal_text: selectedShareholderNoAction?.proposal_text,
        status: selectedShareholderNoAction?.status,
        sub_category: selectedShareholderNoAction?.sub_category,
        year: selectedShareholderNoAction?.year,
        link_to_initial_submission: selectedShareholderNoAction?.link_to_initial_submission,
        link_to_staff_response: selectedShareholderNoAction?.link_to_staff_response,
        staff_response: selectedShareholderNoAction?.staff_response,
        bases_asserted_for_exclusion: selectedShareholderNoAction?.bases_asserted_for_exclusion,
        withdrawn: selectedShareholderNoAction?.withdrawn,
        vote_outcome_formula: selectedShareholderNoAction?.vote_outcome_formula,
        // actual_proponent_name: selectedShareholderNoAction?.actual_proponent_name,
      },
    }
  );
  

  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<ShareHolderDropdown>({
      status: [],
      category: [],
      sub_category: [],
      year: [],
    });

  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

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


  const onSubmit = async (data: AddNoActionType) => {
    const transformedData = {
      ...data,
      proponent: data.proponent ? Number(data.proponent) : 0,
      company: data?.company?.value ?? 0
        
    };


    try {
      let response;
      if (selectedShareholderNoAction) {
        response = await dispatch(addEditNewNoAction({ id: selectedShareholderNoAction?.id!, data: transformedData })).unwrap();
      }
      else {
        response = await dispatch(addEditNewNoAction({ data: transformedData })).unwrap();
      }

      if (response.results?.id) {
        toast.success(selectedShareholderNoAction ? 'Shareholder No Action Updated' : "New Shareholder No Action Added");
        setAddNewNoActionModalVisible(false);

        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(`${baseURL}/shareholder_proposal/no_action/`, { global_search: companyGlobalSearchName }, undefined, page)
          )
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  // const handleSearch = (searchTerms: string[]) => {
  //   setCompanyFilter(searchTerms);
  // };

  // useEffect(() => {
  //   if(selectedShareholderNoAction){
  //     setSearchTerms(selectedShareholderNoAction?.company_name ? [selectedShareholderNoAction?.company_name] : ['']);
  //     setCompanyFilter(selectedShareholderNoAction?.company ? [selectedShareholderNoAction?.company] : ['']);

  //   }
  // }, [selectedShareholderNoAction])

  const onError: SubmitErrorHandler<any> = () => { };

  return (
    <Dialog
      size="xl"
      open={addNewNoActionModalVisible}
      onClose={() => {
        setAddNewNoActionModalVisible(false);
      }}
    >
      <Dialog.Panel className="text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
            {selectedShareholderNoAction
                ? "Edit Shareholder No Action"
                : "Add New Shareholder No Action"}
              </h2>
            <div
              onClick={() => {
                setAddNewNoActionModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
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


                {/* <div className="w-full flex-1">
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
                </div> */}

                

              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Staff Name
                  </FormCheck.Label>
                  <Controller
                    name="staff_response"
                    control={control}
                    rules={{ required: "Staff Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Staff Name"
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
                <div className="w-full flex-1">
                  <FormCheck.Label
                    htmlFor="engagement_date"
                    className="block  font-semibold text-gray-800 mb-2 text-left"
                  >
                    Initial Date for Submission
                  </FormCheck.Label>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                      <Lucide icon="Calendar" className="w-4 h-4" />
                    </div>

                    <Controller
                      name="link_to_initial_submission"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Initial Date for Submission is required" }}
                      render={({ field }) => (
                        <Litepicker
                          placeholder="Select Initial Date for Submission"
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

                  {errors.nl_exist && (
                    <Error className="max-w-[100%] ">
                      {errors.nl_exist.message}
                    </Error>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Withdrawn
                  </FormCheck.Label>

                  <div className="mt-2 flex flex-col sm:flex-row">
                    <Controller
                      name="withdrawn"
                      control={control}
                      rules={{ required: "Withdrawn is required" }}
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
                              Tick if withdrawn
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
                {/* <div className="w-full flex-1">
                  <FormCheck.Label
                    htmlFor="engagement_date"
                    className="block  font-semibold text-gray-800 mb-2 text-left"
                  >
                    Staff Response Date
                  </FormCheck.Label>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                      <Lucide icon="Calendar" className="w-4 h-4" />
                    </div>

                    <Controller
                      name="staff_response"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Staff Response Date is required" }}
                      render={({ field }) => (
                        <Litepicker
                          placeholder="Select Staff Response Date"
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

                  {errors.nl_exist && (
                    <Error className="max-w-[100%] ">
                      {errors.nl_exist.message}
                    </Error>
                  )}
                </div> */}
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
                            value={field.value ?? ''}
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
                            value={field.value ?? ''}
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
                                  <option value={sub_category}>{sub_category}</option>
                                );
                              }
                            )}
                          </TomSelect>
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
                            value={field.value ?? ''}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            options={{
                              placeholder: "Select Year",
                            }}
                            className="w-full text-left"
                          >
                            {apiDropdownOptions?.year?.map(
                              (year: string) => {
                                return (
                                  <option value={year}>{year}</option>
                                );
                              }
                            )}
                          </TomSelect>
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

                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Bases Asserted for Exclution
                  </FormCheck.Label>
                  <Controller
                    name="bases_asserted_for_exclusion"
                    control={control}
                    rules={{ required: "Bases Asserted for Exclutione is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Bases Asserted for Exclution"
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
                    Link to Staff Response
                  </FormCheck.Label>
                  <Controller
                    name="vote_outcome_formula"
                    control={control}
                    rules={{
                      required: "Link to Staff Response is required",
                      pattern: {
                        value: /^https:\/\/.+$/i,
                        message: "The link must start with 'https://'",
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Link to Staff Response"
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
                <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                  Proposal Text
                </FormCheck.Label>
                <Controller
                  name="proposal_text"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <ClassicEditor
                      value={field?.value ?? ''}
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
                setAddNewNoActionModalVisible(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-20">
              {loading && (
                <Lucide
                  icon="Loader"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] ${loading ? "animate-spin" : ""
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

export default AddNewNoAction;
