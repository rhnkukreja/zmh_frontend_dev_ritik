import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Lucide from "@/components/Base/Lucide";

interface VotingQuestion {
  proposal?: string;
  voting_rationale?: string;
}

const VotingRationalePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [companyTicker, setCompanyTicker] = useState('N/A');
  const [meetingDate, setMeetingDate] = useState('N/A');
  const [groupVotingRationale, setGroupVotingRationale] = useState<Record<string, VotingQuestion[]>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Load data from sessionStorage
  useEffect(() => {
    const storageKey = searchParams.get('key');
    if (storageKey) {
      try {
        const storedData = sessionStorage.getItem(storageKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setCompanyTicker(parsedData.ticker || 'N/A');
          setMeetingDate(parsedData.meetingDate || 'N/A');
          setGroupVotingRationale(parsedData.data || {});
          
          // Initialize accordion state - expand all if expandAll flag is true
          const expandAll = parsedData.expandAll || false;
          const initialOpenGroups: { [key: string]: boolean } = {};
          Object.keys(parsedData.data || {}).forEach(investorName => {
            initialOpenGroups[investorName] = expandAll;
          });
          setOpenGroups(initialOpenGroups);
          setDataLoaded(true);
          
          // Clean up sessionStorage after a short delay to ensure rendering is complete
          setTimeout(() => {
            sessionStorage.removeItem(storageKey);
          }, 100);
        }
      } catch (error) {
        console.error('Error parsing voting rationale data:', error);
        setDataLoaded(true);
      }
    } else {
      setDataLoaded(true);
    }
  }, [searchParams]);

  const toggleGroup = (investorName: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [investorName]: !prevState[investorName],
    }));
  };

  const expandAllGroups = () => {
    const allInvestorNames = Object.keys(groupVotingRationale);
    const allExpanded = allInvestorNames.every(name => openGroups[name]);

    if (allExpanded) {
      // Collapse all
      setOpenGroups({});
    } else {
      // Expand all
      const newOpenGroups: { [key: string]: boolean } = {};
      allInvestorNames.forEach(name => {
        newOpenGroups[name] = true;
      });
      setOpenGroups(newOpenGroups);
    }
  };

  const areAllGroupsExpanded = () => {
    const allInvestorNames = Object.keys(groupVotingRationale);
    return allInvestorNames.length > 0 && allInvestorNames.every(name => openGroups[name]);
  };

  // Show loading state while data is being loaded
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading voting rationale data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Voting Rationale - {companyTicker}
              </h1>
              <p className="text-slate-600">
                <span className="font-medium">Meeting Date:</span> {meetingDate}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {Object.keys(groupVotingRationale).length > 0 && (
                <button
                  onClick={expandAllGroups}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 font-medium text-sm border border-slate-300"
                >
                  <span className="text-sm font-medium">
                    {areAllGroupsExpanded() ? "Collapse All" : "Expand All"}
                  </span>
                  <Lucide 
                    icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"} 
                    className="w-4 h-4" 
                  />
                </button>
              )}
              
              <button
                onClick={() => {
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.close();
                    } else {
                      window.history.back();
                    }
                  } catch (error) {
                    navigate('/');
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
              >
                <Lucide icon="ArrowLeft" className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div> 
        </div>

        {/* Voting Rationale Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {Object.keys(groupVotingRationale).length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-slate-400 mb-4">
                <Lucide icon="FileText" className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Voting Rationale Data
              </h3>
              <p className="text-slate-600">
                No voting rationale information is available for this company.
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              {Object.entries(groupVotingRationale).map(([investorName, questions], index) => (
                <React.Fragment key={investorName}>
                  {/* Accordion Header */}
                  <div
                    className={`${index % 2 === 0 ? 'bg-slate-100' : 'bg-slate-50'} cursor-pointer hover:bg-slate-200 transition-all duration-200 border-b-2 border-slate-300 p-4`}
                    onClick={() => toggleGroup(investorName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lucide
                          icon={openGroups[investorName] ? "ChevronUp" : "ChevronDown"}
                          className="w-5 h-5 text-primary transition-transform duration-200"
                        />
                        <span className="text-gray-800 font-medium text-lg">
                          {investorName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {openGroups[investorName] && (
                    <div className="p-6 bg-white border-b border-slate-200">
                      {Array.isArray(questions) && questions.length > 0 ? (
                        <div className="space-y-4">
                          {questions.map((question, questionIndex) => (
                            <div
                              key={questionIndex}
                              className={`p-4 rounded-lg border border-slate-200 ${
                                questionIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              }`}
                            >
                              <div className="mb-3">
                                <h3 className="font-medium text-gray-800 text-sm mb-2">
                                  <span className="font-semibold">Proposal:</span>
                                </h3>
                                <div className="text-gray-700 text-sm leading-relaxed pl-4">
                                  {question?.proposal || 'No proposal information available'}
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-medium text-gray-800 text-sm mb-2">
                                  <span className="font-semibold">Voting Rationale:</span>
                                </h3>
                                <div 
                                  className="text-gray-700 text-sm leading-relaxed pl-4"
                                  dangerouslySetInnerHTML={{
                                    __html: question?.voting_rationale || 'No rationale provided',
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-slate-500 text-sm text-center">
                            No proposals or voting rationale available for this investor.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingRationalePage;