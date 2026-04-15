import React, { useState } from "react";
import { Tab } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import SustainabilityBrief from "./SustainabilityBrief";
import ProposalBrief from "./ProposalBrief";
import ActivismOverview from "./ActivismOverview";
import AddNewsletterModal from "./AddNewsletterModal";

const Newsletter: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const categories = [
    "The Sustainability Brief",
    "Shareholder Proposal Brief",
    "Monthly Activism Overview",
  ];

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container m-auto h-[calc(100vh-70px)] flex flex-col my-[-35px] pb-[30px]">
      <Tab.Group onChange={setActiveTab}>
        {/* Professional Header - Exact Dashboard Style */}
        <div className="w-full sticky z-30 transition-all duration-300 ease-in-out bg-white dark:bg-darkmode-600 shadow-md rounded-xl mt-8 border border-gray-200 dark:border-darkmode-400">
          <div className="bg-gradient-to-r from-white to-gray-50 dark:from-darkmode-600 dark:to-darkmode-700 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-darkmode-400">
            <div className="bg-white dark:bg-darkmode-800 rounded-xl p-1.5 flex items-center gap-1.5 shadow-sm border border-gray-200 dark:border-darkmode-400">
              <Tab.List
                variant="boxed-tabs"
                className="border-none bg-transparent p-0 gap-1.5 flex"
              >
                {[
                  { title: "The Sustainability Brief", icon: "Globe" },
                  { title: "Shareholder Proposal Brief", icon: "FileText" },
                  { title: "Monthly Activism Overview", icon: "Calendar" },
                ].map((item, index) => (
                  <Tab key={index} className="focus:outline-none flex-none">
                    {({ selected }) => (
                      <Tab.Button
                        as="button"
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
                          selected
                            ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-md transform scale-105"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-darkmode-700 dark:hover:text-slate-200 border-transparent bg-transparent"
                        }`}
                      >
                        <Lucide icon={item.icon as any} className="w-4 h-4" />
                        {item.title}
                      </Tab.Button>
                    )}
                  </Tab>
                ))}
              </Tab.List>
            </div>

            <div className="hidden lg:block">
              <Button
                variant="primary"
                className="flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all duration-200 font-bold"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Lucide icon="Plus" className="w-4 h-4" />
                Add Document
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 mt-6 transition-all duration-500">
          <Tab.Panels>
            <Tab.Panel className="focus:outline-none outline-none">
              <SustainabilityBrief refreshTrigger={refreshTrigger} />
            </Tab.Panel>
            <Tab.Panel className="focus:outline-none outline-none">
              <ProposalBrief refreshTrigger={refreshTrigger} />
            </Tab.Panel>
            <Tab.Panel className="focus:outline-none outline-none">
              <ActivismOverview refreshTrigger={refreshTrigger} />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>

      {/* Add Document Modal */}
      <AddNewsletterModal
        isOpen={isAddModalOpen}
        setIsOpen={setIsAddModalOpen}
        defaultCategory={categories[activeTab]}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Newsletter;
