import VdsProxyVotingTable from "./VdsProxyVotingTable";

interface VdsProxyVotingProps {
  view?: "voting-data" | "voting-rationale";
}

const index = ({ view }: VdsProxyVotingProps) => {
  return <VdsProxyVotingTable view={view} />;
};

export default index;
