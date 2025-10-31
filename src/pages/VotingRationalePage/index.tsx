import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Lucide from "@/components/Base/Lucide";

interface VotingQuestion {
  proposal?: string;
  voting_rationale?: string;
}

const VotingRationalePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get data from sessionStorage using the key from URL
  const storageKey = searchParams.get('key');
  let companyTicker = 'N/A';
  let meetingDate = 'N/A';
  let groupVotingRationale: Record<string, VotingQuestion[]> = {};
  
  if (storageKey) {
    try {
      const storedData = sessionStorage.getItem(storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        companyTicker = parsedData.ticker || 'N/A';
        meetingDate = parsedData.meetingDate || 'N/A';
        groupVotingRationale = parsedData.data || {};
        
        // Clean up - remove from sessionStorage after reading
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Error parsing voting rationale data:', error);
    }
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
            
            <button
              onClick={() => {
                try {
                  // Check if this was opened in a new tab/window
                  if (window.opener && !window.opener.closed) {
                    // Close the tab if it was opened from another window
                    window.close();
                  } else {
                    // Try browser back navigation
                    window.history.back();
                  }
                } catch (error) {
                  // Fallback: navigate to home
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
            <div className="divide-y divide-slate-200">
              {Object.entries(groupVotingRationale).map(([investorName, questions], investorIndex) => (
                <div key={investorName} className="p-6">
                  {/* Investor Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Lucide icon="Building2" className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {investorName}
                    </h2>
                  </div>

                  {/* Questions/Proposals */}
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
                            <h3 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                              <Lucide icon="FileCheck" className="w-4 h-4 text-slate-500" />
                              Proposal
                            </h3>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {question?.proposal || 'No proposal information available'}
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                              <Lucide icon="MessageSquare" className="w-4 h-4 text-slate-500" />
                              Voting Rationale
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              {question?.voting_rationale || 'No rationale provided'}
                            </p>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingRationalePage;