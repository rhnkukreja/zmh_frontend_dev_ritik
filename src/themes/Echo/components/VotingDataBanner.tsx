import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { IoMdInformationCircleOutline, IoMdCloseCircleOutline } from "react-icons/io";

const VotingDataBanner = () => {
    // Check localStorage. The banner is visible by default unless it has been seen before.
    const [isBannerVisible, setIsBannerVisible] = useState(() => {
        return localStorage.getItem('banner_seen') !== 'true';
    });

    const bannerRef = useRef(null);

    // This function handles closing the banner and setting the local storage flag.
    const closeBanner = () => {
        setIsBannerVisible(false);
        localStorage.setItem('banner_seen', 'true');
    };

    // This function manually opens the banner.
    const openBanner = () => {
        setIsBannerVisible(true);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isBannerVisible && bannerRef.current && !bannerRef.current.contains(event.target)) {
                closeBanner();
            }
        };

        if (isBannerVisible) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isBannerVisible]);

    return (
        <>
            {/* The info icon button. It will open the banner when clicked. */}
            <button
                onClick={openBanner}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center transition-colors hover:bg-blue-200"
                aria-label="Toggle voting data banner"
            >
                <IoMdInformationCircleOutline className="w-4 h-4 text-blue-800 dark:text-blue-200" />
            </button>

            {/* The floating banner, shown conditionally */}
            {isBannerVisible && (
                <div
                    ref={bannerRef}
                    className={clsx(
                        "fixed top-20 right-4 w-1/2 p-4 rounded-lg shadow-xl",
                        "bg-blue-100/60 dark:bg-blue-900/60 backdrop-blur-sm",
                        "border border-blue-200/60 dark:border-blue-800/60",
                        "transition-transform duration-300 ease-in-out transform translate-y-0",
                        "z-50"
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                <strong>BlackRock, Vanguard, T. Rowe, and SSgA</strong> Q2 2025 voting data has been added to the Dashboard.
                            </p>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                <strong>BlackRock, Vanguard, T. Rowe, Dimensional, and SSgA</strong> NPX voting data has been added to the Dashboard.
                            </p>
                        </div>

                        <button
                            onClick={closeBanner}
                            className="ml-4 p-1 mt-[-10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 focus:outline-none"
                            aria-label="Close notification banner"
                        >
                            <IoMdCloseCircleOutline size={20} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default VotingDataBanner;