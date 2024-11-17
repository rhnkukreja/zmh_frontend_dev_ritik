import { ArrowUp } from "lucide-react";
import React, { useEffect, useState } from "react";

const index = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    isVisible && (
      <div
        className="cursor-pointer bg-red border w-10 h-10 rounded-3xl p-3 text-2xl flex items-center justify-center "
        onClick={scrollToTop}
      >
        <ArrowUp />
      </div>
    )
  );
};

export default index;
