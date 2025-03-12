import Button from "@/components/Base/Button";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { createDynamicURL } from "@/utils/helper";
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
import { addEditNewWithdrawn, fetchShareHolderProposal, getSingleShareHolderData } from "@/stores/shareholderProposalSlice";
import { AddWithdrawnType, ShareHolderDropdown } from "@/types/shareHolder";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import MultiSearchBar from "@/components/MultiSearch";
import CompanySelect from "@/components/ReactSelectAsync";
import { useLocation } from "react-router-dom";

interface AddWithdrawnProps {
  addNewWithdrawnModalVisible: boolean;
  setAddNewWithdrawnModalVisible: (visible: boolean) => void;
  selectedShareholderWithdrawn: AddWithdrawnType | null;
}

const AddNewWithdrawn: React.FC<AddWithdrawnProps> = ({
  addNewWithdrawnModalVisible,
  setAddNewWithdrawnModalVisible,
  selectedShareholderWithdrawn
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page, filters } = useAppSelector((state) => state.sharedHolderNoAction);


  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const url = searchParams.get('url')
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddWithdrawnType>(
    {
      defaultValues: 
      {
        proponent: selectedShareholderWithdrawn?.institution,
        initiative: selectedShareholderWithdrawn?.initiative,
        company: selectedShareholderWithdrawn?.company_name,
        status: selectedShareholderWithdrawn?.status,
        year:selectedShareholderWithdrawn?.year,
        withdrawal_reason:selectedShareholderWithdrawn?.withdrawal_reason,
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

  const onSubmit = async (data: AddWithdrawnType) => {
    const transformedData = {
      ...data,
      proponent: data.proponent ? Number(data.proponent) : 0,
      company: data?.company?.value ?? selectedShareholderWithdrawn?.company ?? 0
    };

    try {
      let response;
      if (selectedShareholderWithdrawn) {
        response = await dispatch(addEditNewWithdrawn({ id: selectedShareholderWithdrawn?.id!, data: transformedData })).unwrap();
      }
      else {
        response = await dispatch(addEditNewWithdrawn({data: transformedData})).unwrap();
      }

      if (response.results?.id) {
        toast.success(selectedShareholderWithdrawn ? 'Shareholder Withdrawn Updated' : "New Shareholder Withdrawn Added");
        setAddNewWithdrawnModalVisible(false);

        dispatch(
          fetchShareHolderProposal(
            createDynamicURL(
              `${baseURL}/shareholder_proposal/withdrawn/`,
              // { global_search: companyGlobalSearchName },
              filters,
              undefined,
              page
            )
          )
        );

        if (selectedShareholderWithdrawn?.id && url) {
          dispatch(getSingleShareHolderData({ url: 'shareholder_proposal/withdrawn', id: Number(selectedShareholderWithdrawn?.id) }));
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const onError: SubmitErrorHandler<any> = () => {
  };

  return (
    <Dialog
      size="xl"
      open={addNewWithdrawnModalVisible}
      onClose={() => {
        setAddNewWithdrawnModalVisible(false);
      }}
    >
      <Dialog.Panel className="text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
              {selectedShareholderWithdrawn
                ? "Edit Shareholder Withdrawn"
                : "Add New Shareholder Withdrawn"}
              </h2>
            <div
              onClick={() => {
                setAddNewWithdrawnModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">

            {/* Garbage */}
            <div className=" absolute top-[-900px]">
              <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                .
              </FormCheck.Label>
              <input />
            </div>
            {/* Garbage */}
            
            <div className="flex flex-col gap-7">
              {/* Institution Name */}
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
                            url="/institute"
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
                   Company Name
                  </FormCheck.Label>
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: "Company Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <CompanySelect
                        setDefaultValue={field.value}
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
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Reason for Withdrawal
                  </FormCheck.Label>
                  <Controller
                    name="withdrawal_reason"
                    control={control}
                    rules={{ required: "Reason for Withdrawal is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Reason for Withdrawal"
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
                    Initiative
                  </FormCheck.Label>
                  <Controller
                    name="initiative"
                    control={control}
                    rules={{ required: "Initiative is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Initiative"
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
                <div className="flex-1 w-full">
                  <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                    Status
                  </FormCheck.Label>

                  <div className="mt-2">
                    {/* <Controller
                      name="status"
                      control={control}
                      rules={{ required: "Status is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <TomSelect
                            value={field.value ?? ''}
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
                                return (
                                  <option value={status}>{status}</option>
                                );
                              }
                            )}
                          </TomSelect>
                         
                        </>
                      )}
                    /> */}
                    <Controller
                    name="status"
                    control={control}
                    rules={{ required: "Status is required" }}
                    defaultValue="Withdrawn"
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput
                          placeholder="Enter Status"
                          {...field}
                        />
                        {error && (
                          <Error className="text-red-600 ">{error.message}</Error>
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
                          {/* {error && (
                            <Error className="text-red-600 mt-2">
                              {error.message}
                            </Error>
                          )} */}
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


              



            </div>
          </Dialog.Description>


          <Dialog.Footer className="flex justify-end">
            <Button
              variant="outline-secondary"
              className="mr-3"
              onClick={() => {
                setAddNewWithdrawnModalVisible(false);
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

export default AddNewWithdrawn;
