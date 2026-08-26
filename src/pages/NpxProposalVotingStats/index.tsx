import { Navigate } from "react-router-dom";
import NpxInstitutionView from "@/pages/NPX/NpxInstitutionView";
import { useAppSelector } from "@/stores/hooks";

const NpxProposalVotingStatsPage = () => {
  const { user } = useAppSelector((state) => state.authentiction);

  if (user?.user_type !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return <NpxInstitutionView />;
};

export default NpxProposalVotingStatsPage;
