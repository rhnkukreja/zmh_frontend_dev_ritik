import { useAppSelector } from "@/stores/hooks";
import React, { ComponentType } from 'react';
import { Navigate } from "react-router-dom";

const withAuth = (WrappedComponent:ComponentType) => {
  return (props: any) => {
    const { user } = useAppSelector((state) => state.authentiction);

    if (!user?.token) {
      return <Navigate to="/login" />;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
