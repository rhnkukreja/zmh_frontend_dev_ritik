import { TopEngagementTopics } from "@/types/peerAnalysis";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Lucide from "@/components/Base/Lucide";

interface ChartComponentProps {
    investorData: {
        institution__institution: string;
        unique_companies: number;
        environmental: number;
        social: number;
        governance: number;
        recent_engagement_doc: string | null;
    }[];
    pieChartDataPeerAnalysis: {
        name: string;
        total: number;
    }[];
    handleSearch: (searchTerms: string[]) => void;
    topEngagementTopics: TopEngagementTopics;
    onDocumentClick?: (institutionName: string) => void;
    isAllCompanySelected: boolean;
    isLoading?: boolean;
}

const COLORS = ["#00C49F", "#FF6F00", "#0088FE"];

const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString();
};

const formatEngagementValue = (value: any): JSX.Element | string => {
    // If value is 0 → return blank
    if (value === 0) {
        return "0";
    }

    // If value is ND → return *
    if (value === "ND") {
        return (
            <span
                className="cursor-pointer text-gray-400 hover:text-gray-600 inline-block mt-3"
                onClick={() => {
                    const footnoteElement = document.getElementById('footnote');
                    if (footnoteElement) {
                        footnoteElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
                style={{ fontSize: "1em", transform: "translateY(-1px)" }}
            >
                *
            </span>
        );
    }

    // Otherwise format normally
    return typeof value === "number" ? formatNumberWithCommas(value) : value;
};


const ChartComponent: React.FC<ChartComponentProps> = ({ investorData, pieChartDataPeerAnalysis, handleSearch, topEngagementTopics, onDocumentClick, isAllCompanySelected, isLoading = false }) => {
    const isInvestorDataAvailable = investorData && investorData.length > 0;

    if (!investorData) {
        <h2 className="text-xl font-semibold mb-4">No Analytics available</h2>
        return
    }

    if (isLoading) {
        return (
            <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl flex flex-col mb-10">
                <h2 className="text-xl font-semibold mb-4">Analytics</h2>

                <div className="flex gap-6 rounded-lg">
                    <div>
                        <div className="w-5/5 overflow-auto max-h-80 rounded-lg">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Institution</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>
                                            {isAllCompanySelected ? "No of unique companies" : "No of Engagements"}
                                        </th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Environmental</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Social</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Governance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <tr key={`engagement-chart-skeleton-row-${index}`} className="border-b border-slate-200 dark:border-slate-600">
                                            <td className="py-2 px-3 text-left">
                                                <div className="h-4 w-[85%] rounded bg-slate-200 animate-pulse" />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="h-4 w-10 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="h-4 w-8 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="h-4 w-8 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="h-4 w-8 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 italic space-y-1">
                            <div>*Investor does not disclose engagement details</div>
                            <div className="flex items-center gap-1">
                                <Lucide icon="Info" className="w-3 h-3" />
                                <span>Only shows the latest engagement report</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-6/12 rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                        <div className="h-[260px] flex items-center justify-center">
                            <div className="relative w-44 h-44">
                                <div className="absolute inset-0 rounded-full border-[20px] border-slate-200 animate-pulse" />
                                <div className="absolute inset-[28%] rounded-full bg-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                    {[
                        "Governance",
                        "Environmental",
                        "Social",
                    ].map((title) => (
                        <div key={`engagement-topic-skeleton-${title}`} className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{ fontSize: '14px' }}>{title}</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Topic</th>
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Count</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={`engagement-topic-row-${title}-${index}`} className="border-b border-slate-200 dark:border-slate-600">
                                            <td className="py-2 px-3 font-medium" style={{ fontSize: '14px' }}>
                                                <div className="h-4 w-[88%] rounded bg-slate-200 animate-pulse" />
                                            </td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>
                                                <div className="h-4 w-10 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>
                                                <div className="h-4 w-12 rounded bg-slate-200 animate-pulse mx-auto" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const filteredPieChartData = pieChartDataPeerAnalysis.filter(entry => entry.total > 0);


    return (
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl flex flex-col mb-10">
            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
            {!isInvestorDataAvailable ? (
                <p className="text-center text-gray-500 text-lg">No Analytics available</p>
            ) : (
                <>
                    <div className="flex gap-6 rounded-lg">
                        <div>
                            <div className="w-5/5 overflow-auto max-h-80 rounded-lg">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-primary text-white">
                                            <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Institution</th>
                                            <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>
                                                {isAllCompanySelected ? "No of unique companies" : "No of Engagements"}
                                            </th>
                                            <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Environmental</th>
                                            <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Social</th>
                                            <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Governance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {investorData.map((investor, index) => (
                                            <tr key={index} className="border-b border-slate-200 dark:border-slate-600">
                                                <td
                                                    className="py-2 px-3 text-left"
                                                    style={{ fontSize: '14px' }}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span
                                                            className="text-blue-600 cursor-pointer hover:underline flex-1"
                                                            onClick={() => handleSearch([investor.institution__institution])}
                                                        >
                                                            {investor.institution__institution}
                                                        </span>
                                                        {onDocumentClick && (
                                                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                                                {(() => {
                                                                    // 1. Try API recent_engagement_doc first
                                                                    // 2. Fallback to hardcoded mapping if API field is null/empty
                                                                    const institutionName = investor.institution__institution;
                                                                    let url = investor.recent_engagement_doc ?? "";

                                                                    if (!url || url.trim() === "") {
                                                                        const mapping: Record<string, string> = {
                                                                            "Blackrock": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                            "Blackrock, Inc.": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                            "BlackRock": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                            "BlackRock, Inc.": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                            "The Vanguard Group": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",
                                                                            "Vanguard": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",
                                                                            "The Vanguard Group, Inc.": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",
                                                                            "Baillie Gifford and Co.": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                            "Baillie Gifford": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                            "Baillie Gifford & Co": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                            "Baillie Gifford & Co.": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                            "Schroder Investment Management Ltd": "https://publications.schroders.com/view/833551848/19/",
                                                                            "Schroders": "https://publications.schroders.com/view/833551848/19/",
                                                                            "UBS Asset Management AG": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",
                                                                            "UBS Asset Management": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",
                                                                            "UBS": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",
                                                                            "Northern Trust Asset Management": "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf",
                                                                            "Northern Trust": "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf",
                                                                            "Allspring Global Investments": "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf",
                                                                            "Allspring": "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf",
                                                                            "State Street Global Advisors": "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf",
                                                                            "SSGA": "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf",
                                                                            "T Rowe Price Associates": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                            "T. Rowe Price Associates": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                            "T Rowe Price": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                            "Dimensional Fund Advisors": "https://www.dimensional.com/chmedia/427214/source/annual-stewardship-report.pdf",
                                                                            "Dimensional": "https://www.dimensional.com/chmedia/427214/source/annual-stewardship-report.pdf",
                                                                        };
                                                                        url = mapping[institutionName] ?? "";
                                                                        if (!url) {
                                                                            const lower = institutionName.toLowerCase();
                                                                            if (lower.includes('blackrock')) url = "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf";
                                                                            else if (lower.includes('vanguard')) url = "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf";
                                                                            else if (lower.includes('baillie') || lower.includes('gifford')) url = "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025";
                                                                            else if (lower.includes('schroder')) url = "https://publications.schroders.com/view/833551848/19/";
                                                                            else if (lower.includes('ubs')) url = "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf";
                                                                            else if (lower.includes('northern trust')) url = "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf";
                                                                            else if (lower.includes('allspring')) url = "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf";
                                                                            else if (lower.includes('state street')) url = "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf";
                                                                            else if (lower.includes('rowe')) url = "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf";
                                                                            else if (lower.includes('dimensional')) url = "https://www.dimensional.com/chmedia/427214/source/annual-stewardship-report.pdf";
                                                                        }
                                                                    }

                                                                    return url && url.trim() !== "" ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); window.open(url, '_blank', 'noopener,noreferrer'); }}
                                                                            className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                                                            aria-label={`Open documents for ${institutionName}`}
                                                                        >
                                                                            <Lucide icon="Info" className="w-4 h-4" />
                                                                        </button>
                                                                    ) : (
                                                                        <div className="p-1">
                                                                            <Lucide icon="Info" className="w-4 h-4 text-gray-300" />
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatNumberWithCommas(investor.unique_companies)}</td>
                                                <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatEngagementValue(investor.environmental)}</td>
                                                <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatEngagementValue(investor.social)}</td>
                                                <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatEngagementValue(investor.governance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Footnote for ESG tables */}
                            <div className="mt-4 text-xs text-gray-500 italic space-y-1">
                                <div>*Investor does not disclose engagement details</div>
                                <div className="flex items-center gap-1">
                                    <Lucide icon="Info" className="w-3 h-3" />
                                    <span>Only shows the latest engagement report</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-6/12 rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            {filteredPieChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}  >
                                    <PieChart >
                                        <Pie
                                            data={filteredPieChartData}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            startAngle={90}
                                            endAngle={-270}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        fill={COLORS[index % COLORS.length]}
                                                        textAnchor={x > cx ? "start" : "end"}
                                                        dominantBaseline="central"
                                                        fontSize={12}
                                                    >
                                                        {`${name}: ${formatNumberWithCommas(value)}`}
                                                    </text>
                                                );
                                            }}
                                            labelLine={false}
                                        >
                                            {filteredPieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500">No chart data available</p>
                            )}
                        </div>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{ fontSize: '14px' }}>Governance</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Topic</th>
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Count</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.gov.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="border-b border-slate-200 dark:border-slate-600">
                                            <td className="py-2 px-3 font-medium" style={{ fontSize: '14px' }}>{topic.topic}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{(topic.percentage_gov_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{ fontSize: '14px' }}>Environmental</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Topic</th>
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Count</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.env.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="border-b border-slate-200 dark:border-slate-600">
                                            <td className="py-2 px-3 font-medium" style={{ fontSize: '14px' }}>{topic.topic}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{(topic.percentage_env_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{ fontSize: '14px' }}>Social</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Topic</th>
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Count</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.soc.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="border-b border-slate-200 dark:border-slate-600">
                                            <td className="py-2 px-3 font-medium" style={{ fontSize: '14px' }}>{topic.topic}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>{(topic.percentage_soc_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
};

export default ChartComponent;
