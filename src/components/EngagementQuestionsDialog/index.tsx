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
import AddNoteModal from "@/pages/Notes/AddNotesModal";


const notesByInstitution = {
    "The Vanguard Group": [
        {
            date: "March 20, 2024",
            attendees: "John Doe, Jane Smith",
            notes: "In assessing and evaluating worker health and safety shareholder proposals, we determined that the risks identified in the proposal included human capital management risks, operational risks, and reputational risks, and that these risks were material to each of the portfolio companies that had received a proposal. In some instances, we observed that worker health and safety risks had manifested at the company in question. For example, we considered patterns of repeated workplace safety violations reported by relevant U.S. enforcement agencies such as the Occupational Safety and Health Administration (OSHA), as well as associated media coverage, as credible evidence that risks had materialized. We observed that, in most cases, the worker health and safety shareholder proposal requested that an independent third party conduct an audit of the company’s safety policies and practices. Generally, we view shareholder proposals that require third-party involvement with some concern, as we believe it is important to provide a company’s board with sufficient latitude to determine the specifics of implementation. Unless we find evidence that the board has not demonstrated the ability to independently oversee risk, the funds look to the board to maintain discretion on the appropriate way to act on any proposal’s request to mitigate or report on a risk. We reviewed disclosure regarding the board’s oversight of worker health and safety risks, including committee ownership of the risk. We also reviewed each company’s disclosures related to their existing actions to improve health and safety practices, including the enhancement of safety policies, employee training, practices for soliciting employee feedback, and board and management oversight. We observed that some of the companies provided quantitative disclosures regarding accident and injury rates. While this reporting goes beyond current industry standard, we view such disclosures as potentially helpful for companies seeking to provide additional context to investors. We also engaged with company leaders and directors to further understand the board’s approach to overseeing and mitigating worker health and safety risk. Through these engagements, we found that the company was in the process of enhancing the board’s oversight, including increasing the scope or frequency of relevant reporting and deepening engagement with management to implement near-term mitigation strategies. Vanguard’s Investment Stewardship team plans to continue to engage with these companies’ leaders and directors regarding the ongoing risk oversight and mitigation of worker health and safety risk. We will also continue to monitor the regulatory environment, as the Securities and Exchange Commission has indicated that new requirements for human capital disclosure may be released in the coming months. Vanguard’s Investment Stewardship team plans to continue to engage with the company's leaders and directors regarding the ongoing risk oversight and mitigation of worker health and safety risk. We will also continue to monitor the regulatory environment, as the Securities and Exchange Commission has indicated that new requirements for human capital disclosure may be released in the coming months.",
            author: "Waheed",
        },
    ],
    "BlackRock, Inc.": [
        {
            date: "March 22, 2024",
            attendees: "Alice Johnson, Bob Lee",
            notes: "Amazon.com, Inc.’s May 2022 AGM, BIS supported a proposal requesting a report on packaging materials. The company responded by enhancing their packaging disclosure to include single-use plastic data in December 2022. Amazon received a substantially similar proposal the following year. Given that the company had already enhanced their disclosure on packaging, BIS did not support the second proposal on plastic use at the company’s May 2023 AGM.",
            author: "Waheed",
        },
    ],
    "Charles Schwab Asset Management": [
        {
            date: "March 23, 2024",
            attendees: "Michael Brown, Susan White",
            notes: "At AMZN, we specifically asked for more information on the company’s plastic waste impacts, reduction efforts and absolute plastic packaging use. We also probed how AMZN’s actions and disclosures compared with its industry peers and how the company has responded to sustained high support for this request since 2021. We recognized that AMZN disclosed some information about its recycling initiatives as well as its plastic usage in company-owned and operated fulfillment centers We were concerned, however,that the company was lagging peers with respect to disclosing plans to reduce its absolute plastic packaging use. In our view, AMZN’s current reporting did not provide sufficient information about its overall plastic footprint. The company did not disclose a baseline amount of plastic used throughout its supply chain, which may account for a majority of the company’s sales. Although AMZN disputes certain claims regarding its plastic use, it does not provide competing data that allows shareholders to assess its progress.",
            author: "Waheed",
        },
    ],
    "Fidelity Investments": [
        {
            date: "March 24, 2024",
            attendees: "David Clark, Emma Green",
            notes: "We concluded that the proposed report would help shareholders to assess the company’s management of health and safety risk and therefore decided to vote in favor.",
            author: "Waheed",
        },
    ],
};

interface EngagementQuestionsDialogProps {
    institution_name: string,
}

const EngagementQuestionsDialog: React.FC<EngagementQuestionsDialogProps> = ({ institution_name }) => {
    const dispatch: AppDispatch = useAppDispatch();
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
    const [addNoteModalVisible, setAddNoteModalVisible] =
        useState<boolean>(false);

    const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});

    const toggleExpand = (index: number) => {
        setExpandedRows((prev) => ({
            ...prev,
            [index]: !prev[index], // Toggle state for this row index
        }));
    };


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


    return (
        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
            <div className="col-span-12">
                <div className="mt-3.5">
                    <div className="flex flex-col">
                        {/* Institution Info & Controls */}
                        <div className="flex items-center justify-between my-2 text-[13px] mx-5 mb-1">
                            <div className="flex items-center">
                                <div className="w-10 h-10 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                    <img
                                        alt="ZMH Analytics"
                                        src={validImages[institution_name] || userLinkedinImage}
                                    />
                                </div>
                                <span className="font-medium">{institution_name}</span>
                            </div>

                            <div className="flex items-center gap-x-4">

                                <button
                                    className="flex items-center gap-x-2 px-4 py-2 text-white bg-primary border-primary dark:border-primary rounded"
                                    onClick={() => setAddNoteModalVisible(true)}
                                >
                                    <Lucide icon="Plus" className="w-4 h-4 " />
                                    Add Notes
                                </button>

                            </div>
                        </div>

                        <div className="px-5 mt-5">
                            {/* Notes History Card */}
                            <div className="bg-white dark:bg-darkmode-800 p-6 rounded-lg shadow-lg">
                                <h2 className="text-lg font-semibold mb-2">Notes History</h2>
                                <TableWrapper isLoading={false}>
                                    <div className="overflow-auto max-h-[500px]">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Date</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Attendees</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Notes</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Author</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2] text-center"></Table.Td>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {notesByInstitution[institution_name] ? (
                                                    notesByInstitution[institution_name].map((note, index) => (
                                                        <Table.Tr key={index} className="relative">
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 align-top">
                                                                {note.date}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 align-top">
                                                                {note.attendees}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[700px]">
                                                                <div className="flex justify-between items-start">
                                                                    <div
                                                                        className={`transition-all duration-300 ease-in-out flex-1 ${expandedRows[index] ? "max-h-none" : "line-clamp-2 overflow-hidden"
                                                                            } whitespace-pre-wrap`}
                                                                    >
                                                                        {note.notes}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => toggleExpand(index)}
                                                                        className="ml-1 text-blue-500 flex-shrink-0"
                                                                    >
                                                                        <Lucide
                                                                            icon={expandedRows[index] ? "ChevronUp" : "ChevronDown"}
                                                                            className="w-4 h-4"
                                                                        />
                                                                    </button>
                                                                </div>
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 align-top">
                                                                {note.author}
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 text-center align-top">
                                                                <button className="text-primary hover:text-blue-500">
                                                                    <Lucide icon="Eye" className="w-4 h-4" />
                                                                </button>
                                                                <button className="text-primary hover:text-blue-500 ml-2">
                                                                    <Lucide icon="Pen" className="w-4 h-4" />
                                                                </button>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ))
                                                ) : (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={5} className="py-10 text-center text-slate-500">
                                                            No notes available for {institution_name}.
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Table.Tbody>

                                        </Table>
                                    </div>
                                </TableWrapper>
                            </div>

                            {/* Engagement Questions Card */}
                            <div className="bg-white dark:bg-darkmode-800 p-6 rounded-lg shadow-lg mt-8">
                                <h2 className="text-lg font-semibold mb-2">Engagement Questions</h2>
                                <TableWrapper isLoading={loading}>
                                    <div className="overflow-auto max-h-[400px]">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Engagement Date</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Category</Table.Td>
                                                    <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Engagement Questions</Table.Td>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {groupedQuestions ? (
                                                    Object.entries(groupedQuestions).map(([institutionName, institutionQuestions]) => (
                                                        <>
                                                            {openGroups[institutionName] &&
                                                                Array.isArray(institutionQuestions) &&
                                                                institutionQuestions.map((question) => (
                                                                    <Table.Tr key={question?.id} className="[&_td]:last:border-b-0">
                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                            {question?.formatted_engagement_date}
                                                                        </Table.Td>
                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                            {question?.engagement_with_category}
                                                                        </Table.Td>
                                                                        <Table.Td className="py-2 border-dashed max-w-[800px] dark:bg-darkmode-600">
                                                                            {question?.engagement_question}
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                ))}
                                                        </>
                                                    ))
                                                ) : (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={3} className="py-10 text-center text-slate-500">
                                                            No engagement questions.
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Table.Tbody>
                                        </Table>
                                    </div>
                                </TableWrapper>
                            </div>

                            {/* Pagination */}
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

                        {addNoteModalVisible && (
                            <AddNoteModal
                                mode="add"
                                addNoteModalVisible={addNoteModalVisible}
                                setAddNoteModalVisible={setAddNoteModalVisible}
                                title="Create New Note"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>

    );
}

export default EngagementQuestionsDialog;

