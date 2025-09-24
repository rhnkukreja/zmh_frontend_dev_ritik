import React from "react";
import Alert from "@/components/Base/Alert";
import Lucide from "../Base/Lucide";

interface ErrorProps {
  children: React.ReactNode;
  className?: string;
}
const Error: React.FC<ErrorProps> = ({ children, className }) => {
  return (
    <Alert
      variant="soft-danger"
      className={`flex items-center p-2 mt-2 ${className}`}
    >
      <Lucide icon="AlertTriangle" className="w-6 h-6 mr-2" />
      <span>{children}</span>
    </Alert>
  );
};

export default Error;
