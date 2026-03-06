import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";

const FinalProfileSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 🌟 Retrieve BOTH the heavily edited new profile AND the old DB profile for comparison
  const { profile, oldProfile, investorName } = location.state || {};

  if (!profile) {
    return (
      <div className="p-8 text-center text-gray-500">
        No profile data found. Please complete the review process first.
        <br/>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#901639] underline">Go Back</button>
      </div>
    );
  }

  // Upgraded Helper to detect BOTH markdown links AND bold text (**text**)
  const renderTextWithLinks = (text: string) => {
    // 1. First, split the text by bold markdown
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((boldPart, bIdx) => {
      // Render bold text cleanly without asterisks
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return (
          <strong key={`bold-${bIdx}`} className="font-bold text-gray-900">
            {boldPart.slice(2, -2)}
          </strong>
        );
      }

      // 2. For non-bold text, parse the page links
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const linkParts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(boldPart)) !== null) {
        if (match.index > lastIndex) {
          linkParts.push(boldPart.substring(lastIndex, match.index));
        }
        linkParts.push(
          <a
            key={`link-${bIdx}-${match.index}`}
            href={match[2]} // This contains your URL + #page=X
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-semibold"
          >
            {match[1]}
          </a>
        );
        lastIndex = linkRegex.lastIndex;
      }

      if (lastIndex < boldPart.length) {
        linkParts.push(boldPart.substring(lastIndex));
      }

      return linkParts.length > 0 ? linkParts : boldPart;
    });
  };

  // Smart Formatter: Renders ONLY new points if they exist, otherwise renders all old points
  const formatText = (newText: string, oldText: string = "") => {
    // 1. Normalize the old text for strict comparison (ignoring slight spacing/punctuation)
    const normalize = (str: string) => str.replace(/^[-\*•#\d\.\s]+/, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const oldLines = oldText.split('\n').map(normalize).filter(l => l.length > 5);
    const newLinesArray = newText.split('\n');

    // 2. Determine if the AI actually added any brand NEW lines to this section
    const hasNewPoints = newLinesArray.some(line => {
        const norm = normalize(line);
        return norm.length > 5 && !oldLines.some(old => old.includes(norm) || norm.includes(old));
    });

    // If there are new points, we only loop through the New Text.
    // If there are no new points, we loop through the Old Text to keep it unchanged.
    const linesToProcess = hasNewPoints ? newLinesArray : oldText.split('\n');

    return linesToProcess.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      const normalizedLine = normalize(trimmed);
      const isHeader = /^\d+\.\s/.test(trimmed) || /^#+\s/.test(trimmed) || (trimmed.endsWith(":") && trimmed.length < 80);
      
      // REMOVED replace(/\*\*/g, '') so the bold parser can catch it!
      let cleanLine = trimmed.replace(/^[-\*•]\s*/, '').replace(/^#+\s*/, '').trim();

      // ALWAYS highlight the subheadings (like "1. Proxy Advisory Firms")
      if (isHeader) {
        return (
          <div key={idx} className="font-bold text-gray-900 mt-6 mb-3 text-[15px] bg-red-50 px-3 py-2 rounded-md inline-block shadow-sm border border-red-100">
            {renderTextWithLinks(cleanLine)}
          </div>
        );
      }
      
      // 🌟 IF SECTION HAS CHANGES: Render ONLY the newly added points with green highlights
      if (hasNewPoints) {
          const isNewPoint = normalizedLine.length > 5 && !oldLines.some(old => old.includes(normalizedLine) || normalizedLine.includes(old));
          
          if (isNewPoint) {
              return (
                <div key={idx} className="ml-4 flex gap-3 text-[14px] mb-3 text-gray-700 items-start">
                  <span className="text-green-500 mt-0.5 text-[14px] leading-none">✨</span>
                  <p className="text-gray-900 font-medium bg-green-50/80 px-2 py-1 rounded border border-green-100/50 leading-relaxed shadow-sm">
                    {renderTextWithLinks(cleanLine)}
                  </p>
                </div>
              );
          }
          // We completely hide the old points in this section by returning null!
          return null; 
      }

      // 🌟 IF SECTION HAS NO CHANGES: Render the entire old section normally
      const isBullet = /^[-\*•]\s+/.test(trimmed) || /^[-\*•]$/.test(trimmed);
      if (isBullet) {
          return (
            <div key={idx} className="ml-4 flex gap-3 text-[14px] mb-2 text-gray-700">
              <span className="text-pink-500 mt-1.5 text-[10px]">⚫</span>
              <p className="leading-relaxed">{renderTextWithLinks(cleanLine)}</p>
            </div>
          );
      }

      // Default paragraph 
      return (
        <div key={idx} className="text-[14px] mb-3 text-gray-800 leading-relaxed">
          <p>{renderTextWithLinks(cleanLine)}</p>
        </div>
      );
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-[#901639] hover:underline mb-6">
        <ArrowLeft size={16} /> Back to Documents
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
          <CheckCircle className="text-green-500 w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generated Profile Summary</h1>
            <p className="text-gray-500">{investorName}</p>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(profile.sections).map(([key, content]) => {
            const sectionTitle = key.replace(/_/g, " ").toUpperCase();
            if (!content || (content as string).trim() === "") return null;

            return (
              <div key={key} className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h3 className="text-sm font-extrabold text-[#901639] tracking-widest mb-4">{sectionTitle}</h3>
                <div className="whitespace-pre-wrap">
                  {/* We pass the NEW text and the OLD text to the smart formatter */}
                  {formatText(content as string, oldProfile?.sections?.[key] || "")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FinalProfileSummary;