import React, { useRef, useState } from "react";
import Lucide from "@/components/Base/Lucide";
import ActivistFilingsTable from "@/pages/AIChatbot/ActivistFilingsTable";
import { uploadAdvBrochure } from "@/pages/AIChatbot/api";

const THEME_MAROON = "#8b1828";

// Form ADV Part 2 brochures are text-heavy filings, rarely more than a few MB.
// The cap exists to fail fast in the browser on an obviously wrong file rather
// than after a long upload the backend would reject anyway.
const MAX_BROCHURE_MB = 25;
const MAX_BROCHURE_BYTES = MAX_BROCHURE_MB * 1024 * 1024;

// ─── Local helpers — deliberately duplicated rather than imported, so this
// panel has zero coupling to InvestorCard/ActivistDashboard internals. ───────

// SEC figures are US dollars and must group US-style. Left to the browser's
// default locale, an en-IN machine renders 266000 as "2,66,000" (lakh/crore
// grouping), so the locale is pinned rather than inherited.
const NUMBER_LOCALE = "en-US";

const formatLargeUSD = (value: any) => {
  if (!value) return "N/A";
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) return "N/A";
  if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
  if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(0)}M`;
  if (numValue >= 1e3) return `$${(numValue / 1e3).toFixed(0)}K`;
  return `$${numValue.toLocaleString(NUMBER_LOCALE)}`;
};

const formatUSDThousands = (thousands: any) => {
  if (!thousands) return "N/A";
  return formatLargeUSD(Number(thousands) * 1000);
};

// h.note on a 13F holding is a full sentence, e.g. "INDUSTRIALS /
// CONSTRUCTION & ENGINEERING; 23.34% of reported 13F portfolio." — the
// percent-of-portfolio figure is embedded in there, not the whole string.
// Pull just the number out (dynamically, per row) rather than displaying
// the sentence or naively appending a "%".
const formatPortfolioPercent = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `${value.toFixed(2)}%`;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? `${match[1]}%` : "—";
};

const formatDate = (value: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const ABBREVIATIONS = /\b(?:[A-Z]|U\.S|Inc|Corp|Ltd|L\.P|LLC|Co|St|Mr|Mrs|Ms|Dr|vs|etc)\.$/;

// Re-merges any split that landed right after a known abbreviation (so
// "U.S. public companies" or "...with Mr. Ferguson..." stays one sentence),
// regardless of which splitter produced the raw parts. Both branches of
// splitIntoSentences below call this instead of each doing their own
// re-merge pass, so they can't drift apart on abbreviation handling again —
// the Intl.Segmenter branch used to skip this entirely, which is exactly
// what let "...with Mr." / "Ferguson also managing..." split in two.
const mergeAbbreviationSplits = (parts: string[]): string[] => {
  const sentences: string[] = [];
  for (const part of parts) {
    const prev = sentences[sentences.length - 1];
    if (prev && ABBREVIATIONS.test(prev)) {
      sentences[sentences.length - 1] = `${prev} ${part}`;
    } else {
      sentences.push(part);
    }
  }
  return sentences.map((s) => s.trim()).filter(Boolean);
};

const splitIntoSentences = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (typeof Intl !== "undefined" && typeof (Intl as any).Segmenter === "function") {
    const segmenter = new (Intl as any).Segmenter("en", { granularity: "sentence" });
    const rawParts: string[] = [];
    for (const { segment } of segmenter.segment(trimmed)) {
      const s = String(segment).trim();
      if (s) rawParts.push(s);
    }
    return mergeAbbreviationSplits(rawParts);
  }

  // Fallback: split after ./!/? + whitespace when followed by a capital
  // letter or opening paren, then re-merge via the same abbreviation pass
  // as the Intl.Segmenter branch above.
  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z(])/);
  return mergeAbbreviationSplits(parts);
};

// Groups sentences into 2-3 bullets of roughly-equal character length. Very
// short text (1-2 sentences total) is left as a single bullet rather than
// forcing an artificial split, so we never create empty/near-empty bullets.
const groupSentencesIntoBullets = (sentences: string[]): string[] => {
  if (sentences.length <= 2) {
    return sentences.length ? [sentences.join(" ")] : [];
  }

  const targetBulletCount = sentences.length >= 5 ? 3 : 2;
  const totalLength = sentences.reduce((sum, s) => sum + s.length, 0);
  const targetLength = totalLength / targetBulletCount;

  const bullets: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  sentences.forEach((sentence, i) => {
    current.push(sentence);
    currentLength += sentence.length;

    const isLast = i === sentences.length - 1;
    const remainingBulletsToFill = targetBulletCount - bullets.length - 1;
    const remainingSentences = sentences.length - (i + 1);

    // Close out the current bullet once it has reached its target share of
    // the text — but only if enough sentences remain to fill the rest of
    // the target bullets (otherwise keep accumulating into this one).
    if (!isLast && remainingBulletsToFill > 0 && remainingSentences >= remainingBulletsToFill && currentLength >= targetLength) {
      bullets.push(current.join(" "));
      current = [];
      currentLength = 0;
    }
  });

  if (current.length) bullets.push(current.join(" "));
  return bullets;
};
const renderTextAsBullets = (text: string | null | undefined) => {
  if (!text) return null;
  const normalized = text
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const sentences = splitIntoSentences(normalized);
  if (sentences.length === 0) return null;

  const bullets = groupSentencesIntoBullets(sentences);
  if (bullets.length <= 1) {
    return <p className="m-0 text-slate-700">{bullets[0] ?? normalized}</p>;
  }

  return (
    <ul className="pl-5 m-0 list-disc text-slate-700 flex flex-col gap-2">
      {bullets.map((bullet, i) => (
        <li key={i}>{bullet}</li>
      ))}
    </ul>
  );
};

const Badge = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-slate-100 border border-slate-200 px-3 py-1">
    <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
    <div className="text-sm font-bold text-slate-800 mt-1">{value}</div>
  </div>
);

// ─── Per-section "unavailable" fallback ──────────────────────────────────────

// `message` overrides the default "<label> unavailable" wording for sections
// where an empty result is a plain fact rather than a failure to report.
const UnavailableNotice = ({
  label,
  error,
  message,
}: {
  label: string;
  error?: string | null;
  message?: string;
}) => (
  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-start gap-3">
    <Lucide icon="AlertCircle" className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-semibold text-slate-600">{message || `${label} unavailable`}</p>
      {error && <p className="text-xs text-slate-500 mt-1">{error}</p>}
    </div>
  </div>
);

const SectionCard = ({
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  bare = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  // Drops the card entirely — no border, no title row, no icon, no chevron —
  // and always shows the body. Used when the section IS the tab panel: the tab
  // already names it, and a collapsible chevron there would let the reader fold
  // away the only thing on screen. It also has to override defaultOpen, since
  // three of these sections default to closed and would otherwise open onto an
  // empty panel.
  bare?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = bare || !collapsible || open;

  if (bare) return <>{children}</>;

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm">
      <div
        className={`flex items-center gap-2 px-6 pt-6 ${showBody ? "pb-3" : "pb-6"} ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <Lucide icon={icon as any} className="w-5 h-5 text-red-800" />
        <h3 className="text-base font-bold text-slate-800 flex-1">{title}</h3>
        {collapsible && (
          <Lucide
            icon="ChevronDown"
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>
      {showBody && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};

// Company website / LinkedIn / etc. — a collapsible list of the raw URLs, one
// per row, embedded inline under the WhaleWisdom summary rather than as its
// own SectionCard. The anchor text is the full URL rather than a title, so
// the destination is visible without hovering; the same URL arriving twice
// from the API collapses into a single row.
const LinksSection = ({ section, inCard = false }: { section: any; inCard?: boolean }) => {
  const [open, setOpen] = useState(true);

  if (!inCard && (!section || section.status !== "ok")) {
    return <UnavailableNotice label="Relevant links" error={section?.error} />;
  }

  const links = section?.firm_links;
  const urls: string[] = [];
  (Array.isArray(links) ? links : []).forEach((link: any) => {
    const raw = link?.url || link?.link;
    const url = typeof raw === "string" ? raw.trim() : "";
    if (url && !urls.includes(url)) urls.push(url);
  });

  // Inside the card an empty list stays invisible, exactly as before. As a tab
  // of its own it has to say something -- the tab always exists, so an empty
  // one would otherwise read as a failed load.
  if (urls.length === 0) {
    return inCard ? null : <p className="text-sm text-slate-500 m-0">No links available.</p>;
  }

  const list = (
    <ul className={`p-0 m-0 list-none flex flex-col gap-2 ${inCard ? "pb-4" : ""}`}>
      {urls.map((url: string, i: number) => (
        <li key={i} className="flex items-start">
          <span className="text-red-800 mr-2 text-base leading-none">▸</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 text-sm text-blue-700 no-underline font-medium hover:underline break-all leading-relaxed"
          >
            {url}
          </a>
        </li>
      ))}
    </ul>
  );

  // Standalone: no heading row and no chevron -- the tab is the heading, and
  // the negative margins below only make sense against the card's padding.
  if (!inCard) return list;

  return (
    <div className="border-t border-slate-100 mt-4 -mx-6 px-6">
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-2">
          <Lucide icon="Link" className="w-5 h-5 text-red-800" />
          <h4 className="text-sm font-bold text-slate-800">Relevant Links</h4>
        </div>
        <Lucide
          icon="ChevronDown"
          className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && list}
    </div>
  );
};

// Simple bulleted sub-section for owners / known_email_addresses — only
// rendered when the array actually has entries (empty is expected, not an
// error, so it renders nothing at all rather than a placeholder).
// `boxed` matches Overview's text-base + bg-slate-50 card treatment (used
// for Owners, per instructions); Known Email Addresses stays the plain,
// smaller default.
const BulletList = ({ heading, items, boxed = false }: { heading: string; items: any[]; boxed?: boolean }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const list = (
    <ul className={`pl-5 m-0 list-disc text-slate-700 flex flex-col gap-1 ${boxed ? "text-base" : "text-sm"}`}>
      {items.map((item: any, i: number) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );

  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-slate-800 mb-2">{heading}</h4>
      {boxed ? (
        <div className="bg-slate-50 p-4 rounded-md border border-slate-100">{list}</div>
      ) : (
        list
      )}
    </div>
  );
};

// ─── Sections ─────────────────────────────────────────────────────────────

// ── Combined-profile per-entity shape ─────────────────────────────────────
// The same rule HoldingsSection follows for per_filer[]: the combined shape is
// detected from the PRESENCE of the array, never from the profile-level
// is_combination flag. There is more than one combine path on the backend and
// they don't emit identical shapes, and profiles stored before per_entity
// existed carry none at all. No per_entity[] means the flat rendering below
// runs exactly as it does today.
const getPerEntity = (section: any): any[] =>
  Array.isArray(section?.per_entity) ? section.per_entity.filter(Boolean) : [];

// Every field name this UI reads off an entity lives here, so aligning with the
// backend contract is one edit rather than a hunt through four sections.
const entityLabel = (entity: any, index: number): string =>
  entity?.entity_name || entity?.entity || entity?.name || entity?.filer ||
  entity?.investor_name || `Entity ${index + 1}`;

const entityBrochureUrl = (entity: any): string =>
  entity?.adv_brochure_url_manual || entity?.adv_brochure_url || entity?.brochure_url || "";

// Entity names stamped on a flat item (a filing, a letter). An item can name
// several — a 13D co-filed by three entities belongs to all three.
const itemEntityNames = (item: any): string[] => {
  const raw = item?.entities ?? item?.source_entities ?? item?.entity ?? item?.filer;
  if (Array.isArray(raw)) {
    return raw
      .map((x: any) => (typeof x === "string" ? x : entityLabel(x, 0)))
      .filter((n: string) => !!n && n.trim().length > 0);
  }
  return typeof raw === "string" && raw.trim() ? [raw.trim()] : [];
};

// Splits a section's flat items across per_entity[]. Two backend shapes are
// accepted: the entity nesting its own items (nestedKeys), or the flat items
// each naming their entities. An item naming several appears under each.
//
// Returns [] when per_entity is absent OR when nothing at all landed in a
// group, so a mismatch between this and whatever the backend actually emits
// degrades to today's flat rendering rather than to a column of empty headings.
const groupByEntity = <T,>(
  section: any,
  items: T[],
  nestedKeys: string[]
): { label: string; items: T[] }[] => {
  const entities = getPerEntity(section);
  if (entities.length === 0) return [];

  const groups = entities.map((entity, i) => {
    const label = entityLabel(entity, i);
    const nested = nestedKeys.map((k) => entity?.[k]).find((v) => Array.isArray(v));
    if (nested) return { label, items: nested as T[] };

    const wanted = label.trim().toLowerCase();
    return {
      label,
      items: items.filter((item) =>
        itemEntityNames(item).some((n) => n.trim().toLowerCase() === wanted)
      ),
    };
  });

  return groups.some((g) => g.items.length > 0) ? groups : [];
};

// The per-filer header treatment the 13F tab already uses, so a grouped
// Overview / Brochure / Filings / Letters tab reads as the same thing.
const EntityGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-md p-3">
    <h5 className="text-sm font-bold text-slate-800 m-0 mb-2 flex items-center gap-2">
      <Lucide icon="Building2" className="w-4 h-4 text-red-800 shrink-0" />
      {label}
    </h5>
    {children}
  </div>
);

// ── whalewisdom_overview, split four ways ─────────────────────────────────
// Overview / Owners / Links / Brochure are separate components so each can be
// a tab of its own, but all four read the SAME section object
// (sections.whalewisdom_overview) and write back through the SAME callback.
// None of them copies `section` into local state: every edit spreads the live
// prop ({...section, field}), so an edit made on one tab can't be reverted by
// a stale snapshot held by another. The parent's basicProfile is the single
// source of truth. In particular the brochure keeps writing
// adv_brochure_url_manual onto this same object -- a section key of its own
// would look like it worked and be dropped on Save.
//
// `inCard` means "rendered inside the stacked Investor Overview card", which is
// what the preview modal still shows: the card supplies the heading and the
// px-6 padding that these blocks break out of with -mx-6. Without it they are
// standalone tab panels, so they carry their own unavailable/empty states and
// drop the breakout margins.

const BrochureSection = ({
  section,
  slug,
  isEditMode,
  onChange,
  inCard = false,
}: {
  section: any;
  slug?: string;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  inCard?: boolean;
}) => {
  // Closed inside the stacked card, where it's one row among many and opening
  // every profile with a 600px PDF would bury everything under it. Open when
  // standalone: the brochure IS the tab, so leaving it collapsed means the tab
  // opens on nothing but its own header row.
  const [showBrochure, setShowBrochure] = useState(!inCard);
  const [showBrochureUploader, setShowBrochureUploader] = useState(false);
  const [brochureUrlDraft, setBrochureUrlDraft] = useState("");
  const [brochureError, setBrochureError] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const brochureFileInputRef = useRef<HTMLInputElement>(null);

  // Both attach paths (uploaded file, pasted link) land here. The URL goes to
  // adv_brochure_url_manual, never adv_brochure_url: the latter is derived
  // from IAPD and gets overwritten every time the profile is regenerated or
  // republished, which would silently throw away whatever was attached here.
  // As with every other edit in this panel it only touches the in-memory
  // draft — nothing is persisted until the dashboard's Save runs.
  const applyBrochureUrl = (url: string) => {
    onChange({ ...section, adv_brochure_url_manual: url });
    setShowBrochureUploader(false);
    setBrochureUrlDraft("");
    setBrochureError(null);
    setShowBrochure(true);
  };

  const handleBrochureFile = async (file: File) => {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setBrochureError(`"${file.name}" isn't a PDF — the brochure has to be a PDF file.`);
      return;
    }
    if (file.size > MAX_BROCHURE_BYTES) {
      setBrochureError(
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_BROCHURE_MB}MB.`
      );
      return;
    }

    setBrochureError(null);
    setUploadingFileName(file.name);
    try {
      applyBrochureUrl(await uploadAdvBrochure(file, slug));
    } catch (err: any) {
      console.error("Brochure upload failed:", err);
      setBrochureError(err?.message || "Upload failed.");
    } finally {
      setUploadingFileName(null);
    }
  };

  const handleBrochureUrlSubmit = () => {
    const trimmed = brochureUrlDraft.trim();
    if (!trimmed) return;
    // The value goes straight into an <iframe src>, so require a real http(s)
    // link rather than accepting whatever happened to be pasted.
    if (!/^https?:\/\//i.test(trimmed)) {
      setBrochureError("Enter a full link starting with http:// or https://");
      return;
    }
    applyBrochureUrl(trimmed);
  };

  if (!inCard && (!section || section.status !== "ok")) {
    return <UnavailableNotice label="ADV brochure" error={section?.error} />;
  }

  // A manually attached brochure wins over the IAPD-derived one: it's the
  // deliberate choice someone made in Edit Mode, and it's the only one of the
  // two that survives a regenerate.
  const brochureUrl = section?.adv_brochure_url_manual || section?.adv_brochure_url;

  // On a combination the flat field above holds only ONE entity's brochure —
  // the others are stored on per_entity and were invisible here. Read side
  // only: Edit Mode still attaches to the single adv_brochure_url_manual, so it
  // keeps the flat row below rather than growing per-entity upload controls.
  // Entities without a brochure are left out entirely, not given an empty row.
  const entityBrochures = isEditMode
    ? []
    : getPerEntity(section)
        .map((entity, i) => ({ label: entityLabel(entity, i), url: entityBrochureUrl(entity) }))
        .filter((e) => !!e.url);

  if (entityBrochures.length > 0) {
    return (
      <div className={inCard ? "border-t border-slate-100 mt-4 -mx-6 px-6" : ""}>
        <div className={`flex items-center gap-2 ${inCard ? "py-4" : "mb-3"}`}>
          <Lucide icon="FileText" className="w-5 h-5 text-red-800" />
          <h4 className="text-sm font-bold text-slate-800">SEC Form ADV Part 2 Brochure</h4>
        </div>
        <div className={`flex flex-col gap-3 ${inCard ? "pb-4" : ""}`}>
          {entityBrochures.map((entity, i) => (
            <EntityGroup key={`${entity.label}-${i}`} label={entity.label}>
              <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-100 shadow-inner">
                <iframe
                  src={entity.url}
                  width="100%"
                  height="600px"
                  title={`SEC Brochure PDF — ${entity.label}`}
                  className="w-full"
                />
              </div>
            </EntityGroup>
          ))}
        </div>
      </div>
    );
  }

  // Nothing to show and no way to add one. Inside the card that means the row
  // simply isn't there, unchanged; as a tab it needs to say so, because the tab
  // is rendered either way.
  if (!brochureUrl && !isEditMode) {
    return inCard ? null : (
      <p className="text-sm text-slate-500 m-0">
        No brochure attached — turn on Edit Mode to attach one.
      </p>
    );
  }

  return (
    <div className={inCard ? "border-t border-slate-100 mt-4 -mx-6 px-6" : ""}>
          <div
            onClick={() => {
              // Only a row that actually has a PDF behind it toggles.
              if (brochureUrl) setShowBrochure((v) => !v);
            }}
            className={`flex items-center justify-between py-4 transition-all ${
              brochureUrl ? "cursor-pointer hover:bg-slate-50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Lucide icon="FileText" className="w-5 h-5 text-red-800" />
              <h4 className="text-sm font-bold text-slate-800">SEC Form ADV Part 2 Brochure</h4>
            </div>
            <div className="flex items-center gap-3">
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBrochureUploader((v) => !v);
                    setBrochureError(null);
                  }}
                  title={brochureUrl ? "Replace this brochure" : "Attach a brochure"}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-800 border border-red-200 rounded px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                >
                  <Lucide icon="Upload" className="w-3.5 h-3.5" />
                  {brochureUrl ? "Replace Brochure" : "Upload Brochure"}
                </button>
              )}
              {isEditMode && brochureUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Clears both fields so the row empties immediately —
                    // dropping only the manual override would re-reveal the
                    // IAPD-derived URL, which reads as a broken delete.
                    //
                    // Only the derived URL actually stays cleared on Save,
                    // though: basic/publish (_merge_manual_brochure) reads a
                    // null adv_brochure_url_manual as "the payload didn't
                    // carry one" and restores the stored value, so an
                    // uploaded brochure comes back on the next load. Removing
                    // one for good needs a clear path on the backend.
                    onChange({ ...section, adv_brochure_url_manual: null, adv_brochure_url: null });
                    setShowBrochure(false);
                  }}
                  title="Remove this brochure"
                  className="text-slate-400 hover:text-red-800 transition-colors"
                >
                  <Lucide icon="Trash2" className="w-4 h-4" />
                </button>
              )}
              {brochureUrl && (
                <Lucide
                  icon="ChevronDown"
                  className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showBrochure ? "rotate-180" : ""}`}
                />
              )}
            </div>
          </div>

          {isEditMode && showBrochureUploader && (
            <div className="pb-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDropTarget(true);
                }}
                onDragLeave={() => setIsDropTarget(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDropTarget(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleBrochureFile(dropped);
                }}
                className={`rounded-md border-2 border-dashed p-5 text-center transition-colors ${
                  isDropTarget ? "border-red-800 bg-red-50" : "border-slate-300 bg-slate-50"
                }`}
              >
                <input
                  ref={brochureFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    // Cleared so picking the same file twice in a row (e.g.
                    // after a failed upload) still fires onChange.
                    e.target.value = "";
                    if (picked) handleBrochureFile(picked);
                  }}
                />
                <Lucide icon="UploadCloud" className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 m-0">
                  <button
                    type="button"
                    onClick={() => brochureFileInputRef.current?.click()}
                    disabled={!!uploadingFileName}
                    className="font-semibold text-red-800 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    Choose a PDF
                  </button>{" "}
                  or drag one here
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-0">PDF only, up to {MAX_BROCHURE_MB}MB</p>
                {uploadingFileName && (
                  <p className="text-xs text-slate-500 mt-3 mb-0 flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-red-800 animate-spin" />
                    Uploading {uploadingFileName}…
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] uppercase tracking-wide text-slate-400">or</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={brochureUrlDraft}
                  onChange={(e) => setBrochureUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBrochureUrlSubmit();
                    }
                  }}
                  placeholder="Paste a link to the brochure PDF"
                  className="flex-1 text-sm text-slate-800 border border-slate-300 rounded px-2.5 py-2 bg-white focus:border-red-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrochureUrlSubmit}
                  disabled={!brochureUrlDraft.trim() || !!uploadingFileName}
                  className="text-xs font-semibold text-white rounded px-3 py-2 transition-opacity disabled:opacity-40"
                  style={{ background: THEME_MAROON }}
                >
                  Add
                </button>
              </div>

              {brochureError && <p className="text-xs text-red-700 mt-2 mb-0">{brochureError}</p>}
            </div>
          )}

          {brochureUrl && showBrochure && (
            <div className="pb-4">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-100 shadow-inner">
                <iframe src={brochureUrl} width="100%" height="600px" title="SEC Brochure PDF" className="w-full" />
              </div>
            </div>
          )}
    </div>
  );
};

const OverviewSection = ({
  section,
  isEditMode,
  onChange,
  inCard = false,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  inCard?: boolean;
}) => {
  if (!inCard && (!section || section.status !== "ok")) {
    return <UnavailableNotice label="Investor overview" error={section?.error} />;
  }

  const bodyText = section.ai_enriched_summary || section.summary;
  // Edit whichever field actually holds the text — ai_enriched_summary when
  // present, otherwise the plain summary — same precedence as bodyText above.
  const summaryField = section.ai_enriched_summary != null ? "ai_enriched_summary" : "summary";
  const summaryValue = section[summaryField] ?? "";

  // One block per source entity when the combined profile carries its
  // entities' own text. Read side only (Edit Mode edits the flat field below,
  // as before), and any entity that yields no text at all is dropped, so an
  // empty per_entity[] or one that doesn't carry text falls through to the
  // flat rendering rather than showing bare headings. A /merge-built profile
  // has a deliberately blended single summary and no per-entity text, so it
  // takes that fallback by design.
  const entityOverviews = isEditMode
    ? []
    : getPerEntity(section)
        .map((entity, i) => ({
          label: entityLabel(entity, i),
          summary: entity?.ai_enriched_summary || entity?.summary || "",
          business: entity?.business_description || "",
          strategy: entity?.investment_strategy || "",
        }))
        .filter((e) => e.summary || e.business || e.strategy);

  if (entityOverviews.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        {/* Profile-level, not per entity — kept above the groups so a combined
            profile doesn't silently lose it. */}
        {section.proxy_influence && (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge label="Proxy Influence" value={section.proxy_influence} />
          </div>
        )}
        {entityOverviews.map((entity, i) => (
          <EntityGroup key={`${entity.label}-${i}`} label={entity.label}>
            <div className="flex flex-col gap-3">
              {entity.summary && (
                <div className="text-slate-600 text-base leading-relaxed">
                  {renderTextAsBullets(entity.summary)}
                </div>
              )}
              {entity.business && (
                <div>
                  <h6 className="text-xs font-bold text-slate-800 mb-1 uppercase tracking-wide">Business Description</h6>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    {renderTextAsBullets(entity.business)}
                  </div>
                </div>
              )}
              {entity.strategy && (
                <div>
                  <h6 className="text-xs font-bold text-slate-800 mb-1 uppercase tracking-wide">Investment Strategy</h6>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    {renderTextAsBullets(entity.strategy)}
                  </div>
                </div>
              )}
            </div>
          </EntityGroup>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Region and CIK badges removed — the region is already stated in the
          overview text below, and the CIK number is not something this view
          needs to lead with. The row only renders now when a profile actually
          carries a proxy-influence rating. */}
      {section.proxy_influence && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Badge label="Proxy Influence" value={section.proxy_influence} />
        </div>
      )}

      {isEditMode ? (
        <textarea
          value={summaryValue}
          onChange={(e) => onChange({ ...section, [summaryField]: e.target.value })}
          rows={7}
          placeholder="Investor overview text…"
          className="w-full text-base leading-relaxed text-slate-700 bg-white p-4 rounded-md border border-slate-300 focus:border-red-800 focus:outline-none resize-y"
        />
      ) : (
        <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
          {renderTextAsBullets(bodyText) || <p className="text-slate-500 m-0">No overview text available.</p>}
        </div>
      )}

      {/* investment_strategy is a genuinely separate field from summary
          (not an alternate phrasing of it) — its own labeled sub-section.
          Same text-base + boxed-card treatment as the Overview paragraph
          above, so both read as one consistent visual unit rather than
          Overview looking like a card and this floating below it as plain text. */}
      {isEditMode ? (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
          <textarea
            value={section.investment_strategy || ""}
            onChange={(e) => onChange({ ...section, investment_strategy: e.target.value })}
            rows={5}
            placeholder="Investment strategy…"
            className="w-full text-base leading-relaxed text-slate-700 bg-white p-4 rounded-md border border-slate-300 focus:border-red-800 focus:outline-none resize-y"
          />
        </div>
      ) : (
        section.investment_strategy && (
          <div className="mt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
            <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
              {renderTextAsBullets(section.investment_strategy)}
            </div>
          </div>
        )
      )}
    </>
  );
};

const OwnersSection = ({
  section,
  isEditMode,
  onChange,
  inCard = false,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  inCard?: boolean;
}) => {
  if (!inCard && (!section || section.status !== "ok")) {
    return <UnavailableNotice label="Owners" error={section?.error} />;
  }

  const owners = section?.owners;
  const emails = section?.known_email_addresses;
  const hasOwners = Array.isArray(owners) && owners.length > 0;
  const hasEmails = Array.isArray(emails) && emails.length > 0;

  // BulletList renders nothing at all when its array is empty. That's right
  // inside the shared card, where the neighbouring blocks still fill it, and
  // wrong as a tab of its own, which would open on blank space.
  if (!inCard && !hasOwners && !hasEmails) {
    return <p className="text-sm text-slate-500 m-0">No owners listed for this filer.</p>;
  }

  return (
    <>
      {isEditMode && hasOwners ? (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Owners</h4>
          <div className="bg-slate-50 p-4 rounded-md border border-slate-100 flex flex-col gap-2">
            {owners.map((owner: any, i: number) => (
              <input
                key={i}
                type="text"
                value={owner || ""}
                onChange={(e) => {
                  const updated = owners.map((o: any, oi: number) => (oi === i ? e.target.value : o));
                  onChange({ ...section, owners: updated });
                }}
                className="w-full text-sm text-slate-800 border border-slate-300 rounded px-2 py-1.5 bg-white focus:border-red-800 focus:outline-none"
              />
            ))}
          </div>
        </div>
      ) : (
        <BulletList heading="Owners" items={owners} boxed />
      )}
      <BulletList heading="Known Email Addresses" items={emails} />
    </>
  );
};

// The stacked Investor Overview card: the four sections above in the order and
// chrome they had when they were one component. This is what the Condensed
// preview modal renders, so it stays exactly as it was.
const WhaleWisdomOverviewCard = ({
  section,
  slug,
  isEditMode,
  onChange,
}: {
  section: any;
  slug?: string;
  isEditMode: boolean;
  onChange: (updated: any) => void;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Investor Overview" icon="Globe">
        <UnavailableNotice label="Investor overview" error={section?.error} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Investor Overview" icon="Globe" collapsible>
      <OverviewSection section={section} isEditMode={isEditMode} onChange={onChange} inCard />
      <OwnersSection section={section} isEditMode={isEditMode} onChange={onChange} inCard />
      <LinksSection section={section} inCard />
      <BrochureSection section={section} slug={slug} isEditMode={isEditMode} onChange={onChange} inCard />
    </SectionCard>
  );
};

const editableCellInputClass =
  "w-full text-xs text-slate-900 border border-slate-300 rounded px-1.5 py-1 focus:border-red-800 focus:outline-none bg-white";

// The three header figures a 13F filing reports. Factored out of
// HoldingsSection so the combined-profile view can repeat it once per filer
// while the single-filer view keeps rendering exactly one of them.
const HoldingMetaFields = ({ filing }: { filing: any }) => (
  <div className="flex flex-wrap gap-6 text-sm">
    {filing?.filing_date && (
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Filing Date</p>
        <p className="font-semibold text-slate-800">{filing.filing_date}</p>
      </div>
    )}
    {filing?.report_period_end && (
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Period End</p>
        <p className="font-semibold text-slate-800">{filing.report_period_end}</p>
      </div>
    )}
    {!!filing?.reported_13f_portfolio_value_usd && (
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Portfolio Value</p>
        <p className="font-semibold text-slate-800">{formatLargeUSD(filing.reported_13f_portfolio_value_usd)}</p>
      </div>
    )}
  </div>
);

const HoldingsSection = ({
  section,
  isEditMode,
  onChange,
  bare = false,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  // Forwarded straight to SectionCard: strips the card chrome and forces the
  // body open when this section IS the tab panel. Set on the unavailable card
  // too, so a failed section still shows its notice in tab mode.
  bare?: boolean;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Current 13F Holdings" icon="Briefcase" bare={bare}>
        <UnavailableNotice label="13F holdings" error={section?.error} />
      </SectionCard>
    );
  }

  const holdings = Array.isArray(section.top_holdings) ? section.top_holdings : [];

  // ── Combined-profile 13F shape ──────────────────────────────────────────
  // A merged profile (POST /activist-profiles/basic/merge) reports on two filers
  // at once, so its 13F section carries these on top of the single-filer fields:
  //   per_filer[]          one header per source filer — its own `filer` label,
  //                        filing_date, report_period_end,
  //                        reported_13f_portfolio_value_usd, sec_filing_url and
  //                        holdings_count
  //   top_holdings[].filer which filer reported that row (null single-filer)
  //   note                 why % Portfolio doesn't sum to 100% across filers
  //   period_end_mismatch  set when the two filings cover different periods
  //
  // The single-filer header fields stay populated on a combination too — the
  // backend fills them from whichever filer actually reported holdings — so the
  // per-filer branch below replaces that header rather than adding to it, and
  // each branch keys off the presence of these fields rather than off the
  // profile-level is_combination flag. A single-filer section carries none of
  // them and renders exactly as it did before.
  const filerHeaders: any[] = Array.isArray(section.per_filer) ? section.per_filer.filter(Boolean) : [];
  const showFilerColumn = holdings.some((h: any) => h?.filer);

  const updateHolding = (index: number, field: string, value: string) => {
    const updated = holdings.map((h: any, i: number) => (i === index ? { ...h, [field]: value } : h));
    onChange({ ...section, top_holdings: updated });
  };

  return (
    <SectionCard title="Current 13F Holdings" icon="Briefcase" collapsible defaultOpen={false} bare={bare}>
      {filerHeaders.length > 0 ? (
        <div className="flex flex-col gap-3 mb-4">
          {filerHeaders.map((filer: any, i: number) => (
            <div key={filer?.slug || i} className="bg-slate-50 border border-slate-100 rounded-md p-3">
              <h5 className="text-sm font-bold text-slate-800 m-0 mb-2 flex items-center gap-2">
                <Lucide icon="Building2" className="w-4 h-4 text-red-800 shrink-0" />
                {filer?.filer || `Filer ${i + 1}`}
              </h5>
              <HoldingMetaFields filing={filer} />
              {/* A feeder fund / fund-series entity often files no 13F of its
                  own. Said here as well as in the merge notes, so nobody reads
                  the table as this filer's positions. */}
              {!filer?.holdings_count && (
                <p className="text-xs text-slate-500 m-0 mt-1">No 13F holdings reported — none of the rows below are this filer's.</p>
              )}
              {filer?.sec_filing_url && (
                <a
                  href={filer.sec_filing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm font-semibold text-blue-700 underline"
                >
                  View SEC Form 13F-HR filing
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <HoldingMetaFields filing={section} />
        </div>
      )}

      {/* Two filers on different reporting periods aren't directly comparable,
          so this can't be a quiet footnote — the reader has to see it above the
          table they'd otherwise read as one point in time. */}
      {section.period_end_mismatch && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="m-0">
            These filers reported different period ends, so the holdings below are not all as of the same date.
          </p>
        </div>
      )}

      {holdings.length > 0 ? (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-red-50 border-b border-red-100 text-xs uppercase tracking-wide text-red-800">
                {showFilerColumn && <th className="px-3 py-2 font-bold">Filer</th>}
                <th className="px-3 py-2 font-bold">Issuer</th>
                <th className="px-3 py-2 font-bold">Ticker</th>
                <th className="px-3 py-2 font-bold text-right">
                  % Portfolio<sup className="text-red-600 ml-0.5">*</sup>
                </th>
                <th className="px-3 py-2 font-bold text-right">Shares</th>
                <th className="px-3 py-2 font-bold text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h: any, i: number) => {
                const sharesRaw = h.shares_or_principal;
                const sharesDisplay =
                  typeof sharesRaw === "number"
                    ? sharesRaw.toLocaleString(NUMBER_LOCALE)
                    : sharesRaw
                    ? String(sharesRaw).replace(/\s*shares/gi, "")
                    : "N/A";
                return (
                  <tr key={`${h.issuer}-${i}`} className="border-b border-slate-100 last:border-0">
                    {/* Structural, not editable: which filer reported the row
                        comes from the merge, not from anything a user retypes. */}
                    {showFilerColumn && (
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{h.filer || "—"}</td>
                    )}
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {isEditMode ? (
                        <input type="text" value={h.issuer || ""} onChange={(e) => updateHolding(i, "issuer", e.target.value)} className={editableCellInputClass} />
                      ) : (
                        h.issuer
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium">
                      {isEditMode ? (
                        <input type="text" value={h.ticker_or_symbol || ""} onChange={(e) => updateHolding(i, "ticker_or_symbol", e.target.value)} className={editableCellInputClass} />
                      ) : (
                        h.ticker_or_symbol || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.note || ""}
                          onChange={(e) => updateHolding(i, "note", e.target.value)}
                          placeholder="e.g. 23.34% of reported 13F portfolio"
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        formatPortfolioPercent(h.note)
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.shares_or_principal ?? ""}
                          onChange={(e) => updateHolding(i, "shares_or_principal", e.target.value)}
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        sharesDisplay
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-900 font-medium text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.value_usd_thousands ?? ""}
                          onChange={(e) => updateHolding(i, "value_usd_thousands", e.target.value)}
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        formatUSDThousands(h.value_usd_thousands)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500 m-0">No holdings reported in this filing.</p>
      )}

      {/* Defines the "*" on the % Portfolio column header. */}
      {holdings.length > 0 && (
        <p className="text-xs text-slate-500 mt-2 m-0">
          <span className="text-red-600">*</span> ZMH Calculation
        </p>
      )}

      {/* Combined profiles ship their own explanation of what % Portfolio is
          measured against — rendered as sent rather than restated here, so the
          wording stays the backend's. */}
      {section.note && <p className="text-xs text-slate-500 mt-1 m-0">{section.note}</p>}

      {/* Combined profiles link each filer's own 13F-HR from its sub-header
          above, so this section-level link would be a third, ambiguous one. */}
      {filerHeaders.length === 0 && section.sec_filing_url && (
        <a
          href={section.sec_filing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm font-semibold text-blue-700 underline"
        >
          View SEC Form 13F-HR filing
        </a>
      )}
    </SectionCard>
  );
};

// "Form & File" mirrors EDGAR's own full-text-search results table
// (https://www.sec.gov/edgar/search/) — form type stacked over the SEC
// file number, e.g. "SC 13D/A" / "005-82940".
const editableLabelInputClass =
  "mt-1 w-full text-sm text-slate-800 border border-slate-300 rounded px-2 py-1.5 focus:border-red-800 focus:outline-none bg-white";

const ActivistFilingsSection = ({
  section,
  isEditMode,
  onChange,
  bare = false,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  bare?: boolean;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Activist Filings (13D & Proxy Contests)" icon="FileText" bare={bare}>
        <UnavailableNotice label="Activist filings" message="None" error={section?.error} />
      </SectionCard>
    );
  }

  const filings = Array.isArray(section.filings) ? section.filings : [];

  // One table per source entity on a combination. Grouping rather than a source
  // column because the column would have to go inside ActivistFilingsTable,
  // which isn't this file's to change. A filing naming several entities is
  // listed under each of them — a co-filed 13D belongs to every co-filer, not
  // just whichever one happens to be first. Read side only; Edit Mode keeps the
  // flat list of editable rows.
  const filingGroups = isEditMode ? [] : groupByEntity<any>(section, filings, ["filings"]);

  const updateFiling = (index: number, field: string, value: string) => {
    const updated = filings.map((f: any, i: number) => (i === index ? { ...f, [field]: value } : f));
    onChange({ ...section, filings: updated });
  };

  return (
    <SectionCard title="Activist Filings (13D & Proxy Contests)" icon="FileText" collapsible defaultOpen={false} bare={bare}>
      {isEditMode ? (
        filings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* form, filing_date, accession, and url are verifiable SEC facts,
                not something to hand-correct — shown read-only for context. */}
            {filings.map((f: any, i: number) => (
              <div key={f.accession || i} className="border border-slate-200 rounded-md p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{f.form || "Filing"}</span>
                  <span>{f.filing_date || "—"}</span>
                  {f.accession && <span>{f.accession}</span>}
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                      View filing
                    </a>
                  )}
                </div>
                <label className="text-xs font-semibold text-slate-600">
                  Reporting For
                  <input
                    type="text"
                    value={f.reporting_for || ""}
                    onChange={(e) => updateFiling(i, "reporting_for", e.target.value)}
                    className={editableLabelInputClass}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Filing Entity / Person
                  <input
                    type="text"
                    value={f.filing_entity_person || ""}
                    onChange={(e) => updateFiling(i, "filing_entity_person", e.target.value)}
                    className={editableLabelInputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 m-0">No activist filings found in the last 5 years.</p>
        )
      ) : filingGroups.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filingGroups.map((group, i) => (
            <EntityGroup key={`${group.label}-${i}`} label={group.label}>
              {group.items.length > 0 ? (
                <ActivistFilingsTable filings={group.items} variant="tailwind" />
              ) : (
                // Said explicitly rather than left out: "this entity filed
                // nothing" and "we didn't retrieve this entity" look identical
                // when the group simply isn't rendered.
                <p className="text-sm text-slate-500 m-0">No activist filings found in the last 5 years.</p>
              )}
            </EntityGroup>
          ))}
        </div>
      ) : (
        <ActivistFilingsTable filings={filings} variant="tailwind" />
      )}
    </SectionCard>
  );
};

// The API now populates `published_date` on shareholder-letter results when
// the source page/PDF actually states one, so that field wins first. When
// it's absent or unparseable (an older/unfetched result), this falls back to
// scanning the snippet/title text itself for a dateline -- PRNewswire-style
// month-day-year ("NEW YORK, March 25, 2022 /PRNewswire/", "Aug. 14, 2026",
// "May 05, 2023, 08:00 ET") and day-month-year ("30 Apr, 2025",
// "14 Aug 2026") order, full or abbreviated (with-or-without a trailing
// period) month names -- mirrors basic_profile.py's own _LETTER_DATE_RE on
// the backend so the two stay in agreement on what counts as a real date.
//
// Only a full month-day-year (or day-month-year) counts. A bare "December
// 2021" is almost always prose about a holding period ("has been a
// stockholder since December 2021"), not a publish date, and sorting on it
// would place rows confidently wrong.
const MONTH_FULL =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTH_ABBR = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
const MONTH_TOKEN = `(?:${MONTH_FULL}|${MONTH_ABBR})\\.?`;
// Comma between day and year is optional in both orders -- "May 05, 2023"
// and "May 05 2023" should both count.
const TEXT_DATE_MDY_RE = new RegExp(`\\b(${MONTH_TOKEN})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, "i");
const TEXT_DATE_DMY_RE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_TOKEN})\\s*,?\\s*(\\d{4})\\b`, "i");
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

const getLetterDate = (r: any): Date | null => {
  if (r?.published_date) {
    const d = new Date(r.published_date);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const text = `${r?.snippet || ""} ${r?.title || ""}`;

  const iso = text.match(ISO_DATE_RE);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const mdy = text.match(TEXT_DATE_MDY_RE);
  if (mdy) {
    const d = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmy = text.match(TEXT_DATE_DMY_RE);
  if (dmy) {
    const d = new Date(`${dmy[2]} ${dmy[1]}, ${dmy[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

const ShareholderLettersSection = ({
  section,
  isEditMode,
  onChange,
  bare = false,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
  bare?: boolean;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Shareholder Letters" icon="Mail" bare={bare}>
        <UnavailableNotice label="Shareholder letters" error={section?.error} />
      </SectionCard>
    );
  }

  const rawResults = Array.isArray(section.results) ? section.results : [];

  // Newest first. Letters we could not date keep their original API order and
  // sink below the dated ones, so an undated result never masquerades as recent.
  // Applied per group as well as to the flat list, so grouping doesn't quietly
  // change the ordering rule.
  const sortLetters = (results: any[]) =>
    results
      .map((r: any, i: number) => ({ r, i, time: getLetterDate(r)?.getTime() ?? null }))
      .sort((a, b) => {
        if (a.time === null || b.time === null) {
          if (a.time === b.time) return a.i - b.i;
          return a.time === null ? 1 : -1;
        }
        return b.time - a.time;
      });

  // One list per source entity on a combination; read side only, so Edit Mode
  // keeps the single flat list of editable rows.
  const letterGroups = isEditMode ? [] : groupByEntity<any>(section, rawResults, ["results", "letters"]);

  const updateLetter = (index: number, field: string, value: string) => {
    const updated = rawResults.map((r: any, i: number) => (i === index ? { ...r, [field]: value } : r));
    onChange({ ...section, results: updated });
  };

  // Shared by the flat list and by each entity group, so the two can't drift.
  const renderLetters = (results: any[]) => {
    const sorted = sortLetters(results);
    if (sorted.length === 0) {
      return <p className="text-sm text-slate-500 m-0">No shareholder letters found.</p>;
    }
    return (
      <ul className="p-0 m-0 list-none flex flex-col gap-4">
        {sorted.map(({ r, time }, i: number) => (
          <li key={i} className="flex items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
            <span className="text-red-800 mr-2 text-base leading-none">▸</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-600 m-0 leading-relaxed">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                    {r.title || "Untitled letter"}
                  </a>
                ) : (
                  <span className="font-medium">{r.title || "Untitled letter"}</span>
                )}
              </p>
              {/* Title + date only. The snippet is still read by
                  getLetterDate() above to derive that date — it just isn't
                  rendered any more. */}
              {time !== null && (
                <p className="text-xs text-slate-400 m-0 mt-1">{formatDate(time)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <SectionCard title="Shareholder Letters" icon="Mail" collapsible defaultOpen={false} bare={bare}>
      {isEditMode ? (
        rawResults.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* url is a verifiable source link, not something to hand-correct
                — shown read-only for context. */}
            {rawResults.map((r: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-md p-3 flex flex-col gap-2">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 no-underline font-medium hover:underline break-all">
                    {r.url}
                  </a>
                )}
                <label className="text-xs font-semibold text-slate-600">
                  Title
                  <input type="text" value={r.title || ""} onChange={(e) => updateLetter(i, "title", e.target.value)} className={editableLabelInputClass} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Source
                  <input type="text" value={r.source || ""} onChange={(e) => updateLetter(i, "source", e.target.value)} className={editableLabelInputClass} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Snippet
                  <textarea
                    value={r.snippet || ""}
                    onChange={(e) => updateLetter(i, "snippet", e.target.value)}
                    rows={3}
                    className={`${editableLabelInputClass} resize-y`}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Published Date
                  <input
                    type="text"
                    value={r.published_date || ""}
                    onChange={(e) => updateLetter(i, "published_date", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className={editableLabelInputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 m-0">No shareholder letters found.</p>
        )
      ) : letterGroups.length > 0 ? (
        <div className="flex flex-col gap-3">
          {letterGroups.map((group, i) => (
            <EntityGroup key={`${group.label}-${i}`} label={group.label}>
              {renderLetters(group.items)}
            </EntityGroup>
          ))}
        </div>
      ) : (
        renderLetters(rawResults)
      )}
    </SectionCard>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────

export interface BasicProfileData {
  status: "success" | "partial";
  slug: string;
  investor_name: string;
  generated_at: string;
  // Set on profiles built by merging two others; combination_of holds the two
  // source slugs, in the order they were merged, and combination_notes records
  // every merge decision that wasn't a clean union (a scalar that differed
  // between the sources, a filer with no 13F holdings, a period-end mismatch).
  is_combination?: boolean;
  combination_of?: string[];
  combination_notes?: string[];
  sections: {
    whalewisdom_overview?: any;
    current_13f_holdings?: any;
    activist_filings?: any;
    shareholder_letters_web?: any;
  };
}

// The Condensed tabs, in the order they appear in the tab bar. Exported so the
// dashboard renders the bar from the same list this panel switches on — a tab
// can't exist in the nav without a panel behind it, or the reverse.
export const BASIC_PROFILE_TABS: { id: string; label: string }[] = [
  { id: "overview", label: "Investor Overview" },
  
  
  // Deliberately shorter than the headings these carry in stacked mode ("SEC
  // Form ADV Part 2 Brochure", "Activist Filings (13D & Proxy Contests)"), so
  // all seven labels fit one row.
  { id: "brochure", label: "ADV Brochure" },
  { id: "holdings", label: "13F Holdings" },
  { id: "activist_filings", label: "Activist Filings" },
  { id: "letters", label: "Shareholder Letters" },
  { id: "owners", label: "Owners" },
  { id: "links", label: "Relevant Links" },
];

export const BASIC_PROFILE_DEFAULT_TAB = "overview";

const BasicProfilePanel = ({
  data,
  loading,
  error,
  isEditMode,
  onChange,
  layout = "stacked",
  activeTab = BASIC_PROFILE_DEFAULT_TAB,
}: {
  data: BasicProfileData | null;
  loading: boolean;
  error: string | null;
  isEditMode: boolean;
  onChange: (updated: BasicProfileData) => void;
  // "stacked" is every section one under another, scrollable — what the
  // Condensed Profile Preview modal wants, where a reviewer reads the whole
  // profile before approving it rather than hunting through seven tabs. The
  // dashboard passes "tabs" and drives activeTab from its own tab bar.
  layout?: "tabs" | "stacked";
  activeTab?: string;
}) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div
          className="w-10 h-10 rounded-full border-4 border-slate-200 animate-spin"
          style={{ borderTopColor: THEME_MAROON }}
        />
        <p className="text-slate-500 mt-4 text-sm">Generating Condensed profile…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">No Condensed profile available yet.</p>;
  }

  const sections = data.sections || {};

  // Merges a section-level edit back into the full BasicProfileData object
  // (immutable, same shape) and hands it up to the parent, which holds the
  // live draft in its own basicProfile state.
  const updateSection = (key: keyof BasicProfileData["sections"], updatedSection: any) => {
    onChange({ ...data, sections: { ...data.sections, [key]: updatedSection } });
  };

  // All four whalewisdom_overview tabs write through this one callback, so an
  // edit on any of them lands on the same section object.
  const overview = sections.whalewisdom_overview;
  const onOverviewChange = (updated: any) => updateSection("whalewisdom_overview", updated);

  if (layout === "tabs") {
    return (
      <div>
        {loading && <p className="text-xs text-slate-400 m-0 mb-4">Refreshing…</p>}

        {activeTab === "overview" && (
          <OverviewSection section={overview} isEditMode={isEditMode} onChange={onOverviewChange} />
        )}
        {activeTab === "owners" && (
          <OwnersSection section={overview} isEditMode={isEditMode} onChange={onOverviewChange} />
        )}
        {activeTab === "links" && <LinksSection section={overview} />}
        {activeTab === "brochure" && (
          <BrochureSection
            section={overview}
            slug={data.slug}
            isEditMode={isEditMode}
            onChange={onOverviewChange}
          />
        )}
        {activeTab === "holdings" && (
          <HoldingsSection
            section={sections.current_13f_holdings}
            isEditMode={isEditMode}
            onChange={(s) => updateSection("current_13f_holdings", s)}
            bare
          />
        )}
        {activeTab === "activist_filings" && (
          <ActivistFilingsSection
            section={sections.activist_filings}
            isEditMode={isEditMode}
            onChange={(s) => updateSection("activist_filings", s)}
            bare
          />
        )}
        {activeTab === "letters" && (
          <ShareholderLettersSection
            section={sections.shareholder_letters_web}
            isEditMode={isEditMode}
            onChange={(s) => updateSection("shareholder_letters_web", s)}
            bare
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* {data.status === "partial" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0" />
          Some sections of this profile could not be retrieved.
        </div>
      )} */}

      {/* "Last updated" moved to the dashboard header pill (ActivistDashboard)
          so it isn't stated twice on the same screen; the refreshing hint stays
          here, where the sections it applies to are. */}
      {loading && <p className="text-xs text-slate-400 m-0">Refreshing…</p>}

      <WhaleWisdomOverviewCard
        section={overview}
        slug={data.slug}
        isEditMode={isEditMode}
        onChange={onOverviewChange}
      />
      <HoldingsSection
        section={sections.current_13f_holdings}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("current_13f_holdings", s)}
      />
      <ActivistFilingsSection
        section={sections.activist_filings}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("activist_filings", s)}
      />
      <ShareholderLettersSection
        section={sections.shareholder_letters_web}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("shareholder_letters_web", s)}
      />

      {/* Two combination-only blocks used to render here: a paragraph explaining
          the "Combined" marker and the profiles the merge was built from, and a
          folded "What this merge decided" list of combination_notes. Both were
          dropped from the client-facing view at the client's request — the
          "Combined" badge beside the profile name is the only marker now.

          Nothing was removed from the data: is_combination, combination_of and
          combination_notes are still on the profile type above, still stored,
          and still populated by the merge. The audit trail the notes provide is
          intact in the saved profile — it simply isn't rendered here. */}
    </div>
  );
};

export default BasicProfilePanel;
