import { Link, Outlet, useLocation } from "react-router-dom";
import { MessageSquare, GitCompare, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function DashboardLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navItems = [
    { icon: MessageSquare, label: "AI Assistant", path: "/ai-chatbot/qa" },
    { icon: GitCompare, label: "Compare", path: "/ai-chatbot/compare" },
    { icon: GitCompare, label: "Voting Guidelines", path: "/ai-chatbot/voting-guidelines" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-black">
      {/* Sidebar */}
      <aside className={`border-r border-[#931638] bg-gray-50 hidden md:flex flex-col transition-all duration-300 ease-in-out ${
        // Set to w-24 (96px) to comfortably fit the large logo when collapsed
        isCollapsed ? "w-24" : "w-64"
      }`}>

        {/* Header Area */}
        {/* FIXED: Set fixed height h-24 (96px) so the border line never jumps up/down */}
        <div className={`h-24 flex-none border-b border-[#931638] flex items-center transition-all duration-300 ${
          isCollapsed ? "px-2 justify-start" : "px-6 justify-between"
        }`}>
          {/* Logo */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex items-center hover:opacity-80 transition-all duration-300 ${
               // Align left when collapsed
               isCollapsed ? "justify-start pl-2" : "justify-start"
            }`}
          >
            <img 
              src="/logo_small.jpg" 
              alt="PDF Mind" 
              className={`object-contain transition-all duration-300 ease-in-out ${
                // RESTORED: Large size (h-16), Zoomed (scale-110), Anchored Left (origin-left)
                isCollapsed 
                  ? "h-16 w-16 scale-110 origin-left" 
                  : "h-20 w-auto"
              }`}
            />
          </button>
          
          {/* Collapse arrow button */}
          <div className={`transition-opacity duration-200 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
             <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors ml-auto"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive 
                    ? "bg-[#931638] text-white shadow-lg shadow-[#931638]/20" 
                    : "text-gray-700 hover:text-black hover:bg-gray-200"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                {/* Icon wrapper to keep it stable */}
                <div className="shrink-0 flex items-center justify-center">
                    <item.icon size={20} />
                </div>
                
                <span className={`transition-all duration-300 ease-in-out origin-left ${
                  isCollapsed ? "opacity-0 w-0 scale-0 hidden" : "opacity-100 w-auto scale-100"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Expand button */}
        {isCollapsed && (
          <div className="p-4 border-t border-[#931638] animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-black hover:bg-gray-200 transition-all duration-200"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-[#931638] flex items-center px-6 bg-white/90 backdrop-blur-md">
          <h2 className="font-semibold text-lg text-black">
            {navItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
          </h2>
        </header>

        <div className="flex-1 overflow-auto py-4 bg-white">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500 px-4">
            <Outlet /> 
          </div>
        </div>
      </main>
    </div>
  );
}