// ─── Case-study prose formatting ────────────────────────────────────────────
// One rule for every screen that shows engagement_details / voting_rationale /
// voting_details in full, so a case study reads the same before and after
// Approve. The text arrives in several shapes, and all have to come out right:
//
//   legacy rows    paragraphs separated by a blank line, few or no single
//                  newlines within a paragraph
//   PDF-extracted  a newline at the end of every VISUAL line, because that's
//                  what text extraction preserves
//   analyst-typed  a heading ("OBJECTIVE") on its own line, its paragraph on
//                  the next
//
// So a blank line is a paragraph break, a lone newline is a soft wrap to be
// rejoined unless the line before it ends a sentence, and a line that looks
// like a heading stands on its own -- checked per line BEFORE rejoining, so a
// heading never merges into its paragraph.

export interface CaseStudyTextBlock {
  kind: "heading" | "paragraph";
  text: string;
}

// A line that begins a list item is a genuine break, not a wrap, and must not
// be folded into the sentence above it: a bullet, or a number/letter marker
// ("1.", "1)", "(1)", "a.").
//
// The letter form is restricted to lowercase on purpose. Uppercase would match
// the initial in a personal name ("J. Smith...") landing at the start of a
// wrapped line, which is plausible in this material and would split a sentence
// for no reason.
export const LIST_ITEM_START = /^(?:[•\-–—*]|\(?\d+[.)]|\(?[a-z][.)])\s+/;

// A line that finishes a sentence (or introduces what follows), allowing a
// closing quote or bracket after the mark.
const SENTENCE_END = /[.!?:]["”'’)\]]*$/;

const HEADING_MAX_CHARS = 80;
const HEADING_MAX_WORDS = 10;

// Generic, no vocabulary: a short WHOLE line that doesn't end like a sentence
// and is either all caps or ends with a colon. Applied to whole lines only, so
// an acronym inside a sentence ("CEO", "U.S.") never makes one, nor does a
// heading run inline into its body text (older engine output).
const isHeadingLine = (line: string): boolean => {
  if (line.length > HEADING_MAX_CHARS) return false;
  if (line.split(" ").length > HEADING_MAX_WORDS) return false;
  if (/[.,;]$/.test(line)) return false;
  if (LIST_ITEM_START.test(line)) return false;
  if (line.endsWith(":")) return true;
  const letters = line.replace(/[^\p{L}]/gu, "");
  return letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
};

export const toCaseStudyBlocks = (text: string | null | undefined): CaseStudyTextBlock[] => {
  if (!text) return [];
  const blocks: CaseStudyTextBlock[] = [];

  text
    .replace(/\u00AD/g, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .forEach((chunk) => {
      // Lines of the paragraph being built. Wrapped lines are rejoined with a
      // single space, while list items keep their own line (the retained "\n"
      // is rendered by whitespace-pre-line on the <p>).
      let lines: string[] = [];
      const flush = () => {
        const paragraph = lines.join("\n").trim();
        if (paragraph) blocks.push({ kind: "paragraph", text: paragraph });
        lines = [];
      };

      chunk.split("\n").forEach((rawLine) => {
        // Collapses runs of spaces. Deliberately not \s, so the list-item
        // newlines above survive.
        const line = rawLine.replace(/[ \t]+/g, " ").trim();
        if (!line) return;
        if (isHeadingLine(line)) {
          flush();
          blocks.push({ kind: "heading", text: line });
        } else if (lines.length === 0 || LIST_ITEM_START.test(line)) {
          lines.push(line);
        } else if (SENTENCE_END.test(lines[lines.length - 1])) {
          // A lone newline after a finished sentence is a paragraph break, not
          // a wrap: many stored rows separate paragraphs with a single "\n".
          flush();
          lines.push(line);
        } else {
          lines[lines.length - 1] += ` ${line}`;
        }
      });
      flush();
    });

  return blocks;
};
