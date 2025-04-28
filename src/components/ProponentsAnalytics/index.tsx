import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { Dispatch, SetStateAction, useState } from "react";
import LoadingIcon from "../Base/LoadingIcon";

interface ProponentsAnalyticsComponentProps {
    topProponents: any[];
    handleSearch: (searchTerms: string[]) => void;
    setSearchTerms: Dispatch<SetStateAction<string[]>>;
    tab: any;
    loading: boolean;
}

const ProponentsAnalyticsComponent: React.FC<
    ProponentsAnalyticsComponentProps
> = ({ topProponents, handleSearch, setSearchTerms, tab, loading }) => {
    const isDataAvailable = (data: any) => Array.isArray(data) && data.length > 0;

    if (!isDataAvailable(topProponents)) {
        return (
            <div className="flex items-center justify-center h-full mb-10">
                <h2 className="text-xl font-semibold text-gray-600">
                    No Analytics Available
                </h2>
            </div>
        );
    }
    const handleInstitutionClick = (institution_name: string) => {
        setSearchTerms([institution_name]);
        handleSearch([institution_name]);
    };
    const handleInstitutionClickAll = () => {
        setSearchTerms([]);
        handleSearch([]);
    };
    const handleInstitutionClickAllProponents = () => {
        setSearchTerms([]);
        handleSearch([]);
    };
    const format = (value: number) => {
        if (value === 0 && !value) return;
        return `(${value.toFixed(2)}%)`;
    };

    console.log("tab", tab)

    const renderSummaryTable = () => (
        <div className="overflow-x-auto my-6">
            <h3 className="text-lg font-semibold mb-2">Top Proponents</h3>
            {loading ? (
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                    {" "}
                    <LoadingIcon
                        color="#800000"
                        icon="three-dots"
                        className="w-16 h-16"
                    />
                </div>
            ) : (
                <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 border">#</th> {/* New column */}
                            <th className="px-4 py-2 border text-left">Proponents</th>
                            <th className="px-4 py-2 border"># of Proposals</th>
                            <th className="px-4 py-2 border">Environmental</th>
                            <th className="px-4 py-2 border w-36">Social</th>
                            <th className="px-4 py-2 border w-36">Governance</th>
                            <th className="px-4 py-2 border w-36">Executive Compensation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topProponents.map((proponent, idx) => {
                            const envCount =
                                proponent.category?.find(
                                    (c: any) => c.category === "Environmental"
                                )?.count || 0;
                            const socCount =
                                proponent.category?.find((c: any) => c.category === "Social")
                                    ?.count || 0;
                            const govCount =
                                proponent.category?.find(
                                    (c: any) => c.category === "Corporate Governance"
                                )?.count || 0;
                            const execComp =
                                proponent.category?.find(
                                    (c: any) => c.category === "Executive Compensation"
                                )?.count || 0;

                            const envAvgSupport =
                                proponent.category?.find(
                                    (c: any) => c.category === "Environmental"
                                )?.avg_support || 0;
                            const socAvgSupport =
                                proponent.category?.find((c: any) => c.category === "Social")
                                    ?.avg_support || 0;
                            const govAvgSupport =
                                proponent.category?.find(
                                    (c: any) => c.category === "Corporate Governance"
                                )?.avg_support || 0;
                            const execAvgSupport =
                                proponent.category?.find(
                                    (c: any) => c.category === "Executive Compensation"
                                )?.avg_support || 0;

                            return (
                                <tr key={idx} className="text-center">
                                    <td className="border px-4 py-2">{idx + 1}</td>{" "}
                                    {/* Numbered index */}
                                    <td className="border px-4 py-2 text-left">
                                        <button
                                            onClick={() =>
                                                handleInstitutionClick(proponent.institution__name)
                                            }
                                            className="text-blue-600 hover:underline focus:outline-none text-left"
                                        >
                                            {proponent.institution__name}
                                        </button>
                                    </td>
                                    <td className="border px-4 py-2">
                                        {proponent.total_count} {(tab !== "no-action" && proponent.avg_support !== undefined) && format(proponent.avg_support)}
                                    </td>
                                    <td className="border px-4 py-2">
                                        {envCount} {(tab !== "no-action" && envAvgSupport !== undefined) && format(envAvgSupport)}
                                    </td>
                                    <td className="border px-4 py-2">
                                        {socCount} {(tab !== "no-action" && socAvgSupport !== undefined) && format(socAvgSupport)}
                                    </td>
                                    <td className="border px-4 py-2">
                                        {govCount} {(tab !== "no-action" && govAvgSupport !== undefined) && format(govAvgSupport)}
                                    </td>
                                    <td className="border px-4 py-2">
                                        {execComp} {(tab !== "no-action" && execAvgSupport !== undefined) && format(execAvgSupport)}
                                    </td>


                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderSubcategoryTable = (title: string, data: any[]) => {
        const [currentPage, setCurrentPage] = useState(0);
        const itemsPerPage = 5;

        const totalPages = Math.ceil(data.length / itemsPerPage);
        const startIndex = currentPage * itemsPerPage;
        const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

        const goToPreviousPage = () => {
            if (currentPage > 0) setCurrentPage(currentPage - 1);
        };

        const goToNextPage = () => {
            if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
        };

        return (
            <div className="bg-gray-100 p-4 rounded-lg shadow-md min-w-[275px] flex flex-col justify-between h-full mt-5">
                <h3 className="text-md font-semibold mb-2">{title}</h3>
                <div className="overflow-x-auto min-h-[300px]">
                    {data.length > 0 ? (
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border p-2 text-left">Subcategory</th>
                                    <th className="border p-2 text-center">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((entry, idx) => (
                                    <tr key={idx}>
                                        <td className="border p-2">{entry.sub_category}</td>
                                        <td className="border p-2 text-center">{entry.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl flex flex-col mb-20 ${topProponents.length === 1 &&
                topProponents[0]?.subcategory_detail &&
                Object.keys(topProponents[0].subcategory_detail).length > 0
                ? "min-h-[100vh]"
                : "min-h-[65vh]"
                }`}
        >
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                All Proponents Analytics (Beta)
            </h2>

            {renderSummaryTable()}

            {/* Show additional sub-category tables only when topProponents has 1 item */}
            {topProponents.length === 1 &&
                topProponents[0]?.subcategory_detail &&
                Object.keys(topProponents[0].subcategory_detail).length > 0 && (
                    <div className="flex flex-row flex-wrap md:flex-nowrap gap-6 overflow-x-auto">
                        {topProponents[0].subcategory_detail.Environment &&
                            renderSubcategoryTable(
                                "Environmental",
                                topProponents[0].subcategory_detail.Environment.slice(0, 5)
                            )}
                        {topProponents[0].subcategory_detail.Social &&
                            renderSubcategoryTable(
                                "Social",
                                topProponents[0].subcategory_detail.Social.slice(0, 5)
                            )}
                        {topProponents[0].subcategory_detail.Governance &&
                            renderSubcategoryTable(
                                "Governance",
                                topProponents[0].subcategory_detail.Governance.slice(0, 5)
                            )}
                        {topProponents[0].subcategory_detail["Executive Compensation"] &&
                            renderSubcategoryTable(
                                "Executive Compensation",
                                topProponents[0].subcategory_detail[
                                    "Executive Compensation"
                                ].slice(0, 5)
                            )}
                    </div>
                )}
            <footer className="!pt-10">
                <div className="flex items-start justify-between">
                    <span className="!pt-3 flex items-center relative">
                        <sup className="cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>
                            *
                        </sup>
                        <p id="footnote">2022 and 2023 data is for S&P500 companies only</p>
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default ProponentsAnalyticsComponent;
