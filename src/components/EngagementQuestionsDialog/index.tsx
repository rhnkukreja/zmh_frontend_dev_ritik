import Lucide from "@/components/Base/Lucide";
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
import { EngagementQuestions } from "@/types/engagementQuestions";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { deleteDomainNote, fetchDomainNotes, shareDomainNote } from "@/stores/domainNotesSlice";
import AddDomainNoteModal from "../DomainNotes/AddDomainNotesModal";
import LoadingIcon from "../Base/LoadingIcon";
import { toast } from "react-toastify";
import AddDomainNoteCommentsModal from "../DomainNotesComment/AddDomainNotesCommentModal";
import React from "react";

interface EngagementQuestionsDialogProps {
    data: CompanyDashboard,
}

const EngagementQuestionsDialog: React.FC<EngagementQuestionsDialogProps> = ({ data }) => {
    const dispatch: AppDispatch = useAppDispatch();
    const {
        questions,
        loading,
        page,
        count,
        totalPages,
        filters,
    } = useAppSelector((state) => state.engagementQuestions);

    const {
        results
    } = useAppSelector((state) => state.domainNotes);

    console.log("Results", results)


    const { user } = useAppSelector((state) => state.authentiction);

    const [selectedEngagementQuestion, setSelectedEngagementQuestion] =
        useState<EngagementQuestions | null>(null);
    const [groupedQuestions, setGroupedQuestions] = useState<any>([]);
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
    const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
    const [filtersLength, setFiltersLength] = useState<number>(0);
    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
    const [initialStateNote, setInitialStateNote] = useState<any>([]);
    const [addNoteModalVisible, setAddNoteModalVisible] =
        useState<boolean>(false);
    const [addCommentModalVisible, setAddCommentModalVisible] =
        useState<boolean>(false);
    const [isLoading, setIsLoading] =
        useState<boolean>(false);
    const [editNote, setEditNote] =
        useState<boolean>(false);
    const [editComment, setEditComment] =
        useState<boolean>(false);


    const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});
    const [expandedComment, setExpandedComment] = useState(null);


    const toggleExpand = (index: number) => {
        setExpandedRows((prev) => ({
            ...prev,
            [index]: !prev[index], // Toggle state for this row index
        }));
    };
    const collapseComment = (index: number) => {
        if (expandedComment === index) {
            setExpandedComment(null); 
        }else {
            setExpandedComment(index); 
        }
    };
    const handleNotesEdit = (note) => {
        setInitialStateNote(note)
        setEditNote(true)
        setAddNoteModalVisible(true)
    };
    const handleCommentNote = (note) => {
        setInitialStateNote(note)
        // setEditComment(true)
        setAddCommentModalVisible(true)
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


    const fetchEngagementQuestionsData = async () => {
        const institutionArray = data.institution_name ? [data.institution_name] : [];
        const companyArray = data.company_name ? [data.company_name] : [];

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
    }

    const fetchData = async () => {
        setIsLoading(true);
        const dynamicURL = createDynamicURL(
            `${baseURL}/user/domain_notes/`,
            {
                institution_id: JSON.stringify(data.institution_id),
                company_id: JSON.stringify(data.company_id),
            },
            undefined,
            page
        );

        await dispatch(fetchDomainNotes(dynamicURL));

        const { ...restFilters } = filters;
        setFiltersLength(countValidFilters(restFilters));
        setSelectedChipFilters(generateFilterChips(restFilters));

        setIsLoading(false);
    };
    useEffect(() => {
        fetchData();
        fetchEngagementQuestionsData();
    }, [page, filters]);


    const handleShareNote = async (id: number) => {
        try {
            if (id) {
                await dispatch(shareDomainNote({ id }));
                fetchEngagementQuestionsData();
            }
            toast.success("Note shared sucessfully");
        } catch (error) {
            toast.error("An error occurred while sharing the note");
        } finally {
            setAddNoteModalVisible(false);
        }
    };

    const handleDeleteNote = async (id: number) => {
        try {
            if (id) {
                await dispatch(deleteDomainNote({ id }));
                fetchData();
                toast.success("Note deleted sucessfully");
            }
        } catch (error) {
            toast.error("An error occurred while deleting the note");
        } finally {
            setAddNoteModalVisible(false);
        }
    };


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
                                        src={validImages[data.institution_name] || userLinkedinImage}
                                    />
                                </div>
                                <span className="font-medium">{data.institution_name}</span>
                            </div>

                            <div className="flex items-center gap-x-4">

                                <button
                                    className="flex items-center gap-x-2 px-4 py-2 text-white bg-primary border-primary dark:border-primary rounded"
                                    onClick={() => {
                                        setEditNote(false)
                                        setAddNoteModalVisible(true)
                                    }}
                                >
                                    <Lucide icon="Plus" className="w-4 h-4 " />
                                    Add Notes
                                </button>

                            </div>
                        </div>
                        {isLoading ? (
                            <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                <LoadingIcon
                                    color="#800000"
                                    icon="three-dots"
                                    className="w-16 h-16"
                                />
                            </div>
                        ) : (
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
                                                        <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Comments</Table.Td>
                                                        <Table.Td className="py-2 font-semibold bg-header text-[#000000B2] text-center"></Table.Td>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {results && results.length > 0 ? (
                                                        results.map((note, index) => (
                                                            <React.Fragment key={index}>
                                                                {/* Main Note Row */}
                                                                <Table.Tr className="relative">
                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 align-top">
                                                                        {note.formatted_date}
                                                                    </Table.Td>
                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 align-top">
                                                                        {note.attendees}
                                                                    </Table.Td>
                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[500px]">
                                                                        <div className="flex justify-between items-start">

                                                                            <div
                                                                                className={`transition-all duration-300 ease-in-out flex-1 ${expandedRows[index] ? "max-h-none" : "line-clamp-2 overflow-hidden"
                                                                                    } whitespace-pre-wrap`}
                                                                                dangerouslySetInnerHTML={{ __html: note.notes }}
                                                                            />
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
                                                                        {note.update_delete_check ? (
                                                                            <>
                                                                                <button
                                                                                    className="text-primary hover:text-blue-500 ml-2"
                                                                                    onClick={() => handleNotesEdit(note)}
                                                                                    title="Edit Note"
                                                                                >
                                                                                    <Lucide icon="Pen" className="w-4 h-4 mt-2" />
                                                                                </button>
                                                                                <button
                                                                                    className="text-primary hover:text-blue-500 ml-2"
                                                                                    onClick={() => handleDeleteNote(note.id)}
                                                                                    title="Delete Note"
                                                                                >
                                                                                    <Lucide icon="Trash" className="w-4 h-4 mt-2" />
                                                                                </button>
                                                                                <button
                                                                                    className="text-primary hover:text-blue-500 ml-2"
                                                                                    onClick={() => handleCommentNote?.(note)}
                                                                                    title="Comment"
                                                                                >
                                                                                    <Lucide icon="MessageCircle" className="w-4 h-4 mt-2" />
                                                                                </button>
                                                                                <button
                                                                                    className="text-gray-400 ml-2 cursor-not-allowed"
                                                                                    onClick={(e) => e.preventDefault()} // prevent click
                                                                                    title="Share Note"
                                                                                    disabled
                                                                                >
                                                                                    <Lucide icon="Share2" className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    className="text-primary hover:text-blue-500 ml-2"
                                                                                    onClick={() => handleCommentNote?.(note)}
                                                                                    title="Comment"
                                                                                >
                                                                                    <Lucide icon="MessageCircle" className="w-4 h-4 mt-2" />
                                                                                </button>
                                                                                <button
                                                                                    className="text-gray-400 ml-2 cursor-not-allowed"
                                                                                    onClick={(e) => e.preventDefault()} // prevent click
                                                                                    title="Share Note"
                                                                                    disabled
                                                                                >
                                                                                    <Lucide icon="Share2" className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </Table.Td>
                                                                </Table.Tr>

                                                                {/* Comments Row */}
                                                                <Table.Tr className="bg-muted dark:bg-darkmode-700">
                                                                    <Table.Td colSpan={5} className="py-3 px-5 text-sm">
                                                                        {note.comments && note.comments.length > 0 ? (
                                                                            <div className="space-y-2">
                                                                                {note.comments.map((comment, idx) => (
                                                                                    <div
                                                                                        key={idx}
                                                                                        className="border-l-4 border-primary/80 pl-4 py-1 bg-white dark:bg-darkmode-600 rounded-md shadow-sm"
                                                                                    >
                                                                                        <div className="flex justify-between items-start gap-4">
                                                                                            <div
                                                                                                className={`text-gray-800 dark:text-gray-100 text-sm ${expandedComment === index+idx ? "" :"line-clamp-2"} overflow-hidden`}
                                                                                                dangerouslySetInnerHTML={{ __html: comment.comments }}
                                                                                            />
                                                                                              <button
                                                                                onClick={() => collapseComment(index+idx)}
                                                                                className="ml-1 text-blue-500 flex-shrink-0"
                                                                            >
                                                                                <Lucide
                                                                                    icon={expandedRows[index] ? "ChevronUp" : "ChevronDown"}
                                                                                    className="w-4 h-4"
                                                                                />
                                                                            </button>
                                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 italic whitespace-nowrap">
                                                                                                – {comment.name}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-sm text-slate-500 italic">– No comments available –</div>
                                                                        )}
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </React.Fragment>
                                                        ))
                                                    ) : (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={5} className="py-10 text-center text-slate-500">
                                                                No notes available for {data.institution_name}.
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
                                                    {(groupedQuestions) ? (
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
                                                                                <div dangerouslySetInnerHTML={{ __html: question?.engagement_question || "" }} />
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
                        )
                        }


                        {addNoteModalVisible && (
                            <AddDomainNoteModal
                                mode={editNote ? "edit" : "add"}
                                addNoteModalVisible={addNoteModalVisible}
                                setAddNoteModalVisible={setAddNoteModalVisible}
                                title="Create New Note"
                                data={data}
                                selectedNote={initialStateNote}
                                fetchData={fetchData}
                                noteModule={false}
                            />
                        )}

                        {addCommentModalVisible && (
                            <AddDomainNoteCommentsModal
                                mode={editComment ? "edit" : "add"}
                                addCommentModalVisible={addCommentModalVisible}
                                setAddNoteCommentsModalVisible={setAddCommentModalVisible}
                                title="Create New Note"
                                data={data}
                                selectedNote={initialStateNote}
                                fetchData={fetchData}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div >

    );
}

export default EngagementQuestionsDialog;

