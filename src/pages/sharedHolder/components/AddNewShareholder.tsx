import Button from "@/components/Base/Button";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { bytesToMB, createDynamicURL } from "@/utils/helper";
import React, { useEffect, useState } from "react";
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
import { useNavigate } from "react-router-dom";

interface AddNewShareholderProps {
  addNewShareholderModalVisible: boolean;
  setAddNewShareholderModalVisible: (visible: boolean) => void;
  selectedShareholderProposal: AddShareholderType | null;
  type: "edit" | "duplicate";
}

const AddNewShareholder: React.FC<AddNewShareholderProps> = ({
  addNewShareholderModalVisible,
  setAddNewShareholderModalVisible,
  selectedShareholderProposal,
  type,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page, filters } = useAppSelector(
    (state) => state.sharedHolderNoAction
  );

  const defaultValues =
    type === "duplicate"
      ? {
          company: selectedShareholderProposal?.company_name,
          link_to_filing: selectedShareholderProposal?.link_to_filing,
          year: selectedShareholderProposal?.year,
        }
      : {
          institution: selectedShareholderProposal?.institution,
          category: selectedShareholderProposal?.category,
          company: selectedShareholderProposal?.company_name,
          link_to_filing: selectedShareholderProposal?.link_to_filing,
          year: selectedShareholderProposal?.year,
          proposal_text: selectedShareholderProposal?.proposal_text,
          proposal_name: selectedShareholderProposal?.proposal_name,
          vote_outcome_formula:
            selectedShareholderProposal?.vote_outcome_formula || "  ",
          matched_id_no_action:
            selectedShareholderProposal?.matched_id_no_action,
          vote_outcome: selectedShareholderProposal?.vote_outcome || "  ",
          status: selectedShareholderProposal?.status ? true : false,
          nl_exist: selectedShareholderProposal?.nl_exist ? true : false,
          ready_for_review: selectedShareholderProposal?.ready_for_review
            ? true
            : false,
          proposal_num: selectedShareholderProposal?.proposal_num,
          sub_category: selectedShareholderProposal?.sub_category,
          proponent: selectedShareholderProposal?.proponent,
          percentage_support: selectedShareholderProposal?.percentage_support,
          no_shareholder_proposal:
            selectedShareholderProposal?.no_shareholder_proposal ? true : false,
        };

  const {
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<AddShareholderType>({
    defaultValues: defaultValues,
  });

  const navigate = useNavigate();

  const nlExistValue = watch("nl_exist", false);
  const noShareholderProposalValue = watch("no_shareholder_proposal", false);

  const yearValue = watch("year");
  const companyValue = watch("company");
  const categoryValue = watch("category");

  console.log("yearValue", selectedShareholderProposal);

  const { companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<ShareHolderDropdown>({
      status: [],
      category: [],
      sub_category: [],
      year: [],
    });

  const getAllShareholderDropdowns = async () => {
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
    getAllShareholderDropdowns();
  }, []);

  useEffect(() => {
    getSubCategoryDropdown();
  }, [categoryValue]);

  const [apiSubCategoryDropdown, setapiSubCategoryDropdown] = useState<any>({
    sub_category: [],
  });
  const [apiNoActionDropdown, setapiNoActionDropdown] = useState<any>({
    proposals: [],
  });

  const getSubCategoryDropdown = async (value?: any) => {
    const categoryName = selectedShareholderProposal?.category;
    if (value !== "" || categoryValue !== "" || categoryName !== "") {
      const paramFilter = {
        category: value ?? categoryValue ?? categoryName,
      };
      try {
        const res =
          await shareHolderProposalService.getShareHolderDropdownValues(
            paramFilter
          );
        if (res.result) {
          setapiSubCategoryDropdown({ sub_category: res.result?.sub_category });
        }
      } catch (error) {
        return error;
      } finally {
      }
    }
  };

  useEffect(() => {
    getNoActionDropdown();
  }, [yearValue, companyValue]);

  const getNoActionDropdown = async () => {
    const company = selectedShareholderProposal?.company;
    const year = selectedShareholderProposal?.year;

    if ((yearValue || year) && (companyValue || company)) {
      const paramFilter = {
        company: Number(companyValue?.value ?? company),
        year: yearValue ?? year,
      };
      try {
        const res = await shareHolderProposalService.getNoActionrDropdownValues(
          paramFilter
        );
        if (res.result) {
          setapiNoActionDropdown({ proposals: res.result?.proposals });
        }
      } catch (error) {
        return error;
      } finally {
      }
    }
  };

  const onSubmit = async (data: AddShareholderType) => {
    const transformedData: any = {
      ...data,
      institution: data.institution ? Number(data.institution) : null,
      company:
        data?.company?.value ?? selectedShareholderProposal?.company ?? 0,
      vote_outcome: data?.vote_outcome === "  " ? null : data?.vote_outcome,
      vote_outcome_formula:
        data?.vote_outcome_formula === "  " ? null : data?.vote_outcome_formula,
      matched_id_no_action:
        data?.matched_id_no_action === "  " ? null : data?.matched_id_no_action,
      nl_exist: data?.matched_id_no_action ? true : false,
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
              // { global_search: companyGlobalSearchName },
              filters,
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
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Company Name
                  </FormCheck.Label>
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: "Company Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <CompanySelect
                          setDefaultValue={field.value}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            // getNoActionDropdown()
                          }}
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
                              // getNoActionDropdown()
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

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Link to proxy
                  </FormCheck.Label>
                  <Controller
                    name="link_to_filing"
                    control={control}
                    // rules={{
                    //   required: "Proposal Link is required",
                    //   // pattern: {
                    //   //   value: /^(https?:\/\/)?([\w\-])+\.{1}([a-zA-Z]{2,63})([\w\-.~:?#[\]@!$&'()*+,;=]*)*\/?$/,
                    //   //   message: "Please enter a valid URL",
                    //   // },
                    // }}
                    rules={{
                      required: !noShareholderProposalValue
                        ? "Proposal Link is required"
                        : false,
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          type="url"
                          placeholder="Enter Proposal Link (e.g., https://example.com)"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600">
                            {error.message}
                          </Error>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Category
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="category"
                      control={control}
                      // rules={{
                      //   required: !noShareholderProposalValue
                      //     ? "Category is required"
                      //     : false,
                      // }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // getSubCategoryDropdown(e?.target?.value);
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
                      // rules={{
                      //   required: !noShareholderProposalValue
                      //     ? "Sub Category is required"
                      //     : false,
                      // }}
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
                            {apiSubCategoryDropdown?.sub_category?.map(
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
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Proposal Number
                  </FormCheck.Label>
                  <Controller
                    name="proposal_num"
                    control={control}
                    rules={{
                      required: !noShareholderProposalValue
                        ? "Proposal Number is required"
                        : false,
                    }}
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
                <div className="w-full flex-1">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Proposal Name
                  </FormCheck.Label>
                  <Controller
                    name="proposal_name"
                    control={control}
                    rules={{
                      required: !noShareholderProposalValue
                        ? "Proposal Name is required"
                        : false,
                    }}
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

              <div>
                <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                  Proposal Text
                </FormCheck.Label>
                <Controller
                  name="proposal_text"
                  control={control}
                  rules={{
                    required: !noShareholderProposalValue ? true : false,
                  }}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      rows={7}
                      placeholder="Enter your proposal text here"
                    />
                  )}
                />
                {errors.proposal_text && (
                  <Error className="lg:max-w-[50%]">
                    Proposal Text is required
                  </Error>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                    Select Proponent Options
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="institution"
                      control={control}
                      // rules={{ required: "Proponent Name is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelectServer
                            url="/institute/?type=Proponent&all=true"
                            valueKey="id"
                            labelKey="institution"
                            value={field?.value?.toString() || ""}
                            onChange={(value) => field.onChange(value)}
                            options={{
                              placeholder: "Select Proponent Options",
                            }}
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
                    name="proponent"
                    control={control}
                    rules={{
                      required: !noShareholderProposalValue
                        ? "Actual Proponent Name is required"
                        : false,
                    }}
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
                    Percentage Support
                  </FormCheck.Label>
                  <Controller
                    name="percentage_support"
                    control={control}
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

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Pass or Fail
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="vote_outcome"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? " "}
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
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                    Vote Requirement
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="vote_outcome_formula"
                      control={control}
                      // rules={{ required: "Vote Requirement is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            options={{
                              placeholder: "Select Vote Requirement",
                            }}
                            className="w-full text-left"
                          >
                            {[
                              "For / (For + Against)",
                              "For / (For + Against + Abstain)",
                              "For / (For + Against + Abstain + Broker Non-Votes)",
                            ].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
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
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                    Ready for Review
                  </FormCheck.Label>

                  <div className="mt-2 flex flex-col">
                    <Controller
                      name="ready_for_review"
                      control={control}
                      // rules={{ required: "NL exists is required" }}
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
                              Yes
                            </FormCheck.Label>
                          </FormCheck>

                          {/* <div>
                            {errors.status && (
                              <Error className="max-w-[100%] mt-6">
                                {errors.status?.message}
                              </Error>
                            )}
                          </div> */}
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                  No Action Letter Exists
                  </FormCheck.Label>

                  <div className="mt-2 flex flex-col">
                    <Controller
                      name="nl_exist"
                      control={control}
                      render={({ field }) => (
                        <>
                          <FormCheck className="flex items-center mr-2">
                            <FormCheck.Input
                              id="checkbox-switch-4"
                              type="checkbox"
                              {...field}
                              value="true"
                              checked={field.value === true}
                            />
                            <FormCheck.Label
                              htmlFor="checkbox-switch-4"
                              className="ml-2 text-left"
                            >
                              Yes
                            </FormCheck.Label>
                          </FormCheck>

                          
                        </>
                      )}
                    />
                  </div>
                </div>
              </div> */}

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                {/* {nlExistValue && ( */}
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block font-semibold text-gray-800 mb-2 text-left">
                    No Action ID Match
                  </FormCheck.Label>

                  <div className="mt-2">
                    <Controller
                      name="matched_id_no_action"
                      control={control}
                      // rules={{
                      //   required:  "No Action ID Match is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            options={{
                              placeholder: "Select No Action ID Match",
                            }}
                            className="w-full text-left"
                          >
                            {apiNoActionDropdown?.proposals?.map(
                              (proposals: any) => {
                                return (
                                  <option
                                    className=" text-blue-400"
                                    onClick={() =>
                                      navigate(
                                        `share-holder-proposal/${proposals?.id}?url=shareholder_proposal/no_action`
                                      )
                                    }
                                    value={proposals?.id}
                                    key={proposals?.id}
                                  >
                                    {proposals?.proposal_text}
                                  </option>
                                );
                              }
                            )}
                          </TomSelect>
                          {/* {error && (
                              <Error className="text-red-600 mt-2">
                                {error.message}
                              </Error>
                            )} */}
                        </>
                      )}
                    />
                  </div>
                </div>
                {/* )} */}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Status on the Dashboard
                  </FormCheck.Label>

                  <div className="mt-2 flex flex-col">
                    <Controller
                      name="status"
                      control={control}
                      // rules={{ required: "Admin Status is required" }}
                      render={({ field }) => (
                        <>
                          <div className="flex flex-row items-center mr-2">
                            <FormCheck className="flex items-center mr-2">
                              <FormCheck.Input
                                id="checkbox-switch-4"
                                type="checkbox"
                                {...field}
                                value="Admin"
                                checked={field.value === true}
                              />
                              <FormCheck.Label
                                htmlFor="checkbox-switch-4"
                                className="ml-2 text-left"
                              >
                                Admin
                              </FormCheck.Label>
                            </FormCheck>
                          </div>

                          {/* <div>

                          {errors.status && (
                            <Error className="max-w-[100%] mt-6">
                              {errors.status?.message}
                            </Error>
                          )}
                          </div> */}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Proposals
                  </FormCheck.Label>

                  <div className="mt-2 flex flex-col">
                    <Controller
                      name="no_shareholder_proposal"
                      control={control}
                      // rules={{ required: "Proposals is required" }}
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
                              Tick if there are no shareholder proposals for
                              this year
                            </FormCheck.Label>
                          </FormCheck>

                          {/* <div>
                            {errors.status && (
                              <Error className="max-w-[100%] mt-6">
                                {errors.status?.message}
                              </Error>
                            )}
                          </div> */}
                        </>
                      )}
                    />
                  </div>
                </div>
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
