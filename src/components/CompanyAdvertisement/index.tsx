import dashboardMockup from "@/assets/images/zmh-images/zmh-dashboard.png";
import Lucide from "@/components/Base/Lucide";
import dashboardStats from "@/assets/images/zmh-images/dashboard-stats.png";
import dashboardTables from "@/assets/images/zmh-images/dashboard-tables.png";
import dashboardProfile from "@/assets/images/zmh-images/dashboard-profile.png";

const CompanyAdvertisement = () => {
  return (
    <div className=" text-white">
      <h1 className="text-3xl font-bold mb-4 tracking-wide">AI-Powered Engagement Insights</h1>

      <div className="mt-4 pl-5 border-l-2 border-white/30">
        <p className="text-[15px] italic text-white/90 leading-relaxed">
          <span className="font-semibold not-italic text-white">ZMH Advisors’ AI-powered Dashboard</span>
          {' '}transforms what used to take days into minutes — bringing together an unmatched breadth of ownership, voting, and governance data in one place. It surfaces the signals that matter, giving governance professionals the speed, clarity, and insight needed to anticipate investor behavior and act with confidence on virtually any governance issue.
        </p>
      </div>

      {/* <div className="mt-8">
        <iframe
          className="w-full lg:w-[90%] xl:w-[90%] 2xl:w-[80%] thumbnail-section"
          src="https://www.youtube.com/embed/JorKwO75Vx8"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div> */}
      {/* Original simple image block kept for backup
      <div className="overflow-hidden border border-gray-400/40 rounded-xl mt-8 p-3">
        <img
          src={dashboardMockup}
          alt="ZMH dashboard"
          className="w-3/4 rounded-xl object-contain"
          loading="eager"
          draggable={false}
        />
      </div>
      */}

      {/* TRH-style hero */}
      <div className="mt-8 relative border border-gray-400/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#040916ab] via-[#382e3fc7] to-[#7f0f32ab]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="h-[50px] max-w-[330px] relative top-[-5rem] right-6 ">
            <img 
              src={dashboardTables} 
              alt="Dashboard Tables" 
              className="w-full shadow-2xl rounded-lg object-cover"
              loading="eager"
              draggable={false}
            />
          </div>

          <div className="w-full lg:w-2/3 relative top-10 left-36">
            <img
              src={dashboardMockup}
              alt="ZMH dashboard"
              className="w-full shadow-2xl object-contain -mt-8 lg:-mt-12 max-h-[980px]"
              loading="eager"
              draggable={false}
            />
          </div>

          <div className="h-[45px] max-w-[330px] relative top-[-3rem] left-[25rem] p-2">
            <img 
              src={dashboardStats} 
              alt="Dashboard Stats" 
              className="w-full shadow-2xl rounded-lg object-cover"
              loading="eager"
              draggable={false}
            />
          </div>

          <div className="h-[45px] max-w-[330px] relative -top-[23rem] left-[32rem] -z-10 p-2">
            <img 
              src={dashboardProfile} 
              alt="Dashboard Profile" 
              className="w-full shadow-2xl rounded-lg object-cover"
              loading="eager"
              draggable={false}
            />
          </div>

          {/* Right: white floating chat card */}
          {/* <div className="hidden lg:block lg:w-1/4 relative z-20 lg:-mt-10 top-20 right-28">
            <div className="bg-white rounded-xl shadow-2xl p-3 max-w-sm">
              <h3 className="font-semibold text-slate-800 mb-1">ZMH Engagement Brief</h3>
              <p className="text-xs text-slate-600 mb-2">ZMH surfaces governance, filings and shareholder priorities so you can prepare for investor conversations quickly.</p>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-500">Data: ZMH Insights</div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default CompanyAdvertisement;
