import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { IoMdCloseCircleOutline } from "react-icons/io";

interface InvestorProfileTourProps {
  compactMenu: boolean;
}

const InvestorProfileTour = ({ compactMenu }: InvestorProfileTourProps) => {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem("investor_profile_tour_seen") !== "true";
  });

  const closeTour = () => {
    setIsVisible(false);
    localStorage.setItem("investor_profile_tour_seen", "true");
  };

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        closeTour();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Banner permanently disabled
  return null;

  // eslint-disable-next-line no-unreachable
  return (
    <div
      className={clsx(
        "fixed z-[60] animate-slideIn transition-all duration-500 ease-in-out",
        compactMenu ? "left-[105px]" : "left-[295px]",
        "top-[195px]"
      )}
    >
      <div className={clsx(
        "relative p-4 rounded-xl shadow-2xl w-[250px]",
        "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800",
        "border-2 border-blue-300 dark:border-blue-600"
      )}>
        {/* Arrow */}
        <div className={clsx(
          "absolute left-[-10px] top-1/2 -translate-y-1/2 w-0 h-0",
          "border-t-[10px] border-t-transparent",
          "border-b-[10px] border-b-transparent",
          "border-r-[10px] border-r-blue-300 dark:border-r-blue-600"
        )}></div>

        <div className="flex items-start gap-2">
          <p className="text-[13px] leading-snug text-blue-800 dark:text-blue-100 font-medium">
            Voting Guidelines are now part of <strong>Investor Profile</strong> module
          </p>
          <button
            onClick={closeTour}
            className="flex-shrink-0 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
            aria-label="Close tour"
          >
            <IoMdCloseCircleOutline size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestorProfileTour;
