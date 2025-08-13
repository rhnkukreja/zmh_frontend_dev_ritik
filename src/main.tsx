import ScrollToTop from "@/components/Base/ScrollToTop";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store, persistor } from "./stores/store";
import Router from "./router";
import "./assets/css/app.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PersistGate } from "redux-persist/integration/react";
import { HelmetProvider } from "react-helmet-async";
import Joyride, { CallBackProps, Step } from "react-joyride";
import React, { useState, useEffect } from "react";
import { guideSteps } from "./constant";

(function (c, l, a, r, i, t, y) {
  c[a] =
    c[a] ||
    function () {
      (c[a].q = c[a].q || []).push(arguments);
    };
  t = l.createElement(r);
  t.async = 1;
  t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0];
  y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "r4n5dqq0s1");


// Joyride callback to handle scroll positioning
const handleJoyrideCallback = (data: CallBackProps) => {
  const { type, step } = data;

  if (type === "step:before") {
    const offset = 300; // custom scroll offset
    const target = document.querySelector(step.target as string);
    if (target) {
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }
};

function MainApp() {
  const [run, setRun] = useState(false);

  // Start tour after UI is mounted
  useEffect(() => {
    setTimeout(() => setRun(true), 800); // wait to ensure DOM is ready
  }, []);

  return (
    <BrowserRouter>
      <HelmetProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />

            <Joyride
              steps={guideSteps}
              run={run}
              continuous
              showProgress
              showSkipButton
              disableScrolling
              callback={handleJoyrideCallback}
              styles={{
                options: {
                  zIndex: 10000,
                  arrowColor: "#e3ffeb",
                  primaryColor: "rgb(149 22 57)",
                  textColor: "#000"
                }
              }}
            />

            <Router />
          </PersistGate>
        </Provider>
      </HelmetProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<MainApp />);
