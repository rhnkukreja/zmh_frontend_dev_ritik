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
import { shareHolderProposalService } from "@/services/shareholderProposal";
import MultiSearchBar from "@/components/MultiSearch";
import TomSelect from "@/components/Base/TomSelect";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import { addEditNewCaseStudies, fetchCaseStudies } from "@/stores/caseStudySlice";
import CompanySelect from "@/components/ReactSelectAsync";
import Litepicker from "@/components/Base/Litepicker";
interface AddNewCaseStudiesProps {
    addNewCaseStudyModalVisible: boolean;
    setAddNewCaseStudyModalVisible: (visible: boolean) => void;
    selectedCaseStudies: any | null;
}

const AddNewCaseStudies: React.FC<AddNewCaseStudiesProps> = ({
    addNewCaseStudyModalVisible,
    setAddNewCaseStudyModalVisible,
    selectedCaseStudies,
}) => {
    const dispatch: AppDispatch = useAppDispatch();
    const { loading, page } = useAppSelector(
        (state) => state.sharedHolderNoAction
    );
    const {
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<any>({
        defaultValues: {
            company: selectedCaseStudies?.company,
            institution: selectedCaseStudies?.institution,
            caspio_company_name: selectedCaseStudies?.caspio_company_name,
            caspio_company_ticker: selectedCaseStudies?.caspio_company_ticker,
            region: selectedCaseStudies?.region,
            market: selectedCaseStudies?.market,
            industry: selectedCaseStudies?.industry,
            esg_themes: selectedCaseStudies?.esg_themes,
            engagement_details: selectedCaseStudies?.engagement_details,
            proposal_type: selectedCaseStudies?.proposal_type,
            resolution_engagement_topic: selectedCaseStudies?.resolution_engagement_topic,
            vote: selectedCaseStudies?.vote,
            voting_rationale: selectedCaseStudies?.voting_rationale,
            voting_details: selectedCaseStudies?.voting_details,
            urls_def14: selectedCaseStudies?.urls_def14,
            urls_8k: selectedCaseStudies?.urls_8k,
            approval_status: selectedCaseStudies?.approval_status,
            year: selectedCaseStudies?.year,
        },
    });

    const { user, companyGlobalSearchName } = useAppSelector(
        (state) => state.authentiction
    );

    const [isSaveForm, setIsSaveForm] = useState(false);
    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [companyFilter, setCompanyFilter] = useState<string[]>([]);

    const holdingTypeDropdown = [
        'Equity',
        'Debt/fixed income',
        'Private company'
    ]

    const proposalTypeDropdown = [
        'Engagement',
        'Letter Campaign',
        'Management',
        'Proxy Contest',
        'Shareholder'
    ]

    const environmentalTypeDropdown = [
        'Governance (including ESG General)',
        'Proxy Contest/M&A',
        'Social',
    ]

    const categoryTypeDropdown = [
        'Board & Governance',
        'Compensation',
        'Corporate Strategy & Risk',
        'ESG',
        'Other'
    ]

    const voteTypeDropdown = [
        'For',
        'Against',
        'Abstain',
        'Split',
        'Not Available'
    ]



    const [apiDropdownOptions, setApiDropdownOptions] =
        useState<any>({
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

    const onSubmit = async (data: any) => {
        const transformedData: any = {
            ...data,
            institution: data.institution ? Number(data.institution) : 0,
            company: data?.company?.value ?? 0
        };

        // if (companyFilter?.length === 0) {
        //     setIsSaveForm(true);
        //     return;
        // }
        try {
            let response;
            if (selectedCaseStudies) {
                response = await dispatch(
                    addEditNewCaseStudies({
                        id: selectedCaseStudies?.id!,
                        data: transformedData,
                    })
                ).unwrap();
            } else {
                response = await dispatch(
                    addEditNewCaseStudies({ data: transformedData })
                ).unwrap();
            }

            if (response.results?.id) {
                toast.success(
                    selectedCaseStudies
                        ? "CaseStudies Proposal Updated"
                        : "New Case Studies Proposal Added"
                );
                setAddNewCaseStudyModalVisible(false);
                setIsSaveForm(false);
                dispatch(
                    fetchCaseStudies(
                        createDynamicURL(
                            `${baseURL}/case_studies/`,
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

    const handleSearch = (searchTerms: string[]) => {
        setCompanyFilter(searchTerms);
    };

    useEffect(() => {
        if (selectedCaseStudies) {
            setSearchTerms(
                selectedCaseStudies?.company_name
                    ? [selectedCaseStudies?.company_name]
                    : [""]
            );
            setCompanyFilter(
                selectedCaseStudies?.company
                    ? [selectedCaseStudies?.company]
                    : [""]
            );
        }
    }, [selectedCaseStudies]);

    const onError: SubmitErrorHandler<any> = () => {
        // setShowRequiredStateErrors(true);
    };

    return (
        <Dialog
            size="xl"
            open={addNewCaseStudyModalVisible}
            onClose={() => {
                setAddNewCaseStudyModalVisible(false);
            }}
        >
            <Dialog.Panel className="text-center">
                <form onSubmit={handleSubmit(onSubmit, onError)}>
                    <Dialog.Title>
                        <h2 className="mr-auto text-xl font-semibold">
                            {selectedCaseStudies
                                ? "Edit Case Studies"
                                : "Add New Case Studies"}
                        </h2>
                        <div
                            onClick={() => {
                                setAddNewCaseStudyModalVisible(false);
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
                                        Institution Name
                                    </FormCheck.Label>

                                    <div className="mt-2">
                                        <Controller
                                            name="institution"
                                            control={control}
                                            rules={{ required: "Institution Name is required" }}
                                            render={({ field, fieldState: { error } }) => (
                                                <>
                                                    <TomSelectServer
                                                        url="/institute"
                                                        valueKey="id"
                                                        labelKey="institution"
                                                        value={field?.value?.toString() || ""}
                                                        onChange={(value) => field.onChange(value)}
                                                        options={{ placeholder: "Select Institution" }}
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
                                        Industry
                                    </FormCheck.Label>
                                    <Controller
                                        name="industry"
                                        control={control}
                                        // rules={{ required: "Industry is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Industry"
                                                    {...field}
                                                />
                                                {/* {error && (
                                                    <Error className="text-red-600 ">
                                                        {error.message}
                                                    </Error>
                                                )} */}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="flex-1 w-full">
                                    <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                        Year
                                    </FormCheck.Label>

                                    <div className="mt-2">
                                        <Controller
                                            name="year"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
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
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                        Holding Type
                                    </FormCheck.Label>
                                    <div className="mt-2">
                                        <Controller
                                            name="investment_type"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
                                            render={({ field, fieldState: { error } }) => (
                                                <>
                                                    <TomSelect
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value);
                                                        }}
                                                        options={{
                                                            placeholder: "Select Holding Type",
                                                        }}
                                                        className="w-full text-left">
                                                        {holdingTypeDropdown?.map((item: string) => {
                                                            return <option value={item}>{item}</option>;
                                                        })}
                                                    </TomSelect>
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                        Proposal Type
                                    </FormCheck.Label>
                                    <div className="mt-2">
                                        <Controller
                                            name="proposal_type"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
                                            render={({ field, fieldState: { error } }) => (
                                                <>
                                                    <TomSelect
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value);
                                                        }}
                                                        options={{
                                                            placeholder: "Select Holding Type",
                                                        }}
                                                        className="w-full text-left"
                                                    >
                                                       {proposalTypeDropdown?.map((item: string) => {
                                                            return <option value={item}>{item}</option>;
                                                        })}
                                                    </TomSelect>
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    ESG Themes
                                    </FormCheck.Label>
                                    <div className="mt-2">
                                        <Controller
                                            name="esg_themes"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
                                            render={({ field, fieldState: { error } }) => (
                                                <>
                                                    <TomSelect
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value);
                                                        }}
                                                        options={{
                                                            placeholder: "Select ESG Themes",
                                                        }}
                                                        className="w-full text-left"
                                                    >
                                                        {environmentalTypeDropdown?.map((item: string) => {
                                                            return <option value={item}>{item}</option>;
                                                        })}
                                                    </TomSelect>
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Category
                                    </FormCheck.Label>
                                    <div className="mt-2">
                                        <Controller
                                            name="category"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
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
                                                        {categoryTypeDropdown?.map((item: string) => {
                                                            return <option value={item}>{item}</option>;
                                                        })}
                                                    </TomSelect>
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                

                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Vote
                                    </FormCheck.Label>
                                    <div className="mt-2">
                                        <Controller
                                            name="vote"
                                            control={control}
                                            // rules={{ required: "Year is required" }}
                                            render={({ field, fieldState: { error } }) => (
                                                <>
                                                    <TomSelect
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value);
                                                        }}
                                                        options={{
                                                            placeholder: "Select Vote",
                                                        }}
                                                        className="w-full text-left"
                                                    >
                                                        {voteTypeDropdown?.map((item: string) => {
                                                            return <option value={item}>{item}</option>;
                                                        })}
                                                    </TomSelect>
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 w-full">
                                    <FormCheck.Label className="block  font-semibold text-gray-800 mb-2 text-left">
                                        Approval Status
                                    </FormCheck.Label>

                                    <div className="mt-2 flex flex-col sm:flex-row">
                                        <Controller
                                            name="approval_status"
                                            control={control}
                                            rules={{ required: "Approval Status is required" }}
                                            render={({ field }) => (
                                                <>
                                                    <FormCheck className="flex items-center mr-2">
                                                        <FormCheck.Input
                                                            id="radio-switch-4"
                                                            type="radio"
                                                            {...field}
                                                            value="Approved"
                                                            checked={field.value === 'Approved'}
                                                            onChange={(e) => field.onChange('Approved')}
                                                        />
                                                        <FormCheck.Label
                                                            htmlFor="radio-switch-4"
                                                            className="ml-2"
                                                        >
                                                            Approved
                                                        </FormCheck.Label>
                                                    </FormCheck>
                                                    <FormCheck className="flex items-center mt-2 sm:mt-0 mr-2">
                                                        <FormCheck.Input
                                                            id="radio-switch-5"
                                                            type="radio"
                                                            {...field}
                                                            value="Pending"
                                                            checked={field.value === 'Pending'}
                                                            onChange={(e) => field.onChange('Pending')}
                                                        />
                                                        <FormCheck.Label
                                                            htmlFor="radio-switch-5"
                                                            className="ml-2"
                                                        >
                                                            Pending
                                                        </FormCheck.Label>
                                                    </FormCheck>
                                                    <FormCheck className="flex items-center mt-2 sm:mt-0">
                                                        <FormCheck.Input
                                                            id="radio-switch-5"
                                                            type="radio"
                                                            {...field}
                                                            value="ReturnToAnalyst"
                                                            checked={field.value === 'ReturnToAnalyst'}
                                                            onChange={(e) => field.onChange('ReturnToAnalyst')}
                                                        />
                                                        <FormCheck.Label
                                                            htmlFor="radio-switch-5"
                                                            className="ml-2"
                                                        >
                                                            Returned to Analyst
                                                        </FormCheck.Label>
                                                    </FormCheck>
                                                    {/* {errors.approval_status && (
                                                        <Error className="max-w-[100%] mt-6">
                                                            {errors.approval_status?.message}
                                                        </Error>
                                                    )} */}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Primary Source
                                    </FormCheck.Label>
                                    <Controller
                                        name="caspio_company_name"
                                        control={control}
                                        // rules={{ required: "Alternate Company Name is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Primary Source"
                                                    {...field}
                                                />
                                                {/* {error && (
                                                    <Error className="text-red-600 ">
                                                        {error.message}
                                                    </Error>
                                                )} */}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Page Reference
                                    </FormCheck.Label>
                                    <Controller
                                        name="caspio_company_ticker"
                                        control={control}
                                        // rules={{ required: "Alternate Company Ticker is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Page Reference"
                                                    {...field}
                                                />
                                                {/* {error && (
                                                    <Error className="text-red-600 ">
                                                        {error.message}
                                                    </Error>
                                                )} */}
                                            </>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Primary Source Link
                                    </FormCheck.Label>
                                    <Controller
                                        name="caspio_company_name"
                                        control={control}
                                        // rules={{ required: "Alternate Company Name is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Primary Source Link"
                                                    {...field}
                                                />
                                                {/* {error && (
                                                    <Error className="text-red-600 ">
                                                        {error.message}
                                                    </Error>
                                                )} */}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                        Meeting Date
                                    </FormCheck.Label>
                                    <div className="relative">
                                        <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                                            <Lucide icon="Calendar" className="w-4 h-4" />
                                        </div>

                                        <Controller
                                            name="meeting_Date"
                                            control={control}
                                            defaultValue=""
                                            rules={{ required: "Meeting Date is required" }}
                                            render={({ field }) => (
                                                <Litepicker
                                                    placeholder="Select Meeting Date"
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
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    URL def14
                                    </FormCheck.Label>
                                    <Controller
                                        name="urls_def14"
                                        control={control}
                                        rules={{
                                            // required: "URL def14 is required",
                                            pattern: {
                                                value: /^https:\/\/.+$/i,
                                                message: "The link must start with 'https://'",
                                            },
                                        }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter URL def14"
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
                                    URL 8k
                                    </FormCheck.Label>
                                    <Controller
                                        name="urls_8k"
                                        control={control}
                                        rules={{
                                            // required: "URL 8k is required",
                                            pattern: {
                                                value: /^https:\/\/.+$/i,
                                                message: "The link must start with 'https://'",
                                            },
                                        }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter URL 8k"
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
                                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                Resolution Engagement Topic
                                </FormCheck.Label>
                                <Controller
                                    name="resolution_engagement_topic"
                                    control={control}
                                    // rules={{ required: true }}
                                    render={({ field }) => (
                                        <ClassicEditor
                                            value={field?.value ?? ""}
                                            onChange={(event) => {
                                                field.onChange(event);
                                            }}
                                        />
                                    )}
                                />
                                {errors.resolution_engagement_topic && (
                                    <Error className="lg:max-w-[50%] ">
                                        Resolution Engagement Topic
                                    </Error>
                                )}
                            </div>

                            <div>
                                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                    Engagement Details
                                </FormCheck.Label>
                                <Controller
                                    name="engagement_details"
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
                                {errors.engagement_details && (
                                    <Error className="lg:max-w-[50%] ">
                                        Engagement Details are required
                                    </Error>
                                )}
                            </div>

                            <div>
                                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                    Voting Details
                                </FormCheck.Label>
                                <Controller
                                    name="voting_details"
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
                                {errors.voting_rationale && (
                                    <Error className="lg:max-w-[50%] ">
                                        Voting Details are required
                                    </Error>
                                )}
                            </div>

                            <div>
                                <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                    Voting Rationale
                                </FormCheck.Label>
                                <Controller
                                    name="voting_rationale"
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
                                {errors.voting_rationale && (
                                    <Error className="lg:max-w-[50%] ">
                                        Voting Rationale are required
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
                                setAddNewCaseStudyModalVisible(false);
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

export default AddNewCaseStudies;
