import Button from "@/components/Base/Button";
import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { getSingleShareHolderData, setPage, setTabs } from "@/stores/shareholderProposalSlice";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const DetailShareHolder = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();

  const { getSingleShareHolder, loading, page } = useAppSelector((state) => state.sharedHolderNoAction);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const url = searchParams.get('url');
  const headingTitle = url?.includes('withdrawn') ? 'Withdrawn Proposal Details'
    : url?.includes('def14a') ? 'Shareholder Proposal Details' : url?.includes('no_action') ? 'No Action Letter Details' : ''

  const selectedTab = url?.includes('withdrawn') ? 'withdrawn'
    : url?.includes('def14a') ? 'proposal' : url?.includes('no_action') ? 'no-action' : '';

  useEffect(() => {
    dispatch(getSingleShareHolderData({ url: url!, id: Number(params.id!) }));
  }, [params.id]);

  const backToPreviousPage = () => {
    dispatch(setPage(page));
    dispatch(setTabs(selectedTab));
    navigate(`/share-holder-proposal`);
  }

  return (
    <>
      <Button
        onClick={backToPreviousPage}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-4"
      >
        <ChevronLeft
          className="roup-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>
      <div className=" mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
          <h1 className="text-xl font-semibold">{headingTitle}</h1>
        </div>

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {getSingleShareHolder && Object.entries(getSingleShareHolder)?.map(([key, item]: [string, any]) => {

                // Skip the item.
                if (item === null || item === undefined ||
                  key === 'id' || key === 'def14a_id' || key === 'nl_exist' || key === 'no_action_link' ||
                  key === 'proponent_name' ||
                  key === 'company' || key === 'institution') return null;

                return (
                  <div className="flex flex-col">
                    <div key={key} className="mb-4">
                      <h2 className="text-md font-medium text-gray-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/^\w/, (c) => { return c.toUpperCase() })}
                      </h2>
                      <p className="text-gray-500 break-words overflow-hidden">
                        {item && typeof item === 'string' && item.startsWith('http') ? (
                          <a
                            href={item}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 break-words inline-block max-w-full overflow-hidden"
                          >
                            {item}
                            
                          </a>
                        ) : Array.isArray(item) && typeof item[0] === 'object' ? (
                          item?.map((obj: any, index: number) => (
                            <div key={index}>
                              {Object.keys(obj).map((key) => (
                                <div key={key}>
                                  <span className="font-semibold">{key.replace(/_/g, ' ').replace(/^\w/, (c) => { return c.toUpperCase() })}: </span>
                                  <span>{obj[key]}</span>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          item
                        )}
                      </p>

                    </div>
                  </div>
                );
              })}


            </div>

          </div>
        )}
      </div>
    </>
  );
};

export default DetailShareHolder;
