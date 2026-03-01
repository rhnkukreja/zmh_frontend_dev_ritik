import { useLocation, useRoutes } from "react-router-dom";
import DashboardOverview1 from "../pages/DashboardOverview1";
import DashboardOverview2 from "../pages/DashboardOverview2";
import DashboardOverview3 from "../pages/DashboardOverview3";
import DashboardOverview4 from "../pages/DashboardOverview4";
import DashboardOverview5 from "../pages/DashboardOverview5";
import DashboardOverview6 from "../pages/DashboardOverview6";
import DashboardOverview7 from "../pages/DashboardOverview7";
import DashboardOverview8 from "../pages/DashboardOverview8";
import Users from "../pages/Users";
import Departments from "../pages/Departments";
import AddUser from "../pages/AddUser";
import ProfileOverview from "../pages/ProfileOverview";
import Settings from "../pages/Settings";
import Billing from "../pages/Billing";
import Invoice from "../pages/Invoice";
import Categories from "../pages/Categories";
import AddProduct from "../pages/AddProduct";
import ProductList from "../pages/ProductList";
import ProductGrid from "../pages/ProductGrid";
import TransactionList from "../pages/TransactionList";
import TransactionDetail from "../pages/TransactionDetail";
import SellerList from "../pages/SellerList";
import SellerDetail from "../pages/SellerDetail";
import Reviews from "../pages/Reviews";
import Inbox from "../pages/Inbox";
import FileManagerList from "../pages/FileManagerList";
import FileManagerGrid from "../pages/FileManagerGrid";
import Chat from "../pages/Chat";
import Calendar from "../pages/Calendar";
import PointOfSale from "../pages/PointOfSale";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Creative from "../pages/Creative";
import Dynamic from "../pages/Dynamic";
import Interactive from "../pages/Interactive";
import RegularTable from "../pages/RegularTable";
import Tabulator from "../pages/Tabulator";
import Modal from "../pages/Modal";
import Slideover from "../pages/Slideover";
import Notification from "../pages/Notification";
import Tab from "../pages/Tab";
import Accordion from "../pages/Accordion";
import Button from "../pages/Button";
import Alert from "../pages/Alert";
import ProgressBar from "../pages/ProgressBar";
import Tooltip from "../pages/Tooltip";
import Dropdown from "../pages/Dropdown";
import Typography from "../pages/Typography";
import Icon from "../pages/Icon";
import LoadingIcon from "../pages/LoadingIcon";
import RegularForm from "../pages/RegularForm";
import Datepicker from "../pages/Datepicker";
import TomSelect from "../pages/TomSelect";
import FileUpload from "../pages/FileUpload";
import WysiwygEditor from "../pages/WysiwygEditor";
import Validation from "../pages/Validation";
import Chart from "../pages/Chart";
import Slider from "../pages/Slider";
import ImageZoom from "../pages/ImageZoom";
import LandingPage from "../pages/LandingPage";
import InvestersProfiles from "../pages/InvestorProfiles";

import DetailInvestersProfile from "../pages/InvestorProfiles/Detail";
import EngagementQuestion from "../pages/EngagementQuestion";
import ProxyVotingGuideline from "../pages/ProxyVotingGuideline";
import DetailEngagementQuesion from "../pages/EngagementQuestion/DetailEngagementQuestion";
import DetailInstitutions from "../pages/Institution/components/InstitutionDetail";
import InstitutionDocuments from "../pages/Institution/components/InstitutionDocuments";
import DetailCompany from "../pages/Company/component/CompanyDetail";
import ZMHDashboard from "../pages/ZMHDashboard";
import BoardMembers from "../pages/BoardMembers";

import Institution from "../pages/Institution";

import Layout from "../themes";
import withAuth from "./protectedRoute";
import React, { useEffect } from "react";
import CompanyList from "@/pages/Company";
import SharedHolder from "@/pages/sharedHolder";
import PeerAnalysis from "@/pages/PeerAnalysis";
import AISearchOnly from "../pages/AISearchOnly";
import CaseStudies from "@/pages/CaseStudies";
import DetailCaseStudies from "@/pages/CaseStudies/DetailCaseStudies";
import DetailShareHolder from "@/pages/sharedHolder/components/DetailShareHolder";
import InvestorCardDetails from "@/pages/InvestorCardDetails";
import AgmSummaryDetails from "@/pages/AgmSummaryDetails";
import VdsProxyVoting from "@/pages/VdsProxyVoting";
import InvestorCompanyDetails from "@/pages/InvestorCompanyDetails";
import UserDetails from "@/pages/UserDetails";
import UserLoginHistory from "@/pages/UserDetails/components/UserLoginHistory";
import Notes from "@/pages/Notes";
import NPXDetails from "@/pages/NPX";
// import NPXAnalyticsPage from "@/pages/NPXAnalytics";
import ProxyContest from "@/pages/ProxyContest";
import ProxyContestDetail from "@/pages/ProxyContestDetail";
import ProxyVotingSummary from "@/pages/ProxyVotingGuideline/components/ProxyVotingSummary";
import VdsEuropean from "@/pages/vdsEuropean";
import RealTimeData from "@/pages/RealTimeData";
import CustomReports from "../pages/CustomReports";
import VotingRationalePage from "@/pages/VotingRationalePage";
import UserManagement from "@/pages/UserManagement";
import CompanyReportPage from "@/pages/CompanyReport";


import AiChatbot from "../pages/AIChatbot/AiChatbot";
import QAPage from "../pages/AIChatbot/QAPage";
import ComparePage from "../pages/AIChatbot/ComparePage";
import VotingGuidelinesPage from "../pages/AIChatbot/VotingGuidelinesPage";
import NPXAnalyticsPage from "@/pages/NPXAnalytics";


function Router() {
  const TitleManager = () => {
    const location = useLocation();

    useEffect(() => {
      const parentRoute = routes.find((route: any) => route.path === "/");
      const slicePathName = location.pathname?.split("/")[1];
      const childRoute = parentRoute?.children?.find((route: any) =>
        route.path.includes(slicePathName)
      );
      document.title = childRoute?.data?.titleName || "ZMH Analytics";
    }, [location.pathname]);

    return null;
  };


  TitleManager();
  const routes: any = [
    {
      path: "/",
      element: React.createElement(withAuth(Layout)),
      children: [
        {
          path: "/",
          element: <ZMHDashboard />,
          data: { titleName: "Dashboard - ZMH Analytics" },
        },
        {
          path: "dashboard-overview-2",
          element: <DashboardOverview2 />,
          // data: {titleName: 'Dashboard - ZMH Analytics'}
        },
        {
          path: "dashboard-overview-3",
          element: <DashboardOverview3 />,
        },
        {
          path: "dashboard-overview-4",
          element: <DashboardOverview4 />,
        },
        {
          path: "dashboard-overview-5",
          element: <DashboardOverview5 />,
        },
        {
          path: "dashboard-overview-6",
          element: <DashboardOverview6 />,
        },
        {
          path: "dashboard-overview-7",
          element: <DashboardOverview7 />,
        },
        {
          path: "dashboard-overview-8",
          element: <DashboardOverview8 />,
        },
        {
          path: "users",
          element: <Users />,
        },
        {
          path: "departments",
          element: <Departments />,
        },
        {
          path: "add-user",
          element: <AddUser />,
        },
        {
          path: "profile-overview",
          element: <ProfileOverview />,
        },
        {
          path: "settings",
          element: <Settings />,
        },
        {
          path: "billing",
          element: <Billing />,
        },
        {
          path: "invoice",
          element: <Invoice />,
        },
        {
          path: "categories",
          element: <Categories />,
        },
        {
          path: "add-product",
          element: <AddProduct />,
        },
        {
          path: "product-list",
          element: <ProductList />,
        },
        {
          path: "product-grid",
          element: <ProductGrid />,
        },
        {
          path: "transaction-list",
          element: <TransactionList />,
        },
        {
          path: "transaction-detail",
          element: <TransactionDetail />,
        },
        {
          path: "seller-list",
          element: <SellerList />,
        },
        {
          path: "seller-detail",
          element: <SellerDetail />,
        },
        {
          path: "reviews",
          element: <Reviews />,
        },
        {
          path: "inbox",
          element: <Inbox />,
        },
        {
          path: "file-manager-list",
          element: <FileManagerList />,
        },
        {
          path: "file-manager-grid",
          element: <FileManagerGrid />,
        },
        {
          path: "chat",
          element: <Chat />,
        },
        {
          path: "calendar",
          element: <Calendar />,
        },
        {
          path: "point-of-sale",
          element: <PointOfSale />,
        },
        {
          path: "creative",
          element: <Creative />,
        },
        {
          path: "dynamic",
          element: <Dynamic />,
        },
        {
          path: "interactive",
          element: <Interactive />,
        },
        {
          path: "regular-table",
          element: <RegularTable />,
        },
        {
          path: "tabulator",
          element: <Tabulator />,
        },
        {
          path: "modal",
          element: <Modal />,
        },
        {
          path: "slideover",
          element: <Slideover />,
        },
        {
          path: "notification",
          element: <Notification />,
        },
        {
          path: "tab",
          element: <Tab />,
        },
        {
          path: "accordion",
          element: <Accordion />,
        },
        {
          path: "button",
          element: <Button />,
        },
        {
          path: "alert",
          element: <Alert />,
        },
        {
          path: "progress-bar",
          element: <ProgressBar />,
        },
        {
          path: "tooltip",
          element: <Tooltip />,
        },
        {
          path: "dropdown",
          element: <Dropdown />,
        },
        {
          path: "typography",
          element: <Typography />,
        },
        {
          path: "icon",
          element: <Icon />,
        },
        {
          path: "loading-icon",
          element: <LoadingIcon />,
        },
        {
          path: "regular-form",
          element: <RegularForm />,
        },
        {
          path: "datepicker",
          element: <Datepicker />,
        },
        {
          path: "tom-select",
          element: <TomSelect />,
        },
        {
          path: "file-upload",
          element: <FileUpload />,
        },
        {
          path: "wysiwyg-editor",
          element: <WysiwygEditor />,
        },
        {
          path: "validation",
          element: <Validation />,
        },
        {
          path: "chart",
          element: <Chart />,
        },
        {
          path: "slider",
          element: <Slider />,
        },
        {
          path: "image-zoom",
          element: <ImageZoom />,
        },
        {
          path: "investor-profile",
          element: <InvestersProfiles />,
          data: { titleName: "Investor Profile - ZMH Analytics" },
        },
        {
          path: "board-members",
          element: <BoardMembers />,
          data: { titleName: "Board Members - ZMH Analytics" },
        },
        {
          path: "company",
          element: <CompanyList />,
          data: { titleName: "Company - ZMH Analytics" },
        },
        {
          path: "investor-profile/:type/:id",
          element: <DetailInvestersProfile />,
          data: { titleName: "Investor Profile Detail - ZMH Analytics" },
        },
        {
          path: "engagement-question",
          element: <EngagementQuestion />,
          data: { titleName: "Engagement Question - ZMH Analytics" },
        },
        {
          path: "institution",
          element: <Institution />,
          data: { titleName: "Institution - ZMH Analytics" },
        },
        {
          path: "voting-guidelines",
          element: <ProxyVotingGuideline />,
          data: { titleName: "Voting Guidlines - ZMH Analytics" },
        },
        {
          path: "voting-guidelines/pdf-sumamry/:id",
          element: <ProxyVotingSummary />,
          data: { titleName: "Voting Guidlines Summary - ZMH Analytics" },
        },
        {
          path: "engagement-question/:id",
          element: <DetailEngagementQuesion />,
          data: { titleName: "Engagemnt Question Detail - ZMH Analytics" },
        },
        {
          path: "company/:id",
          element: <DetailCompany />,
          data: { titleName: "Company Detail - ZMH Analytics" },
        },
        {
          path: "institution/:id",
          element: <DetailInstitutions />,
          data: { titleName: "institution Detail - ZMH Analytics" },
        },
        {
          path: "institution/:id/documents",
          element: <InstitutionDocuments />,
          data: { titleName: "Institution Documents - ZMH Analytics" },
        },
        {
          path: "shareholder-proposal",
          element: <SharedHolder />,
          data: { titleName: "Shareholder Proposal - ZMH Analytics" },
        },
        {
          path: "shareholder-proposal/:id",
          element: <DetailShareHolder />,
          data: { titleName: "Shareholder Proposal Detail - ZMH Analytics" },
        },
        {
          path: "engagement-detail",
          element: <PeerAnalysis />,
          data: { titleName: "Engagement Details - ZMH Analytics" },
        },
        {
          path: "case-studies",
          element: <CaseStudies />,
          data: { titleName: "Case Studies - ZMH Analytics" },
        },
        {
          path: "case-studies/:id",
          element: <DetailCaseStudies />,
          data: { titleName: "Case Studies Detail - ZMH Analytics" },
        },
        {
          path: "investor-details",
          element: <InvestorCardDetails />,
          data: { titleName: "Investor Detail - ZMH Analytics" },
        },
        {
          path: "company-report",
          element: <CompanyReportPage />,
          data: { titleName: "Company Report" },
        },
        {
          path: "summary-details",
          element: <AgmSummaryDetails />,
          data: { titleName: "AGM Summary Detail - ZMH Analytics" },
        },
        {
          path: "vds-details",
          element: <VdsProxyVoting />,
          data: { titleName: "Proxy Voting - ZMH Analytics" },
        },
        {
          path: "vds-proxy-details",
          element: <VdsProxyVoting />,
          data: { titleName: "Proxy Voting - ZMH Analytics" },
        },
        {
          path: "voting-rationale",
          element: <VotingRationalePage />,
          data: { titleName: "Voting Rationale - ZMH Analytics" },
        },
        {
          path: "investor-company-details/:id",
          element: <InvestorCompanyDetails />,
          data: { titleName: "Investor Document Detail - ZMH Analytics" },
        },
        {
          path: "user-details",
          element: <UserDetails />,
          data: { titleName: "User Detail - ZMH Analytics" },
        },
        {
          path: "user-details/login-history/:id",
          element: <UserLoginHistory />,
          data: { titleName: "User Detail - ZMH Analytics" },
        },

        {
          path: "/notes",
          element: <Notes />,
          data: { titleName: "Notes - ZMH Analytics" },
        },
        {
          path: "npx-details",
          element: <NPXDetails />,
          data: { titleName: "N-PX - ZMH Analytics" },
        },
        {
          path: "npx-analytics",
          element: <NPXAnalyticsPage />,
          data: { titleName: "N-PX Analytics - ZMH Analytics" },
        },
        {
          path: "proxy-contest",
          element: <ProxyContest />,
          data: { titleName: "Proxy - Contest - ZMH Analytics" },
        },
        {
          path: "proxy-contest-detail/:companyId",
          element: <ProxyContestDetail />,
          data: { titleName: "Proxy Contest Details - ZMH Analytics" },
        },
          {
            path: "custom-reports",
            element: <CustomReports />,
            data: { titleName: "Custom Reports - ZMH Analytics" },
          },
        {
          path: "voting-data",
          element: <VdsEuropean />,
          data: { titleName: "Voting Data - ZMH Analytics" },
        },
        {
          path: "2025-shareholder-meetings",
          element: <RealTimeData />,
          data: { titleName: "2025 Shareholder Meetings - ZMH Analytics" },
        },
        {
          path: "user-management",
          element: <UserManagement />,
          data: { titleName: "User Management - ZMH Analytics" },
        }        
      ],
    },
    {
      path: "/landing-page",
      element: <LandingPage />,
    },
    {
      path: "/ai-search",
      element: <AISearchOnly />,
    },
    {
      path: "login",
      element: <Login />,
    },
    {
      path: "register",
      element: <Register />,
    },
    {
      path: "ai-chatbot",
      element: React.createElement(AiChatbot),
      children: [
    {
      path: "qa",
      element: <QAPage />,
      data: { titleName: "AI Assistant - ZMH Analytics" },
    },
    {
      path: "compare",
      element: <ComparePage />,
      data: { titleName: "AI Assistant - ZMH Analytics" },
    },
    {
      path: "voting-guidelines",
      element: <VotingGuidelinesPage />,
      data: { titleName: "AI Assistant - ZMH Analytics" },
    }]
  }
  ];

  return useRoutes(routes);
}

export default Router;
