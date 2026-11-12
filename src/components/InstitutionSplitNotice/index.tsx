import { useMemo } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";

// Stewardship entities that only exist from 2026 onward — BlackRock split
// into BAIS (1345)/BIS (1346) and Vanguard into VCM (999)/VPM (1000). For
// earlier years their parent institutions (BlackRock, Inc. / The Vanguard
// Group) hold the voting data.
export const POST_2026_INSTITUTION_IDS = [999, 1000, 1345, 1346];

export const POST_2026_INSTITUTION_NAMES = [
  "BlackRock Active Investment Stewardship (BAIS)",
  "BlackRock Investment Stewardship (BIS)",
  "Vanguard Capital Management",
  "Vanguard Portfolio Management",
];

export const POST_2026_SPLIT_YEAR = 2026;

interface InstitutionSplitNoticeProps {
  // Applied institution ids — the notice only matters when a post-2026
  // stewardship entity is selected.
  institutionIds?: Array<string | number>;
  // Applied institution names — for modules that store names rather than ids.
  institutionNames?: string[];
  // Applied Year selections (e.g. ["2026", "2025"]).
  years?: Array<string | number>;
  // Applied date range string; any 4-digit year inside is checked.
  dateRange?: string;
  className?: string;
}

// Shows an info banner when a post-2026 stewardship institution is applied
// together with a pre-2026 year/date range — those entities have no data
// before the split, so the user should include the parent institutions.
const InstitutionSplitNotice: React.FC<InstitutionSplitNoticeProps> = ({
  institutionIds = [],
  institutionNames = [],
  years = [],
  dateRange = "",
  className,
}) => {
  const visible = useMemo(() => {
    const selectedIds = new Set(institutionIds.map(String));
    const nameSet = new Set(
      POST_2026_INSTITUTION_NAMES.map((n) => n.toLowerCase())
    );
    const hasSplitInstitution =
      POST_2026_INSTITUTION_IDS.some((id) => selectedIds.has(String(id))) ||
      institutionNames.some((n) => nameSet.has(String(n || "").toLowerCase()));
    if (!hasSplitInstitution) {
      return false;
    }
    return (
      years.some((y) => Number(y) < POST_2026_SPLIT_YEAR) ||
      (String(dateRange).match(/\b(19|20)\d{2}\b/g) || []).some(
        (y) => Number(y) < POST_2026_SPLIT_YEAR
      )
    );
  }, [institutionIds, institutionNames, years, dateRange]);

  if (!visible) return null;

  return (
    <div
      className={clsx(
        "mb-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800",
        className
      )}
    >
      <Lucide icon="Info" className="w-4 h-4 mt-0.5 shrink-0" />
      <span>
        BlackRock and Vanguard data splits into separate stewardship teams starting {POST_2026_SPLIT_YEAR}.
        For earlier years, include <strong>BlackRock, Inc.</strong> and <strong>The Vanguard Group</strong> to
        see these institutions' historical voting data.
      </span>
    </div>
  );
};

export default InstitutionSplitNotice;
