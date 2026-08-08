import Button from "@/components/Base/Button";
import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  getSingleShareHolderData,
  setPage,
  setTabs,
} from "@/stores/shareholderProposalSlice";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { convertToTitleCase } from "@/utils/helper";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { Dialog } from "@/components/Base/Headless";
import {
  AddNoActionType,
  AddShareholderType,
  AddWithdrawnType,
} from "@/types/shareHolder";
import AddNewShareholder from "./AddNewShareholder";
import AddNewNoAction from "./AddNewNoAction";
import AddNewWithdrawn from "./AddNewWithdrawn";

const DetailShareHolder = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();

  const { getSingleShareHolder, loading, page } = useAppSelector(
    (state) => state.sharedHolderNoAction
  );
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const url = searchParams.get("url");
  const source = (location.state as { source?: string } | undefined)?.source || searchParams.get("source") || "";
  const headingTitle = url?.includes("withdrawn")
    ? "Withdrawn Proposal Details"
    : url?.includes("def14a")
    ? "Shareholder Proposal Details"
    : url?.includes("no_action")
    ? "No Action Letter Details"
    : "";

  const selectedTab = url?.includes("withdrawn")
    ? "withdrawn"
    : url?.includes("def14a")
    ? "proposal"
    : url?.includes("no_action")
    ? "no-action"
    : "";

  const selectedTabUrl = selectedTab
    ? `/shareholder-proposal?url=shareholder_proposal/${
        selectedTab === "proposal"
          ? "def14a"
          : selectedTab === "no-action"
          ? "no_action"
          : "withdrawn"
      }${source ? `&source=${source}` : ""}`
    : `/shareholder-proposal${source ? `?source=${source}` : ""}`;

  useEffect(() => {
    dispatch(getSingleShareHolderData({ url: url!, id: Number(params.id!) }));
  }, [params.id]);

  const backToPreviousPage = () => {
    dispatch(setPage(page));
    dispatch(setTabs(selectedTab));
    navigate(selectedTabUrl, {
      state: { isBackToShareholderPage: true },
    });
  };

  const [selectedShareholderProposal, setSelectedShareholderProposal] =
    useState<AddShareholderType | null>(null);
  const [selectedShareholderWithdrawn, setSelectedShareholderWithdrawn] =
    useState<AddWithdrawnType | null>(null);
  const [selectedShareholderNoAction, setSelectedShareholderNoAction] =
    useState<AddNoActionType | null>(null);

  const [addNewShareholderModalVisible, setAddNewShareholderModalVisible] =
    useState<boolean>(false);
  const [addNewWithdrawnModalVisible, setAddNewWithdrawnModalVisible] =
    useState<boolean>(false);
  const [addNewNoActionModalVisible, setAddNewNoActionModalVisible] =
    useState<boolean>(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProposal = async () => {
    try {
      setIsDeleting(true);
      if (selectedTab === "proposal") {
        await shareHolderProposalService.deleteShareHolderProposal(params.id!);
        toast.success("Shareholder Proposal deleted successfully");
      }
      setIsDeleteModalOpen(false);
      dispatch(setPage(page));
      dispatch(setTabs(selectedTab));
      navigate(selectedTabUrl, { state: { isBackToShareholderPage: true } });
    } catch (error) {
      console.error("Error deleting proposal:", error);
      toast.error("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!addNewShareholderModalVisible && selectedShareholderProposal) {
      dispatch(getSingleShareHolderData({ url: url!, id: Number(params.id!) }));
    }
  }, [addNewShareholderModalVisible]);

  const onEditProposalClickHandler = (detail: any, detailType: string) => {
    if (detailType === "Shareholder Proposal Details") {
      setSelectedShareholderProposal(detail);
      setAddNewShareholderModalVisible(true);
    } else if (detailType === "Withdrawn Proposal Details") {
      setSelectedShareholderWithdrawn(detail);
      setAddNewWithdrawnModalVisible(true);
    } else if (detailType === "No Action Letter Details") {
      setSelectedShareholderNoAction(detail);
      setAddNewNoActionModalVisible(true);
    }
  };

  const onApproveProposalClickHandler = async () => {
    try {
      await shareHolderProposalService.updateNewShareHolder(
        params.id!,
        { approved: true }
      );
      toast.success("Shareholder Proposal Approved Successfully");
      // Refresh the data
      dispatch(getSingleShareHolderData({ url: url!, id: Number(params.id!) }));
    } catch (error) {
      console.error("Error approving proposal:", error);
      toast.error("Failed to approve proposal. Please try again.");
    }
  };

  const itemSeparator = ({ item }) => {
    const separateItems = (item: any) => {
      return item.split(",").map((url) => url.trim());
    };

    const items = separateItems(item);

    return (
      <div>
        {items.map((url, index) => (
          <div key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 break-words inline-block max-w-full overflow-hidden"
            >
              {url}
            </a>
          </div>
        ))}
      </div>
    );
  };

  const formatMultilineText = (text?: string) => {
    if (!text) return "-";

    return text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");
  };

  console.log(getSingleShareHolder ,"getSingleShareHolder")
  return (
    <>
      <Button
        onClick={backToPreviousPage}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-4"
      >
        <ChevronLeft
          className="group-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>
      <div className=" mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
          <h1 className="text-xl font-semibold">{headingTitle}</h1>

          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
            <div className="flex items-center gap-2">
              {headingTitle === "Shareholder Proposal Details" && (
                <Tippy content={getSingleShareHolder?.approved ? "Already Approved" : "Approve"} options={{ theme: "light" }}>
                  <Button
                    onClick={onApproveProposalClickHandler}
                    variant="primary"
                    disabled={getSingleShareHolder?.approved}
                    className={`text-white px-4 py-1.5 text-sm ${
                      getSingleShareHolder?.approved 
                        ? "bg-transparent text-red-900 cursor-not-allowed" 
                        : "cursor-pointer"
                    }`}
                  >
                    {getSingleShareHolder?.approved ? "Approved" : "Approve"}
                  </Button>
                </Tippy>
              )}
              <Tippy content="Edit" options={{ theme: "light" }}>
                <div className="cursor-pointer box p-2">
                  <Lucide
                    onClick={() =>
                      onEditProposalClickHandler(
                        getSingleShareHolder,
                        headingTitle
                      )
                    }
                    icon="PenLine"
                    className="w-4 h-4 mr-1.5 stroke-[1.3] text-red-700 "
                  />
                </div>
              </Tippy>
              {selectedTab === "proposal" && (
                <Tippy content="Delete" options={{ theme: "light" }}>
                  <div className="cursor-pointer box p-2">
                    <Lucide
                      onClick={() => setIsDeleteModalOpen(true)}
                      icon="Trash2"
                      className="w-4 h-4 mr-1.5 stroke-[1.3] text-danger "
                    />
                  </div>
                </Tippy>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <>
            {selectedTab !== "withdrawn" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSingleShareHolder?.year && (
                    <div>
                      <h3 className="font-semibold min-w-[150px] mb-2">Proxy Year</h3>
                      <p> {getSingleShareHolder?.proxy_season || "-"}</p>
                    </div>
                  )}
                  {getSingleShareHolder?.proponent_name && (
                    <div>
                      <h3 className="font-semibold min-w-[150px] mb-2">
                        Proponent
                      </h3>
                      <p>{getSingleShareHolder.proponent}</p>
                    </div>
                  )}
                  {getSingleShareHolder?.company_name && (
                    <div>
                      <h3 className="font-semibold min-w-[150px] mb-2">
                        Company Name
                      </h3>
                      <p>{getSingleShareHolder.company_name}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSingleShareHolder?.proposal_name &&
                    selectedTab === "proposal" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Proposal Number and Name
                        </h3>
                        <p>
                          {getSingleShareHolder.proposal_num}.{" "}
                          {getSingleShareHolder.proposal_name}
                        </p>
                      </div>
                    )}

                  {/* {getSingleShareHolder?.category && selectedTab === 'no-action' && (
                <div>
                  <h3 className="font-semibold min-w-[150px] mb-2">Category</h3>
                  <p>({getSingleShareHolder.category}) {getSingleShareHolder.category}</p>
                </div>
              )} */}

                  {getSingleShareHolder?.category && (
                    <div>
                      <h3 className="font-semibold min-w-[150px] mb-2">
                        Category
                      </h3>
                      <p>{getSingleShareHolder.category}</p>
                    </div>
                  )}
                  {getSingleShareHolder?.sub_category && (
                    <div>
                      <h3 className="font-semibold min-w-[150px] mb-2">
                        Sub-Category
                      </h3>
                      <p>{getSingleShareHolder.sub_category}</p>
                    </div>
                  )}

                  {getSingleShareHolder?.bases_asserted_for_exclusion &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Bases asserted for exclusion
                        </h3>
                        <p>
                          ({getSingleShareHolder.bases_asserted_for_exclusion})
                        </p>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSingleShareHolder?.link_to_filing &&
                    selectedTab === "proposal" && (
                      <div className="col-span-1 sm:col-span-2 lg:col-span-2 " >
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Link to Proxy
                        </h3>
                        <a
                          href={getSingleShareHolder.link_to_filing}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {getSingleShareHolder.link_to_filing}
                        </a>
                      </div>
                    )}

                  {getSingleShareHolder?.staff_response &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Staff Response
                        </h3>
                        <p>{getSingleShareHolder.staff_response}</p>
                      </div>
                    )}

                  {getSingleShareHolder?.staff_response_date_display &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Staff Response Date
                        </h3>
                        <p>
                          {getSingleShareHolder.staff_response_date_display}
                        </p>
                      </div>
                    )}

                  {getSingleShareHolder?.initial_date_for_submission_display &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Initial Date for Submission
                        </h3>
                        <p>
                          {
                            getSingleShareHolder.initial_date_for_submission_display
                          }
                        </p>
                      </div>
                    )}

                  {/* {selectedTab === "proposal" && (
                    <div> */}
                      {/* <h3 className="font-semibold min-w-[150px] mb-2">Link to Proxy</h3>
                        <p>{getSingleShareHolder.no_action_link}</p> */}
                    {/* </div>
                  )} */}

                  {getSingleShareHolder?.outcome_percentage &&
                    selectedTab === "proposal" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Outcome Percentage
                        </h3>
                        <p>{getSingleShareHolder.outcome_percentage}</p>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {getSingleShareHolder?.proposal_text &&
                    selectedTab === "proposal" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Proposal Text 
                        </h3>
                        <p className="whitespace-pre-line break-words">
                          {formatMultilineText(getSingleShareHolder.proposal_text)}
                        </p>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSingleShareHolder?.link_to_staff_response &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Link to Staff Response
                        </h3>
                        <a
                          href={getSingleShareHolder.link_to_staff_response}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {getSingleShareHolder.link_to_staff_response}
                        </a>
                      </div>
                    )}

                  {selectedTab === "no-action" && <div></div>}

                  {getSingleShareHolder?.link_to_initial_submission &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Link to Initial Submission
                        </h3>
                        <a
                          href={getSingleShareHolder.link_to_initial_submission}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {getSingleShareHolder.link_to_initial_submission}
                        </a>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {getSingleShareHolder?.vote_details?.length > 0 &&
                    selectedTab === "proposal" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Vote Details
                        </h3>
                        <ul className="list-disc pl-5">
                          {getSingleShareHolder.vote_details.map(
                            (detail: any, index: number) => {
                              const [key, value]: [any, any] =
                                Object.entries(detail)[0]; // Extract key and value from the object
                              return (
                                <li key={index}>
                                  <span className="font-bold">{key}: </span>{" "}
                                  {value}
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {getSingleShareHolder?.proposal_text &&
                    selectedTab === "no-action" && (
                      <div>
                        <h3 className="font-semibold min-w-[150px] mb-2">
                          Proposal Text
                        </h3>
                        <p className="whitespace-pre-line break-words">
                          {formatMultilineText(getSingleShareHolder.proposal_text)}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {selectedTab === "withdrawn" && (
              <>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getSingleShareHolder &&
                      Object.entries(getSingleShareHolder)?.map(
                        ([key, item]: [string, any]) => {
                          // Skip the item.
                          if (
                            item === null ||
                            item === undefined ||
                            key === "id" ||
                            key === "def14a_id" ||
                            key === "nl_exist" ||
                            key === "no_action_link" ||
                            key === "proponent_name" ||
                            key === "company" ||
                            key === "institution"
                          )
                            return null;

                          return (
                            <div className="flex flex-col">
                              <div key={key} className="mb-4">
                                <h2 className="text-md font-medium text-gray-700 mb-1">
                                  {key
                                    .replace(/_/g, " ")
                                    .replace(/^\w/, (c) => {
                                      return c.toUpperCase();
                                    })}
                                </h2>
                                <p className="text-gray-500 break-words overflow-hidden">
                                  {item &&
                                  typeof item === "string" &&
                                  item.startsWith("http")
                                    ? itemSeparator({ item })
                                    : Array.isArray(item) &&
                                      typeof item[0] === "object"
                                    ? item?.map((obj: any, index: number) => (
                                        <div key={index}>
                                          {Object.keys(obj).map((key) => (
                                            <div key={key}>
                                              <span className="font-semibold">
                                                {key
                                                  .replace(/_/g, " ")
                                                  .replace(/^\w/, (c) => {
                                                    return c.toUpperCase();
                                                  })}
                                                :{" "}
                                              </span>
                                              <span>{obj[key]}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ))
                                    : item}
                                </p>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {addNewShareholderModalVisible && (
        <AddNewShareholder
          addNewShareholderModalVisible={addNewShareholderModalVisible}
          setAddNewShareholderModalVisible={setAddNewShareholderModalVisible}
          selectedShareholderProposal={selectedShareholderProposal}
          type={"edit"}
        />
      )}

      {addNewNoActionModalVisible && (
        <AddNewNoAction
          addNewNoActionModalVisible={addNewNoActionModalVisible}
          setAddNewNoActionModalVisible={setAddNewNoActionModalVisible}
          selectedShareholderNoAction={selectedShareholderNoAction}
        />
      )}

      {addNewWithdrawnModalVisible && (
        <AddNewWithdrawn
          addNewWithdrawnModalVisible={addNewWithdrawnModalVisible}
          setAddNewWithdrawnModalVisible={setAddNewWithdrawnModalVisible}
          selectedShareholderWithdrawn={selectedShareholderWithdrawn}
        />
      )}

      {isDeleteModalOpen && (
        <Dialog
          size="md"
          open={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
          }}
        >
          <Dialog.Panel className="p-0 text-center">
            <div className="p-5 text-center">
              <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
              <div className="mt-5 text-3xl">Are you sure?</div>
              <div className="mt-2 text-slate-500">
                Do you really want to delete this shareholder proposal? <br />
                This action cannot be undone.
              </div>
            </div>
            <div className="px-5 pb-8 text-center">
              <Button
                variant="outline-secondary"
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                }}
                className="w-24 mr-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                className="w-24"
                onClick={handleDeleteProposal}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </>
  );
};

export default DetailShareHolder;
