import React, { useState, useCallback } from 'react';
import _ from 'lodash';
import { Menu, Dialog } from "@/components/Base/Headless";

const CModal: React.FC<any> = ({isModalOpen}) => {

  const [basicModalPreview, setBasicModalPreview] = useState(true);

  return (
    <div>
      <Dialog open={basicModalPreview} onClose={() => {
        setBasicModalPreview(false);
      }}
      >
        <Dialog.Panel className="p-10 text-center">
          This is totally awesome blank modal!
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default CModal;
