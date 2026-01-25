import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";

interface KeyTakeawaysSectionProps {
  data: {
    company_name?: string;
    ticker?: string;
    [key: string]: any;
  };
  sharePriceData?: any;
  ownershipData?: any[];
  chartsData?: any;
  spData?: any[];
}

const KeyTakeawaysSection = ({ 
  data, 
  sharePriceData, 
  ownershipData, 
  chartsData,
  spData 
}: KeyTakeawaysSectionProps) => {
  const takeaways: string[] = [];

  // Generate dynamic takeaways based on data
  if (sharePriceData) {
    const oneYearReturn = parseFloat(sharePriceData.one_year_return?.replace('%', '') || '0');
    if (oneYearReturn > 0) {
      takeaways.push(`Good/Bad Uptrend: If Share price performance is below Finding and S&P500 for all periods consider`);
    }
  }

  if (ownershipData && ownershipData.length > 0) {
    takeaways.push(`Investors that express proxy advisor influence analysis`);
  }

  if (chartsData) {
    takeaways.push(`Note if shares are declining that voted against election of directors and SOP`);
    takeaways.push(`Overall support for Election of Directors, SOP, shareholder proposals`);
  }

  if (spData && spData.length > 0) {
    takeaways.push(`Key themes of engagement in the company and where in the sector`);
  }

  // Default takeaways if none generated
  if (takeaways.length === 0) {
    takeaways.push('Company research report generated successfully');
  }

  return (
    <section className="mb-6 page-break-inside-avoid">
      <div className="flex items-center gap-3 mb-3">
        <img src={zmhLogo} alt="ZMH Logo" className="h-5 w-auto" />
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-1 flex-1">
          Key Takeaways to be Printed on the end
        </h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          {takeaways.map((takeaway, index) => (
            <li key={index}>{takeaway}</li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default KeyTakeawaysSection;
