import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import AGMSummaryCard from "@/components/AGMSummaryCard";
import { bytesToMB, createDynamicURL, formatedDate, getDateWithoutTime } from "@/utils/helper";
import TomSelect from "@/components/Base/TomSelect";
import React, { useEffect, useRef, useState } from "react";
import { C } from "@fullcalendar/core/internal-common";

interface ModalProps {
  openSummaryModal: boolean;
  setOpenSummaryModal: (visible: boolean) => void;
  companyTicker: string;
  companyName: string;
  
}

const SummaryModal: React.FC<ModalProps> = ({
  openSummaryModal,
  setOpenSummaryModal,
  companyTicker,
  companyName
}) => {
 
  
  return (
    <Dialog
      size="xl"
      open={openSummaryModal}
      onClose={() => {
        setOpenSummaryModal(false);
      }}
    >
      <Dialog.Panel className="text-center">
   
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
      {companyName}
            </h2>
            <div
              onClick={() => {
                setOpenSummaryModal(false);
              }}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
  <AGMSummaryCard  companyGlobalSearchTicker={companyTicker} companyGlobalSearchName={companyName} />
         
          </Dialog.Description >
          <Dialog.Footer className="flex justify-end">
            <Button
              variant="outline-secondary"
              className="mr-3"
              onClick={() => {
                setOpenSummaryModal(false);
              }}
            >
              Cancel
            </Button>
           
          </Dialog.Footer>
      
      </Dialog.Panel>
    </Dialog>
  );
};

export default SummaryModal;
