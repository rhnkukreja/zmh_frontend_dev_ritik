import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Table from "@/components/Base/Table";
import { useEffect, useState } from "react";
import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
    fetchEngagementQuestions,
    setPage,
} from "@/stores/engagementQuestionSlice";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate } from "react-router-dom";
import { EngagementQuestions } from "@/types/engagementQuestions";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";

interface EngagementQuestionsDialogProps {
    institution_name: string,
}

const EngagementQuestionsDialog: React.FC<EngagementQuestionsDialogProps> = ({ institution_name }) => {
    const dispatch: AppDispatch = useAppDispatch();
    const navigate = useNavigate();
    const {
        questions,
        loading,
        page,
        count,
        totalPages,
        filters,
    } = useAppSelector((state) => state.engagementQuestions);
    const { user } = useAppSelector((state) => state.authentiction);
    const [selectedEngagementQuestion, setSelectedEngagementQuestion] =
        useState<EngagementQuestions | null>(null);
    const [groupedQuestions, setGroupedQuestions] = useState<any>([]);
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
    const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
    const [filtersLength, setFiltersLength] = useState<number>(0);
    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);

    const checkImageUrl = async (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;

            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
        });
    };

    const validateImages = async () => {
        if (!questions) return;
        const tempValidImages: { [key: string]: string } = {};
        for (const question of questions) {
            const isValid = await checkImageUrl(question?.institution_logo_url);
            tempValidImages[question?.institution_name] = isValid
                ? question?.institution_logo_url
                : userLinkedinImage;
        }

        setValidImages(tempValidImages);
    };

    const [
        addNewEngagementQuestionModalVisible,
        setAddNewEngagementQuestionModalVisible,
    ] = useState<boolean>(false);

    useEffect(() => {
        const institutionArray = institution_name ? [institution_name] : [];
        console.log("institution_name", institution_name);
        const dynamicURL = createDynamicURL(
            `${baseURL}/engagement_questions/`,
            { institution_name: institutionArray },
            undefined,
            page
        );
        dispatch(fetchEngagementQuestions(dynamicURL));
        const { ...restFilters } = filters;
        setFiltersLength(countValidFilters(restFilters));
        setSelectedChipFilters(generateFilterChips(restFilters));
    }, [page, filters]);

    const handleNextPage = () => {
        if (page < totalPages) {
            dispatch(setPage(page + 1));
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            dispatch(setPage(page - 1));
        }
    };

    const handlePageChange = (newPage: number) => {
        dispatch(setPage(newPage));
    };

    const onEditClickHandler = (question: EngagementQuestions) => {
        setSelectedEngagementQuestion(question);
        setAddNewEngagementQuestionModalVisible(true);
    };

    useEffect(() => {
        if (addNewEngagementQuestionModalVisible === false) {
            setSelectedEngagementQuestion(null);
        }
    }, [addNewEngagementQuestionModalVisible]);

    useEffect(() => {
        const groupedQuestions = questions?.reduce((acc: any, question: any) => {
            const institutionName = question?.institution_name;
            if (!acc[institutionName]) {
                acc[institutionName] = [];
            }
            acc[institutionName].push(question);
            return acc;
        }, {});

        setGroupedQuestions(groupedQuestions);
    }, [questions]);

    useEffect(() => {
        if (groupedQuestions) {
            const initialOpenGroups = Object.keys(groupedQuestions).reduce(
                (acc, institutionName) => {
                    acc[institutionName] = openGroups[institutionName] ?? true;
                    return acc;
                },
                {} as { [key: string]: boolean }
            );
            setOpenGroups(initialOpenGroups);

            validateImages();
        }
    }, [groupedQuestions]);

    const toggleGroup = (institutionName: string) => {
        setOpenGroups((prevState) => ({
            ...prevState,
            [institutionName]: !prevState[institutionName],
        }));
    };

    return (
        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
            <div className="col-span-12">
                <div className="mt-3.5">
                    <div className="flex flex-col box box--stacked">
                        {count > 0 && (
                            <h2 className="flex items-end font-semibold justify-end my-2 text-[13px] md:ml-auto mx-5 mb-1">
                                Count: {count}
                            </h2>
                        )}
                        <div className=" xl:overflow-auto px-5 mt-5">
                            <TableWrapper isLoading={loading}>
                                <div className="overflow-auto max-h-[400px]">
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Institution
                                                </Table.Td>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Category
                                                </Table.Td>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Engagement Questions
                                                </Table.Td>
                                                <Table.Td className="text-wrap py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Engagement Date
                                                </Table.Td>
                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Details
                                                </Table.Td>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody className="!max-h-400px overflow-auto">
                                            <>
                                                {groupedQuestions ? (
                                                    Object.entries(groupedQuestions).map(
                                                        ([institutionName, institutionQuestions]: [
                                                            string,
                                                            any
                                                        ]) => (
                                                            <>
                                                                <Table.Tr
                                                                    className="bg-gray-100 dark:bg-darkmode-700 cursor-pointer"
                                                                    onClick={() => toggleGroup(institutionName)}
                                                                >
                                                                    <Table.Td
                                                                        colSpan={5}
                                                                        className="font-semibold py-2"
                                                                    >
                                                                        <div className="flex flex-row justify-start items-center">
                                                                            <div className="w-10 h-10 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                                                {
                                                                                    <img
                                                                                        alt="ZMH Analytics"
                                                                                        src={
                                                                                            validImages[institutionName] ||
                                                                                            userLinkedinImage
                                                                                        }
                                                                                    />
                                                                                }
                                                                            </div>
                                                                            {institutionName}

                                                                            <button className="ml-2 text-blue-500">
                                                                                {openGroups[institutionName] ? (
                                                                                    <Lucide
                                                                                        icon="ChevronUp"
                                                                                        className=" w-6 h-6 mr-2 "
                                                                                    />
                                                                                ) : (
                                                                                    <Lucide
                                                                                        icon="ChevronDown"
                                                                                        className=" w-6 h-6 mr-2 "
                                                                                    />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                                {openGroups[institutionName] &&
                                                                    Array.isArray(institutionQuestions) &&
                                                                    institutionQuestions.map((question: any) => (
                                                                        <Table.Tr
                                                                            key={question?.id}
                                                                            className="[&_td]:last:border-b-0"
                                                                        >
                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600"></Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-nowrap capitalize">
                                                                                    {question?.engagement_with_category}
                                                                                </div>
                                                                            </Table.Td>

                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-normal capitalize max-w-[300px] overflow-hidden text-ellipsis line-clamp-2">
                                                                                    {question?.engagement_question}
                                                                                </div>
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                <div className="whitespace-nowrap capitalize">
                                                                                    {question?.formatted_engagement_date}
                                                                                </div>
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 w-20 relative box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] border-x-0 dark:bg-darkmode-600">
                                                                                <div className="flex gap-3 justify-center">
                                                                                    <Tippy
                                                                                        content="See Details"
                                                                                        options={{
                                                                                            theme: "light",
                                                                                        }}
                                                                                    >
                                                                                        <Lucide
                                                                                            onClick={() =>
                                                                                                navigate(
                                                                                                    `/engagement-question/${question?.id}`
                                                                                                )
                                                                                            }
                                                                                            icon="Eye"
                                                                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                                                        />
                                                                                    </Tippy>
                                                                                    {user?.user_type === "Admin" && (
                                                                                        <Tippy
                                                                                            content="Edit"
                                                                                            options={{
                                                                                                theme: "light",
                                                                                            }}
                                                                                        >
                                                                                            <Lucide
                                                                                                onClick={() =>
                                                                                                    onEditClickHandler(question)
                                                                                                }
                                                                                                icon="PenLine"
                                                                                                className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                                                            />
                                                                                        </Tippy>
                                                                                    )}
                                                                                </div>
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    ))}
                                                            </>
                                                        )
                                                    )
                                                ) : (
                                                    <Table.Tr>
                                                        <Table.Td
                                                            colSpan={5}
                                                            className="py-10 text-center text-slate-500"
                                                        >
                                                            No engagement questions.
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </>
                                        </Table.Tbody>
                                        {groupedQuestions?.length === 0 && (
                                            <div className="w-full">
                                                <h1 className="mt-3">No Records Found..</h1>
                                            </div>
                                        )}
                                    </Table>
                                </div>
                            </TableWrapper>
                        </div>
                        <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                            {questions?.length > 0 && (
                                <CPagination
                                    page={page}
                                    totalPages={totalPages}
                                    handleNextPage={handleNextPage}
                                    handlePageChange={handlePageChange}
                                    handlePreviousPage={handlePreviousPage}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EngagementQuestionsDialog;

