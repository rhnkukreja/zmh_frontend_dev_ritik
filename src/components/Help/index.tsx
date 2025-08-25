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

interface GetHelpProps {
  helpFormVisible: boolean;
  setHelpFormVisible: (value: boolean) => void;
}

const GetHelp = ({ helpFormVisible, setHelpFormVisible }: GetHelpProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "requestAdditionalData" | "contactUs"
  >("requestAdditionalData");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HelpFormData>();

  const onSubmit = async (data: HelpFormData) => {
    setIsLoading(true);
    try {
      if (selectedTab === "requestAdditionalData") {
        const res = await commonService.requstAdditionalDataList({
          ...data,
          created_by: null,
        } as RequestAdditionalData);

        if (res.id) {
          toast.success("Request submitted successfully");
        }
      } else {
        const res = await commonService.contactUs({
          ...data,
          created_by: null,
        } as ContactUsAdditionalData);

        if (res.id) {
          toast.success("Send successfully");
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setHelpFormVisible(false);
      reset();
    }
  };

  useEffect(() => {
    return () => setIsLoading(false);
  }, []);

  return (
    <Dialog
      size="lg"
      open={helpFormVisible}
      onClose={() => {
        setHelpFormVisible(false);
        reset();
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Panel className="text-center">
          <Dialog.Title
            className="bg-gradient-to-b rounded-t-md to-[#000000CC] from-[#9F1239]
                    text-white  "
          >
            <h2 className="mr-auto text-md font-semibold">Help?</h2>
            <div
              onClick={() => {
                reset();
                setHelpFormVisible(false);
              }}
              className="absolute  top-0 right-0 mt-2 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-6 h-6 text-white" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <Tab.Group
              selectedIndex={selectedTab === "requestAdditionalData" ? 0 : 1}
            >
              <Tab.List variant="link-tabs">
                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTab("requestAdditionalData");
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      Request Additional Data
                    </div>
                  </Tab.Button>
                </Tab>

                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTab("contactUs");
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      Contact Us / Feedback
                    </div>
                  </Tab.Button>
                </Tab>
              </Tab.List>
              <Tab.Panels className="mt-5">
                <Tab.Panel>
                  <div className="grid grid-cols-1  gap-4">
                    <div className="w-full">
                      <Controller
                        name="name"
                        control={control}
                        defaultValue=""
                        rules={{ required: "Name is required" }}
                        render={({ field }) => (
                          <>
                            <label
                              htmlFor="investmentName"
                              className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                            >
                              Enter Investor or Company Name*
                            </label>
                            <FormInput
                              id="investmentName"
                              type="text"
                              placeholder="Type here"
                              {...field}
                            />
                          </>
                        )}
                      />

                      {errors && "name" in errors && errors.name && (
                        <Error className="max-w-[100%] ">
                          {errors.name.message}
                        </Error>
                      )}
                    </div>
                    <div className="w-full">
                      <Controller
                        name="type_of_information"
                        control={control}
                        defaultValue={[]}
                        rules={{ required: "Information is required" }}
                        render={({ field }) => (
                          <>
                            <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                              Select Information Required*
                            </label>
                            {[
                              "Investor Profile",
                              "Proxy Voting Guidelines",
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
                                          (val: InformationType) =>
                                            val !== InfoType
                                        );
                                    field.onChange(updatedValue);
                                  }}
                                />
                                <label htmlFor={`checkbox-switch-${index + 1}`}>
                                  {InfoType}
                                </label>
                              </FormCheck>
                            ))}
                          </>
                        )}
                      />

                      {errors &&
                        "type_of_information" in errors &&
                        errors.type_of_information && (
                          <Error className="max-w-[100%] ">
                            {errors?.type_of_information.message}
                          </Error>
                        )}
                    </div>

                    <div className="w-full">
                      <label
                        htmlFor="oadditional_comments"
                        className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                      >
                        Additional Comments
                      </label>
                      <Controller
                        name="comments"
                        control={control}
                        render={({ field }) => (
                          <FormTextarea
                            id="comments"
                            placeholder="Type here"
                            {...field}
                          />
                        )}
                      />
                    </div>
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <div className="grid grid-cols-1  gap-4">
                    <div className="w-full">
                      <label
                        htmlFor="oadditional_comments"
                        className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                      >
                        What would you like to discuss?*
                      </label>
                      <Controller
                        name="issue"
                        control={control}
                        rules={{ required: "Write your Feedback" }}
                        render={({ field }) => (
                          <FormTextarea
                            rows={5}
                            id="issue"
                            placeholder="Type here"
                            {...field}
                          />
                        )}
                      />

                      {errors && "issue" in errors && errors.issue && (
                        <Error className="max-w-[100%] ">
                          {errors?.issue.message}
                        </Error>
                      )}
                    </div>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </Dialog.Description>
          <Dialog.Footer className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 w-full px-4 py-3">
            <Button
              onClick={() => {
                reset();
                setHelpFormVisible(false);
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

export default GetHelp;
