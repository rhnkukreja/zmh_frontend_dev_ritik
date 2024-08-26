import Button from "@/components/Base/Button";
import { FormCheck, FormTextarea } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";

import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addEditEngagementQuestion,
  fetchEngagementQuestions,
} from "@/stores/engagementQuestionSlice";
import { AppDispatch } from "@/stores/store";

import React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import ServerTomSelect from "@/components/Base/TomSelect/ServerComponent";
import TomSelect from "@/components/Base/TomSelect";
import Litepicker from "@/components/Base/Litepicker";
import {
  EngagementFormData,
  EngagementQuestions,
} from "@/types/engagementQuestions";
import { createDynamicURL, formatedDate } from "@/utils/helper";
import { baseURL } from "@/constant";
import Error from "@/components/Error";

interface AddEditEngagementQuestionProps {
  addNewEngagementQuestionModalVisible: boolean;
  setAddNewEngagementQuestionModalVisible: (visible: boolean) => void;
  selectedEngagementQuestion: EngagementQuestions | null;
}

export const AddEditEngagementQuestion: React.FC<
  AddEditEngagementQuestionProps
> = ({
  addNewEngagementQuestionModalVisible,
  setAddNewEngagementQuestionModalVisible,
  selectedEngagementQuestion,
}) => {
  const dispatch: AppDispatch = useAppDispatch();

  const { loading, page } = useAppSelector(
    (state) => state.engagementQuestions
  );
  const {
    control,
    handleSubmit,

    formState: { errors },
  } = useForm<EngagementFormData>({
    defaultValues: {
      active: selectedEngagementQuestion?.active,
      engagement_date:
        selectedEngagementQuestion?.engagement_date instanceof Date
          ? selectedEngagementQuestion?.engagement_date
              .toISOString()
              .split("T")[0]
          : selectedEngagementQuestion?.engagement_date || "",

      engagement_question:
        selectedEngagementQuestion?.engagement_question || "",
      other_comments: selectedEngagementQuestion?.other_comments || "",
      institution: selectedEngagementQuestion?.institution,
      company: selectedEngagementQuestion?.company,
      type_of_engagement:
        selectedEngagementQuestion?.type_of_engagement || "ESG",
      source: selectedEngagementQuestion?.source || "Investor Engagement",
      category: selectedEngagementQuestion?.category || "Environmental",
    },
  });

  const onSubmit = async (data: EngagementFormData) => {
    const transformData = {
      ...data,
      institution: data?.institution ? Number(data?.institution) : null,
      company: data?.company ? Number(data?.company) : null,
      engagement_date: data?.engagement_date
        ? formatedDate(data?.engagement_date)
        : null,
    };
    const formData = new FormData();

    for (const [key, value] of Object.entries(transformData)) {
      formData.append(key, value as any);
    }

    try {
      let response;

      if (selectedEngagementQuestion) {
        response = await dispatch(
          addEditEngagementQuestion({
            id: selectedEngagementQuestion?.id,
            data: formData as unknown as EngagementFormData,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditEngagementQuestion({
            data: formData as unknown as EngagementFormData,
          })
        ).unwrap();

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

      if (response?.results?.id) {
        toast.success(
          selectedEngagementQuestion
            ? "Invester Profile Updated"
            : "New Invester Profile Added"
        );
        setAddNewEngagementQuestionModalVisible(false);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Dialog
      size="xl"
      open={addNewEngagementQuestionModalVisible}
      onClose={() => {
        setAddNewEngagementQuestionModalVisible(false);
      }}
    >
      <Dialog.Panel className=" text-center">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
              {selectedEngagementQuestion
                ? "Edit Engagement Question"
                : "Add New Engagement Question"}
            </h2>
            <div
              onClick={() => {
                setAddNewEngagementQuestionModalVisible(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="w-full">
                <FormCheck.Label
                  htmlFor="company"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Company
                </FormCheck.Label>

                <Controller
                  name="company"
                  control={control}
                  rules={{ required: "Company is required" }}
                  render={({ field }) => {
                    return (
                      <ServerTomSelect
                        url="/company/"
                        valueKey="id"
                        labelKey="name"
                        value={field.value?.toString() || ""}
                        onChange={(value) => field.onChange(value)}
                        options={{ placeholder: "Select Company" }}
                        className="w-full"
                      />
                    );
                  }}
                />

                {errors.company && (
                  <Error className="max-w-[100%] ">
                    {errors.company.message}
                  </Error>
                )}
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Active
                </FormCheck.Label>
                <div className="flex flex-col sm:flex-row">
                  <Controller
                    name="active"
                    control={control}
                    rules={{ required: "Active status is required" }}
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
                {errors.active && (
                  <Error className="max-w-[100%] mt-6">
                    {errors.active?.message}
                  </Error>
                )}
              </div>

              {/* Type of Engagement */}
              <div className="w-full">
                <FormCheck.Label
                  htmlFor="type_of_engagement"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Type of Engagement
                </FormCheck.Label>
                <Controller
                  name="type_of_engagement"
                  control={control}
                  defaultValue=""
                  rules={{ required: "Type of Engagement is required" }}
                  render={({ field }) => (
                    <TomSelect
                      {...field}
                      value={field.value?.toString() || ""}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                      options={{
                        placeholder: "Select Engagement Type",
                      }}
                      className="w-full text-left"
                    >
                      <option value="" disabled selected>
                        Select Type
                      </option>
                      <option value="ESG">ESG</option>
                      <option value="Proxy">Proxy</option>
                    </TomSelect>
                  )}
                />

                {errors.type_of_engagement && (
                  <Error className="max-w-[100%] ">
                    {errors.type_of_engagement.message}
                  </Error>
                )}
              </div>

              <div className="w-full">
                <FormCheck.Label
                  htmlFor="engagement_date"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Engagement Date
                </FormCheck.Label>

                <div className="relative">
                  <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                    <Lucide icon="Calendar" className="w-4 h-4" />
                  </div>

                  <Controller
                    name="engagement_date"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Engagement Date is required" }}
                    render={({ field }) => (
                      <Litepicker
                        placeholder="Select Engagement Date"
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

                {errors.engagement_date && (
                  <Error className="max-w-[100%] ">
                    {errors.engagement_date.message}
                  </Error>
                )}
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                  Institution Name
                </FormCheck.Label>

                <div className="mt-2">
                  <Controller
                    name="institution"
                    control={control}
                    defaultValue={null}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field }) => (
                      <ServerTomSelect
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
                    {errors.institution.message}
                  </Error>
                )}
              </div>

              <div className="w-full">
                <FormCheck.Label
                  htmlFor="source"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Source
                </FormCheck.Label>

                <Controller
                  name="source"
                  control={control}
                  defaultValue=""
                  rules={{ required: "Source is required" }}
                  render={({ field }) => (
                    <TomSelect
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      options={{
                        placeholder: "Select Source",
                      }}
                      className="w-full text-left"
                    >
                      <option value="" disabled>
                        Select Source
                      </option>
                      <option value="Investor Engagement">
                        Investor Engagement
                      </option>
                      <option value="Letter Campaign">Letter Campaign</option>
                    </TomSelect>
                  )}
                />

                {errors.source && (
                  <Error className="max-w-[100%] ">
                    {errors.source.message}
                  </Error>
                )}
              </div>

              <div className="w-full">
                <FormCheck.Label
                  htmlFor="category"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Category
                </FormCheck.Label>

                <Controller
                  name="category"
                  control={control}
                  defaultValue=""
                  rules={{ required: "Category is required" }}
                  render={({ field }) => (
                    <TomSelect
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      options={{
                        placeholder: "Select your Category",
                      }}
                      className="w-full text-left"
                    >
                      <option value="" disabled>
                        Select Category
                      </option>
                      <option value="Environmental">Environmental</option>
                      <option value="Governance">Governance</option>
                      <option value="Social">Social</option>
                    </TomSelect>
                  )}
                />

                {errors.category && (
                  <Error className="max-w-[100%] ">
                    {errors.category.message}
                  </Error>
                )}
              </div>

              {/* Other Comments */}
              <div className="w-full">
                <FormCheck.Label
                  htmlFor="other_comments"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Other Comments
                </FormCheck.Label>
                <Controller
                  name="other_comments"
                  control={control}
                  render={({ field }) => (
                    <FormTextarea
                      id="other_comments"
                      placeholder="Enter Other Comments"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* Engagement Question */}
              <div className="w-full">
                <FormCheck.Label
                  htmlFor="engagement_question"
                  className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left"
                >
                  Engagement Question
                </FormCheck.Label>

                <Controller
                  name="engagement_question"
                  control={control}
                  rules={{ required: "Engagement Question is required" }}
                  render={({ field }) => (
                    <FormTextarea
                      placeholder="Enter Engagement Question"
                      id="engagement_question"
                      {...field}
                    />
                  )}
                />

                {errors.engagement_question && (
                  <Error className="max-w-[100%] ">
                    {errors.engagement_question.message}
                  </Error>
                )}
              </div>
            </div>
          </Dialog.Description>

          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setAddNewEngagementQuestionModalVisible(false);
              }}
              className="w-20 mr-3"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading && (
                <Lucide
                  icon="Loader"
                  className="w-4 h-4 mr-1.5 stroke-[1.3] animate-spin"
                />
              )}

              {selectedEngagementQuestion ? "Update" : "Save"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};
