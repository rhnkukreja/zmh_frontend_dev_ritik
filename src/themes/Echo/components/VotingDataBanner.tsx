import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  IoMdInformationCircleOutline,
  IoMdCloseCircleOutline,
} from "react-icons/io";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchNotificationsOnce, fetchNotifications } from "@/stores/globalNotificationsSlice";

const VotingDataBanner = () => {
  // Check localStorage. The banner is visible by default unless it has been seen before.
  const [isBannerVisible, setIsBannerVisible] = useState(() => {
    return localStorage.getItem("banner_seen") !== "true";
  });
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);
  const dispatch = useAppDispatch();
  const { notifications, loading, initialized } = useAppSelector((s) => (s as any).globalNotifications || { notifications: [], loading: false, initialized: false });
  const [closedNotifications, setClosedNotifications] = useState<Array<number | string>>([]);

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
    setClosedNotifications([]);
    dispatch(fetchNotificationsOnce());
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
  };

  // Fetch notifications on mount if not already initialized
  useEffect(() => {
    if (!initialized) {
      dispatch(fetchNotifications());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <>
          {/* Single banner containing hardcoded message + notification rows */}
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
              <div className="flex-1 space-y-2">
                <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                  Added <strong>Q1 2026 Voting Data</strong> for <strong>BlackRock</strong>, <strong>Vanguard</strong>, <strong>State Street</strong>, and <strong>40+ more institutions</strong>.
                </p>

                {/* Notifications list (each row) */}
                {(notifications || []).filter((n: any) => n && !closedNotifications.includes(n.id)).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {(notifications || []).filter((n: any) => n && !closedNotifications.includes(n.id)).map((n: any) => (
                      <div key={n.id} className="flex items-start justify-between gap-3 p-3 bg-blue-50/60 rounded-md border border-blue-100">
                        <div className="text-sm leading-relaxed text-blue-800 dark:text-blue-200 prose max-w-none" dangerouslySetInnerHTML={{ __html: n.notification_text || n.text || "" }} />
                        <div className="flex-shrink-0 ml-3">
                          <button
                            onClick={() => setClosedNotifications((prev) => [...prev, n.id])}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 focus:outline-none transition-colors rounded-full hover:bg-blue-200 dark:hover:bg-blue-700"
                            aria-label={`Close notification ${n.id}`}
                          >
                            <IoMdCloseCircleOutline size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
        </>
      )}
    </>
  );
};

export default VotingDataBanner;
