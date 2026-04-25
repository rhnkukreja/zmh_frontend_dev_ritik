import React, { createContext, useContext, useState, type ReactNode } from 'react';

// --- Types ---
interface QAFilters {
  investorId: string;
  selectedCategories: string[];
  selectedYears: string[];
  includeEmea: boolean;
  question: string;
  scope: "specific" | "all";
  selectedPdfIds: string[];
}

interface CompareFilters {
  investor1: string;
  investor2: string;
  selectedCategories: string[];
  selectedYears: string[];
  includeEmea: boolean;
  question: string;
  mode: "auto" | "specific";
  manualSelectedPdfIds: string[];
}

interface GuidelineFilters {
  selectedInvestors: string[];
  includeEmea: boolean;
  question: string;
}

interface ChatContextType {
  // --- QA Page ---
  qaHistory: any[];
  setQaHistory: React.Dispatch<React.SetStateAction<any[]>>;
  qaFilters: QAFilters;
  setQaFilters: React.Dispatch<React.SetStateAction<QAFilters>>;

  // --- Compare Page ---
  compareHistory: any[];
  setCompareHistory: React.Dispatch<React.SetStateAction<any[]>>;
  compareFilters: CompareFilters;
  setCompareFilters: React.Dispatch<React.SetStateAction<CompareFilters>>;

  // --- Guidelines Page ---
  guidelineResults: any[];
  setGuidelineResults: React.Dispatch<React.SetStateAction<any[]>>;
  guidelineFilters: GuidelineFilters;
  setGuidelineFilters: React.Dispatch<React.SetStateAction<GuidelineFilters>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [qaHistory, setQaHistory] = useState<any[]>([]);
  const [compareHistory, setCompareHistory] = useState<any[]>([]);
  const [guidelineResults, setGuidelineResults] = useState<any[]>([]);

  const [qaFilters, setQaFilters] = useState<QAFilters>({
    investorId: "",
    selectedCategories: [],
    selectedYears: [],
    includeEmea: false,
    question: "",
    scope: "specific",
    selectedPdfIds: [],
  });

  const [compareFilters, setCompareFilters] = useState<CompareFilters>({
    investor1: "",
    investor2: "",
    selectedCategories: [],
    selectedYears: [],
    includeEmea: false,
    question: "",
    mode: "auto",
    manualSelectedPdfIds: [],
  });

  const [guidelineFilters, setGuidelineFilters] = useState<GuidelineFilters>({
    selectedInvestors: [],
    includeEmea: false,
    question: "",
  });

  return (
    <ChatContext.Provider
      value={{
        qaHistory, setQaHistory, qaFilters, setQaFilters,
        compareHistory, setCompareHistory, compareFilters, setCompareFilters,
        guidelineResults, setGuidelineResults, guidelineFilters, setGuidelineFilters,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};