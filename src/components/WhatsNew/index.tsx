import React, { useEffect, useState } from "react";
import { Dialog, Tab } from "../Base/Headless";
import Button from "../Base/Button";
import { FormCheck, FormInput, FormTextarea } from "../Base/Form";
import { Controller, useForm } from "react-hook-form";
import {
  ContactUsAdditionalData,
  HelpFormData,
  InformationType,
  RequestAdditionalData,
} from "@/types/common";
import Error from "../Error";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import Lucide from "../Base/Lucide";
import CompanySelect from "../ReactSelectAsync";

interface GetHelpProps {
  whatsNewFormVisible: boolean;
  setWhatsNewFormVisible: (value: boolean) => void;
}

const GetWhatsNew = ({
  whatsNewFormVisible,
  setWhatsNewFormVisible,
}: GetHelpProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {

      const updatedData={...data, company:data?.company?.value} 
      const res = await commonService.requestWhatsNew({
        ...updatedData
      });

      if (res.id) {
        toast.success("Request submitted successfully");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setWhatsNewFormVisible(false);
      reset();
    }
  };

  useEffect(() => {
    return () => setIsLoading(false);
  }, []);

  return (
    <Dialog
      size="lg"
      open={whatsNewFormVisible}
      onClose={() => {
        setWhatsNewFormVisible(false);
        reset();
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Panel className="text-center">
          <Dialog.Title
            className=" rounded-t-md to-[#000000CC] from-[#9F1239] "
          >
            <h2 className="mr-auto text-md font-semibold">Email Alert</h2>
            <div
              onClick={() => {
                reset();
                setWhatsNewFormVisible(false);
              }}
              className="absolute  top-0 right-0 mt-2 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-6 h-6 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="w-full">
                <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                  Modules*
                </FormCheck.Label>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="modules"
                    control={control}
                    defaultValue={[]}
                    rules={{ required: "Modules is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        {[
                          "Shareholder Proposals",
                          "Proxy Voting Guidelines",
                          "Investor Profile",
                          "Case Studies",
                          "Engagement Details",
                          "Voting Data",
                        ].map((InfoType, index) => (
                          <FormCheck key={index} className="mt-2">
                            <FormCheck.Input
                              id={`checkbox-switch-${index + 1}`}
                              type="checkbox"
                              value={InfoType as InformationType}
                              checked={field.value.includes(
                                InfoType as InformationType
                              )}
                              className="mr-2"
                              onChange={(e) => {
                                const updatedValue = e.target.checked
                                  ? [
                                      ...field.value,
                                      InfoType as InformationType,
                                    ]
                                  : field.value.filter(
                                      (val: InformationType) => val !== InfoType
                                    );
                                field.onChange(updatedValue);
                              }}
                            />
                            <label htmlFor={`checkbox-switch-${index + 1}`}>
                              {InfoType}
                            </label>
                          </FormCheck>
                        ))}

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
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
             

              <div className="w-full email-alert">
                <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                  Company*
                </FormCheck.Label>
             <div className="text-left">
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: "Company is required" }}
                    render={({ field, fieldState: { error } }) => (
                    <>  <CompanySelect
                        value={field.value}
                        onChange={field.onChange}
                        isMulti={false}
                        className="mt-1"
                      />

                       {error && (
                        <div>
                          <Error className="text-red-600 mt-2">
                            {error.message}
                          </Error>
                        </div>
                        )}
                    </>
                    )}
                  />
                </div>
              </div>
               <div className="w-full">
                <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                  Schedule*
                </FormCheck.Label>
               
                  <Controller
                    name="schedule"
                    control={control}
                    rules={{ required: "Schedule is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                         <div className="flex flex-col sm:flex-row py-2">
                        <FormCheck className="flex items-center  mr-2">
                          <FormCheck.Input
                            id="radio-switch-4"
                            type="radio"
                            {...field}
                            value="Daily"
                            checked={field.value === "Daily"}
                            onChange={(e) => field.onChange("Daily")}
                          />
                          <FormCheck.Label
                            htmlFor="radio-switch-4"
                            className="ml-2"
                          >
                            Daily
                          </FormCheck.Label>
                        </FormCheck>
                        <FormCheck className="flex items-center mr-2">
                          <FormCheck.Input
                            id="radio-switch-5"
                            type="radio"
                            {...field}
                            value="Weekly"
                            checked={field.value === "Weekly"}
                            onChange={(e) => field.onChange("Weekly")}
                          />
                          <FormCheck.Label
                            htmlFor="radio-switch-5"
                            className="ml-2"
                          >
                            Weekly
                          </FormCheck.Label>
                        </FormCheck>
                        <FormCheck className="flex items-center mt-2 sm:mt-0">
                          <FormCheck.Input
                            id="radio-switch-6"
                            type="radio"
                            {...field}
                            value="Monthly"
                            checked={field.value === "Monthly"}
                            onChange={(e) => field.onChange("Monthly")}
                          />
                          <FormCheck.Label
                            htmlFor="radio-switch-6"
                            className="ml-2"
                          >
                            Monthly
                          </FormCheck.Label>
                        </FormCheck>
                          </div>
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
          </Dialog.Description>
          <Dialog.Footer className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 w-full px-4 py-3">
            <Button
              onClick={() => {
                reset();
                setWhatsNewFormVisible(false);
              }}
              type="button"
              variant="outline-secondary"
              className="w-full sm:w-auto border-danger  text-danger"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-b rounded-t-md to-[#000000CC] from-[#9F1239]"
            >
              {isLoading && (
                <Lucide
                  icon="Loader"
                  type="submit"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
              )}
              Submit
            </Button>
          </Dialog.Footer>
        </Dialog.Panel>
      </form>
    </Dialog>
  );
};

export default GetWhatsNew;
