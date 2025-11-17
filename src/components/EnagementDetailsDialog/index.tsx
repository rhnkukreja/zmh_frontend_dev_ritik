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
    }[];
    pieChartDataPeerAnalysis: {
        name: string;
        total: number;
    }[];
    handleSearch: (searchTerms: string[]) => void;
    topEngagementTopics: TopEngagementTopics;
    onDocumentClick?: (institutionName: string) => void;
}

const COLORS = ["#00C49F", "#FF6F00", "#0088FE"];

const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString();
};


const ChartComponent: React.FC<ChartComponentProps> = ({ investorData, pieChartDataPeerAnalysis, handleSearch, topEngagementTopics, onDocumentClick }) => {
    const isInvestorDataAvailable = investorData && investorData.length > 0;

    if (!investorData) {
        <h2 className="text-xl font-semibold mb-4">No Analytics available</h2>
        return
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
                        <div className="w-3/5 overflow-auto max-h-80 rounded-lg">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>Institution</th>
                                        <th className="py-2 px-3 text-center font-medium" style={{ fontSize: '14px' }}>Unique Companies</th>
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
                                                                // Map institution name to document URL
                                                                const mapping: Record<string, string> = {
                                                                    // BlackRock variations
                                                                    "Blackrock": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                    "Blackrock, Inc.": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                    "BlackRock": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",
                                                                    "BlackRock, Inc.": "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf",

                                                                    // Vanguard variations  
                                                                    "The Vanguard Group": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",
                                                                    "Vanguard": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",
                                                                    "The Vanguard Group, Inc.": "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf",

                                                                    // Baillie Gifford variations
                                                                    "Baillie Gifford and Co.": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                    "Baillie Gifford": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                    "Baillie Gifford & Co": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",
                                                                    "Baillie Gifford & Co.": "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025",

                                                                    // Schroder variations
                                                                    "Schroder Investment Management Ltd": "https://publications.schroders.com/view/833551848/19/",
                                                                    "Schroders": "https://publications.schroders.com/view/833551848/19/",

                                                                    // UBS Asset Management variations
                                                                    "UBS Asset Management AG": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",
                                                                    "UBS Asset Management": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",
                                                                    "UBS": "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf",

                                                                    // Northern Trust variations
                                                                    "Northern Trust Asset Management": "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf",
                                                                    "Northern Trust": "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf",

                                                                    // Allspring Global Investments variations
                                                                    "Allspring Global Investments": "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf",
                                                                    "Allspring": "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf",

                                                                    // State Street Global Advisors variations
                                                                    "State Street Global Advisors": "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf",
                                                                    "SSGA": "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf",

                                                                    // T. Rowe Price variations
                                                                    "T Rowe Price Associates": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                    "T. Rowe Price Associates": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                    "T Rowe Price": "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf",
                                                                };

                                                                const institutionName = investor.institution__institution;
                                                                let url = mapping[institutionName] ?? "";

                                                                // If no direct match, try case-insensitive partial matching
                                                                if (!url || url.trim() === "") {
                                                                    const lowerInstitution = institutionName.toLowerCase();

                                                                    // More flexible matching patterns
                                                                    if (lowerInstitution.includes('blackrock') || lowerInstitution.includes('black rock')) {
                                                                        url = "https://www.blackrock.com/corporate/literature/press-release/investment-stewardship-global-quarterly-engagement-summary.pdf";
                                                                    } else if (lowerInstitution.includes('vanguard')) {
                                                                        url = "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/quarterly_engagement_report_for_vanguard_advised_funds_q2_2025.pdf";
                                                                    } else if (lowerInstitution.includes('baillie') || lowerInstitution.includes('gifford')) {
                                                                        url = "https://www.bailliegifford.com/en/uk/individual-investors/literature-library/corporate-governance/voting-disclosure-company-engagement/company-engagement-report-q3-2025";
                                                                    } else if (lowerInstitution.includes('schroder') || lowerInstitution.includes('schroders')) {
                                                                        url = "https://publications.schroders.com/view/833551848/19/";
                                                                    } else if (lowerInstitution.includes('ubs')) {
                                                                        url = "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement/_jcr_content/root/contentarea/mainpar/toplevelgrid_1815047835/col_1/innergrid_1956072969/col_1/actionbutton_copy_co.0583425761.file/PS9jb250ZW50L2RhbS9hc3NldHMvYXNzZXQtbWFuYWdlbWVudC1yZWltYWdpbmVkL2dsb2JhbC9jYXBhYmlsaXRpZXMvc3VzdGFpbmFiaWxpdHkvZG9jL3N0ZXdhcmRzaGlwLWFubnVhbC1yZXBvcnQtdWstZnJjLTIwMjQucGRm/stewardship-annual-report-uk-frc-2024.pdf";
                                                                    } else if (lowerInstitution.includes('northern trust')) {
                                                                        url = "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf";
                                                                    } else if (lowerInstitution.includes('allspring')) {
                                                                        url = "https://www.allspringglobal.com/globalassets/assets/insights/pdf/2024-stewardship-annual-report.pdf";
                                                                    } else if (lowerInstitution.includes('state street') || lowerInstitution.includes('global advisors')) {
                                                                        url = "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/asset-stewardship-activity-report.pdf";
                                                                    } else if (lowerInstitution.includes('rowe') || lowerInstitution.includes('price')) {
                                                                        url = "https://www.troweprice.com/content/dam/trowecorp/Pdfs/esg/stewardship-report.pdf";
                                                                    }
                                                                }

                                                                // Always show info icon, but only make it clickable if URL exists
                                                                return url && url.trim() !== "" ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // All documents now have URLs, so open in new tab
                                                                            window.open(url, '_blank', 'noopener,noreferrer');
                                                                        }}
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
                                            <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatNumberWithCommas(investor.environmental)}</td>
                                            <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatNumberWithCommas(investor.social)}</td>
                                            <td className="py-2 px-3 text-center" style={{ fontSize: '14px' }}>{formatNumberWithCommas(investor.governance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>%</th>
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
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>%</th>
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
                                        <th className="py-2 px-3 text-left font-medium" style={{ fontSize: '14px' }}>%</th>
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
            )}
        </div>
    );
};

export default ChartComponent;
