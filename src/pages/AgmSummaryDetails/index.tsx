import AGMSummaryCard from "@/components/AGMSummaryCard"
import { useAppSelector } from "@/stores/hooks";

const index = () => {
   const { companyGlobalSearchTicker, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );
  return (
    <div>
        <AGMSummaryCard  companyGlobalSearchTicker={companyGlobalSearchTicker} companyGlobalSearchName={companyGlobalSearchName} />
    </div>
  )
}

export default index