import React from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";

interface AiResponseCardProps {
  aiResponse: any;
  scrollToRelated: () => void;
}

const AiResponseCard: React.FC<AiResponseCardProps> = ({
  aiResponse,
  scrollToRelated,
}) => {
  if (!aiResponse) return null;

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-50/50 border-b p-5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">{aiResponse?.title}</h3>
        <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
          AI Summary
        </span>
      </div>

      <div className="p-6 md:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl font-mono font-bold text-primary mb-1">
              {aiResponse?.total_cases || 0}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Total Cases
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl font-mono font-bold text-danger mb-1">
              {aiResponse?.voted_against || 0}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Voted Against
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl font-mono font-bold text-success mb-1">
              {aiResponse?.voted_for || 0}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Voted For
            </div>
          </div>
        </div>

        {/* Verdict Badge */}
        {aiResponse?.key_alert && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 border bg-amber-50 text-amber-700 border-amber-100">
            <span
              dangerouslySetInnerHTML={{
                __html: aiResponse.key_alert.replace(
                  /\*\*(.*?)\*\*/g,
                  "<strong>$1</strong>"
                ),
              }}
            />
          </div>
        )}

        {/* Summary Text (Increased Font) */}
        <div
          className="text-lg leading-relaxed text-slate-700 mb-8"
          dangerouslySetInnerHTML={{ __html: aiResponse?.main_summary || "" }}
        />

        {/* Key Points (Increased Font) */}
        <div className="bg-slate-50 border-l-4 border-primary rounded-r-xl p-6 md:p-8 mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Key Observations from Case Studies
          </h4>
          <ul className="space-y-4">
            {aiResponse?.key_observations?.map((point: string, idx: number) => (
              <li
                key={idx}
                className="flex gap-3 text-md text-slate-600 leading-relaxed"
              >
                <span className="text-primary font-bold">→</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: point.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Scroll Button */}
        <Button
          variant="secondary"
          className="flex items-center gap-2 text-md font-bold px-6 py-3"
          onClick={scrollToRelated}
        >
          View underlying case studies <Lucide icon="ArrowDown" />
        </Button>
      </div>
    </div>
  );
};

export default AiResponseCard;
