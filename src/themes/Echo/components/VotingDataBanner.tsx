import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  IoMdInformationCircleOutline,
  IoMdCloseCircleOutline,
} from "react-icons/io";

const VotingDataBanner = () => {
  // Check localStorage. The banner is visible by default unless it has been seen before.
  const [isBannerVisible, setIsBannerVisible] = useState(() => {
    return localStorage.getItem("banner_seen") !== "true";
  });
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);

  const bannerRef = useRef(null);
  const autoDismissTimerRef = useRef(null);

  // This function handles closing the banner and setting the local storage flag.
  const closeBanner = () => {
    setIsBannerVisible(false);
    setIsManuallyOpened(false);
    localStorage.setItem("banner_seen", "true");
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
  };

  // This function manually opens the banner.
  const openBanner = () => {
    setIsBannerVisible(true);
    setIsManuallyOpened(true);
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
  };

  // Auto-dismiss after 3 seconds if not manually opened
  useEffect(() => {
    if (isBannerVisible && !isManuallyOpened) {
      autoDismissTimerRef.current = setTimeout(() => {
        setIsBannerVisible(false);
        localStorage.setItem("banner_seen", "true");
      }, 3000);
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [isBannerVisible, isManuallyOpened]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isBannerVisible &&
        isManuallyOpened &&
        bannerRef.current &&
        !bannerRef.current.contains(event.target)
      ) {
        closeBanner();
      }
    };

    if (isBannerVisible && isManuallyOpened) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBannerVisible, isManuallyOpened]);

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
            "fixed top-20 right-4 w-auto max-w-md p-5 rounded-xl shadow-2xl",
            "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800",
            "border-2 border-blue-300 dark:border-blue-600",
            "transition-all duration-300 ease-in-out transform translate-y-0",
            "z-50 animate-slideIn"
          )}
        >
          <div className="flex items-start gap-4">
            {/* <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                <IoMdInformationCircleOutline className="w-6 h-6 text-white" />
              </div>
            </div> */}
            
            <div className="flex-1 space-y-2">
              {/* <h3 className="text-base font-bold text-blue-900 dark:text-blue-100">
                🎉 New Voting Data Available!
              </h3> */}
              <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                Added <strong>Q1 2026 Voting Data</strong> for <strong>BlackRock</strong>, <strong>State Street</strong>, <strong>Dimensional</strong>, and <strong>40+ more institutions</strong>.
              </p>
            </div>

            <button
              onClick={closeBanner}
              className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 focus:outline-none transition-colors rounded-full hover:bg-blue-200 dark:hover:bg-blue-700"
              aria-label="Close notification banner"
            >
              <IoMdCloseCircleOutline size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VotingDataBanner;
