import React from "react";
import { toCaseStudyBlocks } from "@/utils/caseStudyText";

interface CaseStudyTextProps {
  text: string | null | undefined;
  className?: string;
}

// Renders case-study prose (engagement_details, voting rationale/details) the
// same way on every screen: headings bold on their own line, paragraphs
// rejoined from soft wraps. whitespace-pre-line so the newlines the helper
// deliberately kept -- list-item breaks, nothing else -- render as line breaks.
const CaseStudyText: React.FC<CaseStudyTextProps> = ({ text, className }) => {
  return (
    <div className={className}>
      {toCaseStudyBlocks(text).map((block, idx) =>
        block.kind === "heading" ? (
          <p key={idx} className={`font-semibold mb-1${idx > 0 ? " mt-3" : ""}`}>
            {block.text}
          </p>
        ) : (
          <p key={idx} className="mb-3 text-justify whitespace-pre-line">
            {block.text}
          </p>
        )
      )}
    </div>
  );
};

export default CaseStudyText;
