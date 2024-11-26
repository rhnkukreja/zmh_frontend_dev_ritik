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
            company: companyFilter?.length > 0 ? companyFilter[0] : 0,
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

                                <div className="flex-1 w-full">
                                    <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                        Company Name
                                    </FormCheck.Label>

                                    <div className="mt-2">
                                        <>
                                            <div className="flex items-center ">
                                                <MultiSearchBar
                                                    isRadioInput={true}
                                                    onSearch={handleSearch}
                                                    searchTerms={searchTerms}
                                                    setSearchTerms={setSearchTerms}
                                                    url="/company/"
                                                    getValueKey="id"
                                                    urlQueryKey="company_name"
                                                    getOptionKey="name"
                                                    placeHolder="Search Company"
                                                />
                                            </div>

                                            {/* {isSaveForm && companyFilter?.length === 0 && (
                                                <Error className="text-red-600 mt-2">
                                                    Company is Required
                                                </Error>
                                            )} */}
                                        </>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    Alternate Company Name
                                    </FormCheck.Label>
                                    <Controller
                                        name="caspio_company_name"
                                        control={control}
                                        // rules={{ required: "Alternate Company Name is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Alternate Company Name"
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
                                        Alternate Company Ticker
                                    </FormCheck.Label>
                                    <Controller
                                        name="caspio_company_ticker"
                                        control={control}
                                        // rules={{ required: "Alternate Company Ticker is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Alternate Company Ticker"
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
                                    Region
                                    </FormCheck.Label>
                                    <Controller
                                        name="region"
                                        control={control}
                                        rules={{ required: "Region is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Region"
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
                                    Market
                                    </FormCheck.Label>
                                    <Controller
                                        name="market"
                                        control={control}
                                        // rules={{ required: "Market is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Market"
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
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-8 sm:gap-16">
                                <div className="w-full flex-1">
                                    <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                                    ESG Themes
                                    </FormCheck.Label>
                                    <Controller
                                        name="esg_themes"
                                        control={control}
                                        rules={{ required: "ESG Themes is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter ESG Themes"
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
                                    Proposal Type
                                    </FormCheck.Label>
                                    <Controller
                                        name="proposal_type"
                                        control={control}
                                        rules={{ required: "Proposal Type is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Proposal Type"
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
                                    Resolution Engagement Topic
                                    </FormCheck.Label>
                                    <Controller
                                        name="resolution_engagement_topic"
                                        control={control}
                                        // rules={{ required: "Resolution Engagement Topic is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Resolution Engagement Topic"
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
                                    Vote
                                    </FormCheck.Label>
                                    <Controller
                                        name="vote"
                                        control={control}
                                        // rules={{ required: "Vote is required" }}
                                        render={({ field, fieldState: { error } }) => (
                                            <>
                                                <FormInput
                                                    placeholder="Enter Vote"
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
