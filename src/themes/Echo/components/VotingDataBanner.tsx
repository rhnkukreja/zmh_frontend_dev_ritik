import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io';
import { IoMdCloseCircleOutline } from "react-icons/io";

const VotingDataBanner = () => {
    const [isVisible, setIsVisible] = useState(true);
    const bannerRef = useRef(null);

    const handleToggle = () => {
        setIsVisible(!isVisible);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bannerRef.current && !bannerRef.current.contains(event.target) && isVisible) {
                setIsVisible(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isVisible]);

    if (!isVisible) {
        return (
            <button
                onClick={handleToggle}
                className="fixed top-20 right-4 z-50 p-2 rounded-full bg-blue-500 mt-[-14px] text-white shadow-lg hover:bg-blue-600 transition-colors"
                aria-label="Maximize notification banner"
            >
                <IoIosArrowUp size={24} />
            </button>
        );
    }

    return (
        <div
            ref={bannerRef}
            className={clsx(
                "bg-blue-100/60 dark:bg-blue-900/60 backdrop-blur-sm",
                "border border-blue-200/60 dark:border-blue-800/60",
                "fixed top-20 right-4 w-1/2 p-4 rounded-lg shadow-xl",
                "transition-transform duration-300 ease-in-out transform translate-y-0",
                "z-50"
            )}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        ZMH is adding <strong>BlackRock, Vanguard, T. Rowe, SSgA</strong> Q2 2025 voting data to the Dashboard. In the interim, links to each investor’s voting platform is available in the <strong>notification section 🔔</strong>.
                    </p>
                </div>
                <button
                    onClick={handleToggle}
                    className="ml-4 p-1 mt-[-10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 focus:outline-none"
                    aria-label="Minimize notification banner"
                >
                    <IoIosArrowDown size={20} />
                </button>
            </div>
        </div>
    );
};

export default VotingDataBanner;