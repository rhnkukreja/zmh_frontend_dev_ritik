import React from "react";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Button from "@/components/Base/Button";
import clsx from "clsx";

interface AiAnalyzerSectionProps {
  aiSearchTerm: string;
  setAiSearchTerm: (val: string) => void;
  handleAiAnalysis: (topic: string) => void;
  handleClearAnalysis: () => void;
  isAiTopicsLoading: boolean;
  aiTopics: string[];
  isAiLoading: boolean;
}

const AiAnalyzerSection: React.FC<AiAnalyzerSectionProps> = ({
  aiSearchTerm,
  setAiSearchTerm,
  handleAiAnalysis,
  handleClearAnalysis,
  isAiTopicsLoading,
  aiTopics,
  isAiLoading,
}) => {
  return (
    <>
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm mb-8">
        {/* Subtle Background Pattern */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Lucide icon="Zap" className="fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            AI Summary
          </h2>
        </div>

        <p className="text-md text-slate-500 mb-6 pl-11">
          Ask how an investor has engaged or voted on any ESG topic — across all
          case studies
        </p>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-6 pl-0 md:pl-11">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiSearchTerm}
              onChange={(e) => setAiSearchTerm(e.target.value)}
              placeholder="e.g. How does BlackRock approach climate disclosure?"
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700"
            />
          </div>
          <Button
            variant="primary"
            className="px-8 py-3 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
            onClick={() => handleAiAnalysis(aiSearchTerm)}
          >
            Analyze <Lucide icon="ArrowRight" />
          </Button>
          {aiSearchTerm && (
            <Button
              variant="secondary"
              className="px-8 py-3 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
              onClick={handleClearAnalysis}
            >
              Clear <Lucide icon="X" />
            </Button>
          )}
        </div>

        <div className="pl-0 md:pl-11 mt-4">
          <h4 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Topics in this dataset
            {isAiTopicsLoading && (
              <LoadingIcon
                color="#800000"
                icon="oval"
                className="w-3 h-3"
              />
            )}
          </h4>

          {/* Skeleton chips while loading */}
          {isAiTopicsLoading && (
            <div className="flex flex-wrap gap-2">
              {[
                90, 120, 75, 140, 100, 80, 110, 70, 150, 95, 100, 60, 180, 100,
              ].map((width, i) => (
                <div
                  key={i}
                  className="h-7 rounded-full bg-slate-200 animate-pulse"
                  style={{ width: `${width}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}

          {aiTopics.length === 0 && !isAiTopicsLoading && (
            <span className="text-md text-slate-500 italic">
              No topics found for current selections.
            </span>
          )}

          {!isAiTopicsLoading && (
            <div className="flex flex-wrap gap-2">
              {aiTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setAiSearchTerm(topic);
                    handleAiAnalysis(topic);
                  }}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
                    aiSearchTerm === topic
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Loading State */}
      {isAiLoading && (
        <div className="mt-4 p-6 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-10 h-10"
          />
          <div className="text-lg font-medium text-slate-600">
            Analyzing case studies for investor stance on{" "}
            <span className="text-primary">"{aiSearchTerm}"</span>...
          </div>
        </div>
      )}
    </>
  );
};

export default AiAnalyzerSection;
