import { useAppSelector } from "@/stores/hooks";
import React, { ComponentType, useEffect } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const withAuth = (WrappedComponent:ComponentType) => {

  const INACTIVITY_TIMEOUT = 7200000; // milliseconds === 2 hours

  return (props: any) => {
    const { user } = useAppSelector((state) => state.authentiction);
    const navigate = useNavigate();

    // useEffect(() => {

    //   const token = localStorage.getItem('token');
    //   if (token) {
    //     const { exp } = JSON.parse(atob(token.split('.')[1]));
    //     const expirationTime = exp * 1000 - Date.now();
    //       console.log(expirationTime);
    //     const timer = setTimeout(() => {
    //       handleLogout();
    //     }, time);
  
    //     return () => clearTimeout(timer);
    //   }
    // }, [time]);

    
    // const handleLogout = () => {
    //   localStorage.removeItem('token');
    //   localStorage.clear();
    //   navigate('/login');
    //   toast.success("Your session has been expired.");
    // };

    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
  
      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => handleLogout(), INACTIVITY_TIMEOUT);
      };
  
      const handleActivity = () => resetTimeout();
  
      const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.clear();
        navigate('/login');
        toast.warning("Your session has been expired.");
      };

      resetTimeout();
  
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
  
      return () => {
        clearTimeout(timeoutId); 
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keypress', handleActivity);
      };
    }, [navigate]);
    

    if (!user?.token) {
      return <Navigate to="/login" />;
    }

    return <WrappedComponent {...props} />;
  };

};

export default withAuth;
