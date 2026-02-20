import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";

interface Institution {
  institution: string;
  environmental: string | null;
  social: string | null;
  governance: string | null;
}

interface LowestSupport {
  proposal_num: string;
  nominee: string;
  support_pct: number;
}

interface Section {
  id: string;
  title: string;
  paragraphs: string[];
  institutions?: Institution[];
  lowest_support?: LowestSupport[];
  selected_support_levels?: any[];
}

interface CompanyOverviewData {
  sections: Section[];
  report_metadata: {
    data_as_of: string;
    ticker: string;
    generated_at: string;
  };
  company: {
    name: string;
    ticker: string;
    exchange: string;
    industry: string;
  };
}

const SkeletonSection = () => (
  <div className="mb-10 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="h-px bg-gray-100 mb-4"></div>
    <div className="space-y-2.5">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-11/12"></div>
      <div className="h-4 bg-gray-100 rounded w-4/5"></div>
    </div>
  </div>
);

const CompanyOverview = () => {
  const { companyGlobalSearchId, companyGlobalSearchName } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [data, setData] = useState<CompanyOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyGlobalSearchId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(
          `${baseURL}/company_report/key_findings_gpt/?company_id=${companyGlobalSearchId}`
        );
        setData(response.data);
      } catch (err) {
        setError("Failed to load company overview. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyGlobalSearchId]);

  if (!companyGlobalSearchId) {
    return (
      <div className="p-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-500 text-base font-medium">Search for a company to view its overview</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="animate-pulse mb-10">
          <div className="h-7 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div className="h-4 bg-gray-100 rounded w-1/4 mb-6"></div>
          <div className="h-px bg-gray-200 mt-2"></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonSection key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-500 text-base font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">
          {data.company.name} – Key Governance & Investor Summary
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1.5">
          As of {data.report_metadata.data_as_of}
        </p>
      </div>

      {/* Sections */}
      <div className="px-8 py-6 divide-y divide-gray-100">
        {data.sections.map((section) => (
          <div key={section.id} className="py-8 first:pt-2">
            {/* Section Title */}
            <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>

            {/* Paragraphs */}
            {section.paragraphs.length > 0 && (
              <div className="space-y-2">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {/* Engagement Institutions Table */}
            {section.institutions && section.institutions.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-1/4">Institution</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-1/4">Environmental</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-1/4">Social</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-1/4">Governance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.institutions.map((inst, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{inst.institution}</td>
                        <td className="py-3 px-4 text-gray-600">{inst.environmental || <span className="text-gray-300">—</span>}</td>
                        <td className="py-3 px-4 text-gray-600">{inst.social || <span className="text-gray-300">—</span>}</td>
                        <td className="py-3 px-4 text-gray-600">{inst.governance || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lowest Support Table */}
            {section.lowest_support && section.lowest_support.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lowest Support Levels</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 w-24">Proposal</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nominee</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 w-28">Support %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.lowest_support.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-500 font-mono text-xs">{item.proposal_num}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{item.nominee}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.support_pct < 95
                                ? "bg-orange-50 text-orange-700"
                                : "bg-green-50 text-green-700"
                            }`}>
                              {item.support_pct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyOverview;
