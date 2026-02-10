import { Link, Outlet, useLocation } from "react-router-dom";
import { Upload, MessageSquare, FileText, LayoutDashboard, GitCompare, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function DashboardLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navItems = [
   // { icon: Upload, label: "Upload PDF", path: "/upload" },
    //{ icon: FileText, label: "Summaries", path: "/summary" },
    { icon: MessageSquare, label: "AI Assistant", path: "/ai-chatbot/qa" },
    { icon: GitCompare, label: "Compare", path: "/ai-chatbot/compare" },
   // { icon: FileText, label: "Summaries", path: "/summary" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-black">
      {/* Sidebar */}
      <aside className={`border-r border-[#931638] bg-gray-50 hidden md:flex flex-col transition-all duration-500 ease-out ${
        isCollapsed ? "w-[72px]" : "w-64"
      }`}>

        <div className="p-6 border-b border-[#931638] flex items-center justify-between">
          {/* Logo - clickable to toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logo_small.jpg" 
              alt="PDF Mind" 
              className="h-20 object-contain"
            />
          </button>
          
          {/* Collapse arrow button */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-[#931638] text-white shadow-lg shadow-[#931638]/20" 
                    : "text-gray-700 hover:text-black hover:bg-gray-200"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                <item.icon size={18} />
                <span className={`transition-all duration-500 ease-out ${
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="p-4 border-t border-[#931638]">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center p-3 rounded-lg text-gray-700 hover:text-black hover:bg-gray-200 transition-all duration-200"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-10 border-b border-[#931638] flex items-center px-6 bg-white/90 backdrop-blur-md justify-between">
          <h2 className="font-semibold text-lg text-black">
            {navItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
          </h2>
        </header>

        {/* Page Content injected here */}
        <div className="flex-1 overflow-auto py-4 bg-white">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <Outlet /> 
          </div>
        </div>
      </main>
    </div>
  );
}