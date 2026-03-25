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
import ScrollTop from "./components/ScrollTop";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <HelmetProvider>

      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            limit={3}
            hideProgressBar={true}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            toastClassName="app-toast"
            bodyClassName="app-toast-body"
          />

          <Router />
        </PersistGate>
      </Provider>
    </HelmetProvider>
    {/* <ScrollTop /> */}
  </BrowserRouter>
);
