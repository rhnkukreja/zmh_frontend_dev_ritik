import React, { useMemo, useState } from "react"; 

import { 

  Search, 

  Building2, 

  TrendingUp, 

  Users, 

  FileText, 

  ShieldCheck, 

  CalendarDays, 

  Target, 

  ExternalLink, 

  ArrowUpRight, 

  Briefcase, 

  Scale, 

  MessageSquareQuote, 

} from "lucide-react"; 
import Button from "../../../components/Base/Button"; 
import { Badge } from "../../../components/Base/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Base/Card";
import Tab from "../../../components/Base/Headless/Tab"; 
import TomSelect from "../../../components/Base/TomSelect";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts"; 

 

const investorProfiles = [ 

  { 

    "id": "ancora-advisors", 

    "name": "Ancora Advisors / Ancora Holdings Group", 

    "aliases": [ 

      "Ancora Advisors / Ancora Holdings Group" 

    ], 

    "type": "Activist Investor Profile", 

    "headquarters": "Cleveland / Mayfield Heights, Ohio", 

    "founded": "2003", 

    "aum": "Crossed $10 billion in 2025", 

    "confidence": "Profile loaded", 

    "strategy": "operating-performance focus; leadership and governance agenda; transaction activism; constructive-settlement preference, with willingness to escalate; coalition and second-mover behavior", 

    "customerSummary": "Ancora is a Cleveland-based investment platform founded in 2003 whose public-company activism is run primarily through Ancora Alternatives, the firm's alternative asset management division. Ancora's official history says the activist strategy launched in 2014, shifted toward larger-cap campaigns in 2018, and now runs a concentrated portfolio built around governance, leadership, operational improvement and transaction-driven value creation. Public materials show a style that mixes cooperative settlements with willingness to run full proxy contests when needed. Recent campaigns have targeted transportation and logistics, industrials, consumer and retail, business services, healthcare and media. Common demands include board refreshment, CEO change, strategic review or sale processes, better capital allocation and stronger operating discipline.", 

    "riskLevel": "Medium-High", 

    "engagementStyle": "Public activism / engagement", 

    "campaignCount": 17, 

    "activeCampaigns": 1, 

    "avgOwnership": "N/A", 

    "typicalAsk": "Operating Performance Focus", 

    "sectors": [ 

      "Merger Opposition", 

      "Performance", 

      "Process", 

      "Proxy Contest", 

      "Sale Process Pressure", 

      "Settlement Pressure", 

      "Strategic Alternatives", 

      "Transaction Activism", 

      "Value Creation" 

    ], 

    "recentTargets": [ 

      "Warner Bros. Discovery", 

      "CSX", 

      "LKQ", 

      "U.S. Steel", 

      "Norfolk Southern", 

      "Forward Air" 

    ], 

    "thesisThemes": [ 

      "operating-performance focus", 

      "leadership and governance agenda", 

      "transaction activism", 

      "constructive-settlement preference, with willingness to escalate", 

      "coalition and second-mover behavior" 

    ], 

    "signals": [ 

      "Monitor public letters and presentations", 

      "Track nomination windows and board refresh demands", 

      "Watch for strategic review or transaction criticism", 

      "Review peer benchmarking and governance vulnerabilities" 

    ], 

    "campaignOutcomes": [ 

      { 

        "label": "Closed", 

        "value": 13 

      }, 

      { 

        "label": "Settled", 

        "value": 2 

      }, 

      { 

        "label": "Withdrawn", 

        "value": 1 

      }, 

      { 

        "label": "Ongoing", 

        "value": 1 

      } 

    ], 

    "activityTrend": [ 

      { 

        "year": "2018", 

        "campaigns": 1 

      }, 

      { 

        "year": "2020", 

        "campaigns": 3 

      }, 

      { 

        "year": "2022", 

        "campaigns": 5 

      }, 

      { 

        "year": "2023", 

        "campaigns": 2 

      }, 

      { 

        "year": "2024", 

        "campaigns": 1 

      }, 

      { 

        "year": "2025", 

        "campaigns": 3 

      }, 

      { 

        "year": "2026", 

        "campaigns": 1 

      } 

    ], 

    "notableTactics": [ 

      "operating-performance focus", 

      "leadership and governance agenda", 

      "transaction activism", 

      "constructive-settlement preference, with willingness to escalate", 

      "coalition and second-mover behavior" 

    ], 

    "prepChecklist": [ 

      "Review campaign history and recurring themes", 

      "Prepare governance and board composition response", 

      "Stress-test capital allocation and strategic alternatives narrative", 

      "Track campaign status and latest profile updates" 

    ], 

    "sourceStatus": "Uploaded JSON", 

    "lastUpdated": "2026-05-23", 

    "campaigns": [ 

      "Element Fleet Management (2018-04) - status: closed; core issue: Board refresh through appointment of independent directors.; Governance and board oversight.; tactics: Stake-building and coalition pressure with other shareholders.; outcome: Ancora says two independent directors were appointed; position exited June 2019.", 

      "Big Lots (2020-02) - status: closed; core issue: Install new independent directors and improve value creation.; Governance and performance.; tactics: Constructive engagement leading to board changes.; outcome: Ancora says two independent directors were appointed; position exited October 2020.", 

      "Forward Air (2020-10) - status: closed; core issue: Refresh the board and improve operating and capital-allocation strategy.; Operational oversight, portfolio strategy, capital allocation, margin profile.; tactics: Director nominations, open letter, proxy materials, cooperation agreement.; outcome: Five new directors were appointed under a 2021 cooperation agreement; the original position was exited October 2022.", 

      "Kohl's (2020-12) - status: closed; core issue: Board refresh and leadership change, with sale pressure in the broader shareholder campaign.; Underperformance, board composition, CEO quality, strategic alternatives.; tactics: Coalition pressure and later public statement of support for management transition.; outcome: Ancora says three independent directors were added and the CEO was removed; public paper trail was shared with Macellum and other activists.", 

      "C.H. Robinson (2022-01) - status: closed; core issue: Operational improvement and leadership change.; Operational underperformance and leadership.; tactics: Engagement leading to independent director appointments.; outcome: Ancora says two directors were added and an underperforming CEO was removed; position exited January 2024.", 

      "SpartanNash (2022-03) - status: closed; core issue: Elect dissident directors and push a sale or other strategic alternatives.; Competitiveness, operations and strategic review.; tactics: Joint slate with Macellum, shareholder letters, proxy advisor outreach.; outcome: Campaign lost at the 2022 annual meeting.", 

      "Everbridge (2022-05) - status: closed; core issue: Initiate a sale process.; Value realization and strategic alternatives.; tactics: Public letter after annual-meeting vote signals.; outcome: Ancora made a direct public sale-process demand; further public outcome not fully documented in the source set reviewed here.", 

      "Middlefield Banc (2022-04) - status: closed; core issue: Press shareholders and board on value creation concerns.; Governance and value creation.; tactics: Open letter to shareholders.; outcome: Public pressure campaign documented on Ancora's site; broader outcome remains thin in the reviewed public record.", 

      "IAA / RB Global (2022-09) - status: closed; core issue: Advocate for a sale of IAA and later support RB Global's acquisition on improved terms.; Leadership, sale process and merger value.; tactics: Letters, presentations, public transaction advocacy.; outcome: Ancora says it supported the RB Global purchase and placed one director on the combined board; position exited July 2024.", 

      "Mueller Water Products (2023-01) - status: closed; core issue: Accelerate board refresh.; Governance and strategic oversight.; tactics: Private and public engagement.; outcome: Ancora says two independent directors were seated; position exited April 2024.", 

      "Elanco Animal Health (2023-11) - status: closed; core issue: Board change and CEO accountability.; Performance, leadership and governance.; tactics: Director nominations, SEC filings and settlement pressure.; outcome: Elanco settled and added two directors in April 2024; Ancora later exited in May 2024 per its history page.", 

      "Norfolk Southern (2024-01) - status: settled; core issue: Replace CEO, change operating strategy and refresh most of the board.; Safety oversight, operating ratio, service levels, governance and leadership.; tactics: Large public campaign, director slate, proposed management team, white papers, union outreach and proxy contest.; outcome: Ancora won three board seats in May 2024 and later settled in November 2024 for an additional independent board member.", 

      "Forward Air (2023-10) - status: closed; core issue: Oppose the Omni transaction, push a strategic review and force removal of legacy directors.; Acquisition judgment, leverage, governance and urgency of a sale process.; tactics: Presentations, letters, withhold campaign and sale-process pressure.; outcome: Three directors left after the June 11, 2025 annual meeting and the board said it would focus on the review process.", 

      "LKQ (2025-02) - status: settled; core issue: Board representation and stronger financial oversight / strategic review pressure.; Capital allocation, governance and value creation.; tactics: Engagement with support from Engine Capital; cooperation agreement.; outcome: LKQ appointed Sue Gove and Michael Powell to the board and formed a finance committee on February 5, 2025.", 

      "U.S. Steel (2025-01) - status: withdrawn; core issue: Oppose the Nippon Steel transaction, replace leadership and install a majority slate.; Merger strategy, operational performance, governance and leadership credibility.; tactics: Director nominations, CEO candidate proposal, books-and-records demand, presentations and annual-meeting-delay pressure.; outcome: Ancora withdrew its nominations on April 9, 2025 after the Trump administration ordered a new CFIUS review.", 

      "CSX (2025-08) - status: closed; core issue: Force a merger review or replace the CEO.; Operational deterioration, strategic posture during rail consolidation, leadership.; tactics: Private board letter later reported publicly; public statement after leadership change.; outcome: CSX replaced CEO Joe Hinrichs with Steve Angel on September 29, 2025; Ancora publicly applauded the move.", 

      "Warner Bros. Discovery (2026-02) - status: ongoing; core issue: Oppose the proposed Netflix transaction and press the board to engage with Paramount's bid.; Deal value, regulatory certainty and board process.; tactics: Stake disclosure via campaign website, press release, presentations and threatened board accountability vote.; outcome: Reuters reported on February 27, 2026 that Warner Bros. Discovery agreed to a Paramount Skydance deal after Netflix walked away; shareholder approval remained pending as of May 23, 2026." 

    ], 

    "latest13F": null, 

    "peopleSnapshot": { 

      "visiblePersonnel": [ 

        "Fred DiSanto", 

        "James Chadwick", 

        "John Micklitsch", 

        "Jason Geers" 

      ], 

      "nominees": [ 

        "Betsy Atkins", 

        "John Kasich", 

        "Gilbert Lamphere" 

      ] 

    } 

  }, 

  {"id":"anson-funds","name":"Anson Funds / Anson Funds Management LP","aliases":["Anson Funds","Anson Funds Management LP"],"type":"Activist Investor Profile","headquarters":"Toronto and Dallas","founded":"2003","aum":"Over $2 billion on firm website materials","confidence":"Profile loaded","strategy":"strategic-review and sale-process pressure; board refresh and cooperation agreements; capital-allocation and value-realization pressure; coalition and second-mover activism","customerSummary":"Anson Funds is a privately held alternative asset manager founded in 2003 with offices in Toronto and Dallas. Its public materials describe activism as a formal long strategy focused on governance, operational, and strategic changes to unlock value. The modern activist push appears to have accelerated in late 2023, when Reuters reported that Anson hired Sagar Gupta from Legion Partners to build out its shareholder activism and engagement strategy. Recent public campaigns cluster in North American small- and mid-cap technology, media, biotech, and real estate names, with a strong bias toward strategic-review, sale-process, board-refresh, and capital-allocation theses. Anson often uses cooperation agreements, board appointments, public letters, and selective proxy escalation rather than always leading with a standalone 13D campaign. The profile shows a meaningful second-mover or coalition pattern, including campaigns alongside or after other activists at Match, Twilio, Five9, MEI Pharma, Nano Dimension, and First Capital REIT.","riskLevel":"Medium-High","engagementStyle":"Public activism / engagement","campaignCount":12,"activeCampaigns":4,"avgOwnership":"N/A","typicalAsk":"Strategic Review And Sale Process Pressure","sectors":["TMT","Digital Platforms","Communications Software","Media","Biotech","REIT / Real Estate","Strategic Alternatives","Board Refresh","Capital Allocation"],"recentTargets":["SPS Commerce","Clear Channel Outdoor","InterRent REIT","Lionsgate Studios","Five9","Match Group"],"thesisThemes":["strategic-review and sale-process pressure","board refresh and cooperation agreements","capital-allocation and value-realization pressure","coalition and second-mover activism"],"signals":["Monitor public letters and presentations","Track nomination windows and board refresh demands","Watch for strategic review or transaction criticism","Review peer benchmarking and governance vulnerabilities"],"campaignOutcomes":[{"label":"Settled","value":4},{"label":"Closed","value":4},{"label":"Ongoing","value":1},{"label":"Partial Outcome","value":1},{"label":"Provisional","value":1},{"label":"Contested","value":1}],"activityTrend":[{"year":"2023","campaigns":6},{"year":"2024","campaigns":3},{"year":"2025","campaigns":2},{"year":"2026","campaigns":1}],"notableTactics":["strategic-review and sale-process pressure","board refresh and cooperation agreements","capital-allocation and value-realization pressure","coalition and second-mover activism"],"prepChecklist":["Review campaign history and recurring themes","Prepare governance and board composition response","Stress-test capital allocation and strategic alternatives narrative","Track campaign status and latest profile updates"],"sourceStatus":"Uploaded JSON","lastUpdated":"2026-05-24","campaigns":["SPS Commerce (2026-02-12) - status: settled; core issue: Board refresh; profitable growth; capital allocation; governance; tactics: Cooperation agreement; board refresh; buyback expansion; outcome: Two independent directors were added and the repurchase authorization was increased to $300 million.","Clear Channel Outdoor (2025-09-22) - status: closed; core issue: Sale process; asset value realization; strategic alternatives; tactics: Strategic review / sale thesis; outcome: Campaign culminated in Clear Channel's February 9, 2026 agreement to sell to Mubadala Capital and TWG Global.","Match Group (2024-03-14) - status: settled; core issue: Board culture; cost cuts; strategic review of MG Asia; capital allocation; tactics: Board contest threat; slate nomination; cooperation agreement; outcome: Anson escalated from private pressure to a three-person slate, then settled after Match added Kelly Campbell and entered an information-sharing agreement.","InterRent REIT (2025-03-10) - status: closed; core issue: Strategic changes; real-estate value realization; potential sale; tactics: Strategic review / sale pressure; outcome: Public pressure was overtaken by the announced take-private deal in mid-2025.","Lionsgate Studios (2024-12-10) - status: ongoing; core issue: Undervaluation; potential sale after Starz separation; tactics: Public strategic-review pressure; outcome: Publicly named thesis, but no settlement or sale outcome was identified in the source pass.","Five9 (2024-12-08) - status: settled; core issue: Share-price performance; governance; value creation; tactics: Cooperation agreement; board seat; outcome: Sagar Gupta received a board seat and remained slated for election in 2026.","Twilio (2023-11-28) - status: partial_outcome; core issue: Sale or divestiture; Segment review; buybacks; governance; board composition; tactics: Public pressure campaign; proxy solicitation materials; outcome: Anson publicly tied board changes, the Segment review, and buybacks to activist pressure, but the reviewed sources did not show a clean final settlement document.","Gildan Activewear (2023-12-18) - status: closed; core issue: CEO reinstatement; board accountability; strategic direction; tactics: Public backing of CEO reinstatement and board change pressure; outcome: Anson was clearly engaged and vocal, but the broader paper trail was shared with other major holders and dissident actors.","Globalstar (2023-12-11) - status: provisional; core issue: Spectrum monetization; strategic alternatives; sale optionality; tactics: Public sale / monetization thesis; outcome: The public thesis is clear, but the reviewed source set did not surface a broader filing-driven campaign trail.","MEI Pharma (2023-05-23) - status: settled; core issue: M&A opposition; board removal; capital discipline; value realization; tactics: Coalition campaign; acquisition proposal; consent solicitation; settlement; outcome: Anson acted with Cable Car; the fight ended with a November 2023 agreement and board change.","Nano Dimension (2023-03-10) - status: contested; core issue: Overcapitalization; cash returns; governance; M&A oversight; tactics: 13D campaign; governance and capital-allocation pressure; outcome: Anson was one of several activist-aligned parties pressuring Nano; the public trail includes litigation and coalition complexity.","First Capital REIT (2023-01-31) - status: closed; core issue: Board change; capital allocation; REIT strategy; tactics: Second-mover backing of another activist's proxy fight; outcome: The lead paper trail belonged to Sandpiper and Artis; Anson appears better characterized as an aligned backer than a lead filer."],"latest13F":{"filingDate":"2026-05-19","periodEnd":"2026-03-31","reportedValue":"$1.12B","topHoldings":[{"rank":1,"issuer":"Lionsgate Studios Corp","value_usd_thousands":58425,"shares_or_principal":"6,092,254 shares"},{"rank":2,"issuer":"AdvisorShares Pure US Cannabis ETF (MSOS)","value_usd_thousands":57975,"shares_or_principal":"16,330,922 shares"},{"rank":3,"issuer":"KraneShares CSI China Internet ETF (KWEB) call options","value_usd_thousands":46594,"shares_or_principal":"1,638,900 underlying shares"},{"rank":4,"issuer":"Match Group Inc","value_usd_thousands":41700,"shares_or_principal":"1,357,879 shares"},{"rank":5,"issuer":"NVIDIA Corp","value_usd_thousands":40093,"shares_or_principal":"229,890 shares"},{"rank":6,"issuer":"SPS Commerce Inc","value_usd_thousands":37577,"shares_or_principal":"575,000 shares plus 100,000 call-option equivalents"},{"rank":7,"issuer":"SEALSQ Corp","value_usd_thousands":32639,"shares_or_principal":"12,457,698 shares"},{"rank":8,"issuer":"Five9 Inc","value_usd_thousands":31655,"shares_or_principal":"2,086,675 shares"},{"rank":9,"issuer":"Alphabet Inc call options","value_usd_thousands":31555,"shares_or_principal":"110,000 underlying shares"},{"rank":10,"issuer":"New America Acquisition I Corp","value_usd_thousands":30813,"shares_or_principal":"2,968,491 units"},{"rank":11,"issuer":"FutureCrest Acquisition Corp","value_usd_thousands":26356,"shares_or_principal":"2,588,965 units"},{"rank":12,"issuer":"iShares 20+ Year Treasury Bond ETF (TLT) call options","value_usd_thousands":26007,"shares_or_principal":"300,000 underlying shares"},{"rank":13,"issuer":"Blue Water Acquisition Corp III","value_usd_thousands":25546,"shares_or_principal":"2,485,000 shares"},{"rank":14,"issuer":"MOZAYYX Acquisition Corp equity units","value_usd_thousands":24378,"shares_or_principal":"2,450,000 equity units"},{"rank":15,"issuer":"Texas Ventures Acquisition III Corp","value_usd_thousands":22857,"shares_or_principal":"2,199,942 shares"},{"rank":16,"issuer":"Cantor Equity Partners I Inc","value_usd_thousands":21417,"shares_or_principal":"2,039,750 shares"},{"rank":17,"issuer":"Venu Holding Corp","value_usd_thousands":18233,"shares_or_principal":"5,508,548 shares"},{"rank":18,"issuer":"The Lovesac Company","value_usd_thousands":17487,"shares_or_principal":"1,183,986 shares"},{"rank":19,"issuer":"Globalstar Inc","value_usd_thousands":17148,"shares_or_principal":"158,179 shares plus 100,000 call-option equivalents"},{"rank":20,"issuer":"Tesla Inc","value_usd_thousands":16054,"shares_or_principal":"43,184 shares"},{"rank":21,"issuer":"Imperial Petroleum Inc","value_usd_thousands":14837,"shares_or_principal":"3,466,680 shares"},{"rank":22,"issuer":"Churchill Capital Corp XI","value_usd_thousands":13335,"shares_or_principal":"1,300,974 units"},{"rank":23,"issuer":"BCE Inc call options","value_usd_thousands":12611,"shares_or_principal":"500,000 underlying shares"},{"rank":24,"issuer":"Osisko Development Corp","value_usd_thousands":12555,"shares_or_principal":"3,862,208 shares"},{"rank":25,"issuer":"Galaxy Digital Inc","value_usd_thousands":11070,"shares_or_principal":"600,000 shares"}]},"peopleSnapshot":{"visiblePersonnel":[{"name":"Moez Kassam","role":"Co-founder, Chairman and Chief Investment Officer","linkedinUrl":"https://ca.linkedin.com/in/moez-kassam-a576631"},{"name":"Amin Nathoo","role":"Chief Executive Officer","linkedinUrl":"https://ca.linkedin.com/in/amin-nathoo-71431b14"},{"name":"Tony Moore","role":"Chief Financial Officer, Chief Operating Officer, Chief Marketing Officer","linkedinUrl":"https://www.linkedin.com/in/tonymoore80"},{"name":"Sagar Gupta","role":"Head of activism / Portfolio Manager","linkedinUrl":"https://www.linkedin.com/in/sagargupta"},{"name":"Taheer Datoo","role":"Co-Head Investments","linkedinUrl":null},{"name":"Laura Salvatori","role":"Chief Legal Officer, Chief Risk Officer, Chief People Officer","linkedinUrl":null}],"nominees":[{"name":"Fumbi Chima","role":"Anson nominee at Match Group in 2025; board appointee at SPS Commerce in 2026","linkedinUrl":"https://www.linkedin.com/in/fumbi-chima"},{"name":"Laura Lee","role":"Anson nominee at Match Group in 2025","linkedinUrl":null},{"name":"Kelley Morrell","role":"Anson nominee at Match Group in 2025","linkedinUrl":null},{"name":"Kelly Campbell","role":"Board addition in Match Group's April 29, 2025 agreement with Anson","linkedinUrl":null},{"name":"Michael McConnell","role":"Anson-supported board appointee at SPS Commerce in 2026","linkedinUrl":null},{"name":"Sagar Gupta","role":"Board appointee at Five9 in 2024","linkedinUrl":"https://www.linkedin.com/in/sagargupta"}]}} 

  , 

  { 

    "id": "carl-icahn", 

    "name": "Carl Icahn", 

    "aliases": [ 

      "Carl Icahn" 

    ], 

    "type": "Activist Investor Profile", 

    "headquarters": "N/A", 

    "founded": "N/A", 

    "aum": "N/A", 

    "confidence": "Profile loaded", 

    "strategy": "capital allocation; separation / spin-off; M&A process discipline; leadership and board accountability; operational reset", 

    "customerSummary": "Carl Icahn is a long-running activist investor whose campaigns repeatedly center on capital allocation, sale-process discipline, separations or spin-offs, and board accountability. In the campaign set reviewed on 2026-05-23, the strongest documentary record came from Apple, eBay, Dell, Forest Laboratories, Xerox, Cheniere Energy, Illumina, and Southwest Gas.", 

    "riskLevel": "Medium-High", 

    "engagementStyle": "Public activism / engagement", 

    "campaignCount": 8, 

    "activeCampaigns": 0, 

    "avgOwnership": "N/A", 

    "typicalAsk": "Capital Allocation", 

    "sectors": [ 

      "Energy / Utilities", 

      "Healthcare / Biotech", 

      "Technology / Industrial", 

      "Technology / Internet" 

    ], 

    "recentTargets": [ 

      "Illumina", 

      "Southwest Gas", 

      "Xerox", 

      "Cheniere Energy", 

      "Apple", 

      "eBay" 

    ], 

    "thesisThemes": [ 

      "capital allocation", 

      "separation / spin-off", 

      "M&A process discipline", 

      "leadership and board accountability", 

      "operational reset" 

    ], 

    "signals": [ 

      "Monitor public letters and presentations", 

      "Track nomination windows and board refresh demands", 

      "Watch for strategic review or transaction criticism", 

      "Review peer benchmarking and governance vulnerabilities" 

    ], 

    "campaignOutcomes": [ 

      { 

        "label": "Reviewed", 

        "value": 8 

      } 

    ], 

    "activityTrend": [ 

      { 

        "year": "2011", 

        "campaigns": 1 

      }, 

      { 

        "year": "2013", 

        "campaigns": 3 

      }, 

      { 

        "year": "2014", 

        "campaigns": 3 

      }, 

      { 

        "year": "2015", 

        "campaigns": 2 

      }, 

      { 

        "year": "2016", 

        "campaigns": 2 

      }, 

      { 

        "year": "2018", 

        "campaigns": 1 

      }, 

      { 

        "year": "2021", 

        "campaigns": 1 

      }, 

      { 

        "year": "2022", 

        "campaigns": 1 

      }, 

      { 

        "year": "2023", 

        "campaigns": 1 

      } 

    ], 

    "notableTactics": [ 

      "capital allocation", 

      "separation / spin-off", 

      "M&A process discipline", 

      "leadership and board accountability", 

      "operational reset" 

    ], 

    "prepChecklist": [ 

      "Review campaign history and recurring themes", 

      "Prepare governance and board composition response", 

      "Stress-test capital allocation and strategic alternatives narrative", 

      "Track campaign status and latest profile updates" 

    ], 

    "sourceStatus": "Uploaded JSON", 

    "lastUpdated": "2026-05-23", 

    "campaigns": [ 

      "Apple (2013, 2014) - status: reviewed; core issue: capital allocation; buybacks; Technology / Internet; tactics: N/A; outcome: Not separately stated in JSON", 

      "eBay (2014) - status: reviewed; core issue: separation / spin-off; governance; Technology / Internet; tactics: N/A; outcome: Not separately stated in JSON", 

      "Dell (2013) - status: reviewed; core issue: M&A opposition; board reconstitution; Technology / Internet; tactics: N/A; outcome: Not separately stated in JSON", 

      "Forest Laboratories (2011, 2014) - status: reviewed; core issue: board refresh; succession; Healthcare / Biotech; tactics: N/A; outcome: Not separately stated in JSON", 

      "Xerox (2015, 2018) - status: reviewed; core issue: M&A opposition; board reset; Technology / Industrial; tactics: N/A; outcome: Not separately stated in JSON", 

      "Cheniere Energy (2015, 2016) - status: reviewed; core issue: board seats; capital discipline; Energy / Utilities; tactics: N/A; outcome: Not separately stated in JSON", 

      "Illumina (2023) - status: reviewed; core issue: acquisition reversal; governance; Healthcare / Biotech; tactics: N/A; outcome: Not separately stated in JSON", 

      "Southwest Gas (2021, 2022) - status: reviewed; core issue: M&A opposition; cost control; Energy / Utilities; tactics: N/A; outcome: Not separately stated in JSON" 

    ], 

    "latest13F": null, 

    "peopleSnapshot": { 

      "visiblePersonnel": [], 

      "nominees": [ 

        "Jonathan Christodoro", 

        "Daniel Ninivaggi", 

        "Keith Cozza", 

        "Vincent Intrieri", 

        "Jesse Lynn", 

        "Andrew Teno" 

      ] 

    } 

  }, 

  { 

    "id": "corvex-management", 

    "name": "Corvex Management LP", 

    "aliases": [ 

      "Corvex Management LP" 

    ], 

    "type": "Activist Investor Profile", 

    "headquarters": "N/A", 

    "founded": "N/A", 

    "aum": "$2.5B", 

    "confidence": "Profile loaded", 

    "strategy": "breakup advocacy; strategic reviews; board representation; capital allocation; sale pressure; coalition activism", 

    "customerSummary": "Corvex Management LP is a New York activist investment firm founded in December 2010 by Keith Meister. Public materials describe it as a concentrated, value-based investor that will become active when it sees an asymmetric risk/reward opportunity. Across the clearest public campaigns, Corvex has favored conglomerate breakups, strategic reviews, capital-allocation changes, and negotiated board representation more often than prolonged public proxy wars.", 

    "riskLevel": "Medium-High", 

    "engagementStyle": "Public activism / engagement", 

    "campaignCount": 16, 

    "activeCampaigns": 4, 

    "avgOwnership": "N/A", 

    "typicalAsk": "Breakup Advocacy", 

    "sectors": [ 

      "Balance-Sheet Optimization", 

      "Board Representation", 

      "Breakup Of Non-Core Businesses", 

      "Capital Allocation", 

      "Corporate Separation", 

      "Governance Overhaul", 

      "Governance Reform", 

      "Sale Pressure", 

      "Sale Review", 

      "Strategic Pressure", 

      "Strategic Review", 

      "Strategic Value Unlock" 

    ], 

    "recentTargets": [ 

      "Southwest Gas Holdings", 

      "Vestis Corporation", 

      "Illumina", 

      "Fortrea Holdings", 

      "MDU Resources Group", 

      "Algonquin Power & Utilities" 

    ], 

    "thesisThemes": [ 

      "breakup advocacy", 

      "strategic reviews", 

      "board representation", 

      "capital allocation", 

      "sale pressure", 

      "coalition activism", 

      "follow-on activism" 

    ], 

    "signals": [ 

      "Monitor public letters and presentations", 

      "Track nomination windows and board refresh demands", 

      "Watch for strategic review or transaction criticism", 

      "Review peer benchmarking and governance vulnerabilities" 

    ], 

    "campaignOutcomes": [ 

      { 

        "label": "Closed", 

        "value": 10 

      }, 

      { 

        "label": "Settled", 

        "value": 3 

      }, 

      { 

        "label": "Withdrawn", 

        "value": 1 

      }, 

      { 

        "label": "Ongoing", 

        "value": 2 

      }, 

      { 

        "label": "Provisional", 

        "value": 1 

      } 

    ], 

    "activityTrend": [ 

      { 

        "year": "2012", 

        "campaigns": 2 

      }, 

      { 

        "year": "2013", 

        "campaigns": 2 

      }, 

      { 

        "year": "2015", 

        "campaigns": 1 

      }, 

      { 

        "year": "2016", 

        "campaigns": 2 

      }, 

      { 

        "year": "2017", 

        "campaigns": 1 

      }, 

      { 

        "year": "2018", 

        "campaigns": 1 

      }, 

      { 

        "year": "2019", 

        "campaigns": 1 

      }, 

      { 

        "year": "2020", 

        "campaigns": 1 

      }, 

      { 

        "year": "2022", 

        "campaigns": 2 

      }, 

      { 

        "year": "2023", 

        "campaigns": 2 

      }, 

      { 

        "year": "2024", 

        "campaigns": 2 

      }, 

      { 

        "year": "2025", 

        "campaigns": 3 

      }, 

      { 

        "year": "2026", 

        "campaigns": 1 

      } 

    ], 

    "notableTactics": [ 

      "breakup advocacy", 

      "strategic reviews", 

      "board representation", 

      "capital allocation", 

      "sale pressure", 

      "coalition activism" 

    ], 

    "prepChecklist": [ 

      "Review campaign history and recurring themes", 

      "Prepare governance and board composition response", 

      "Stress-test capital allocation and strategic alternatives narrative", 

      "Track campaign status and latest profile updates" 

    ], 

    "sourceStatus": "Uploaded JSON", 

    "lastUpdated": "2026-05-23", 

    "campaigns": [ 

      "Ralcorp Holdings (2012-08-23) - status: closed; core issue: strategic review; sale pressure; tactics: Schedule 13D, public pressure, board seat; outcome: Corvex disclosed a stake, pushed for strategic change, and secured a board seat for Keith Meister before Ralcorp later agreed to sell to ConAgra.", 

      "ADT (2012-10-00) - status: closed; core issue: balance-sheet optimization; capital allocation; tactics: presentation, board seat, negotiated exit; outcome: Corvex published a campaign deck, placed Meister on the board, and later sold most of its stake back to ADT while Meister resigned.", 

      "CommonWealth REIT / Equity Commonwealth (2013-02-26) - status: closed; core issue: governance overhaul; external-management challenge; tactics: coalition with Related, consent solicitation, proxy contest; outcome: Corvex and Related removed the prior board and won election of their entire slate, creating one of Corvex's clearest proxy victories.", 

      "The Williams Companies (2013-12-09) - status: closed; core issue: governance reform; capital-allocation improvement; tactics: Schedule 13D, coalition with Soroban, settlement; outcome: Corvex and Soroban first reached a cooperation arrangement with Williams, but Corvex later escalated publicly during merger-related disputes and pushed for deeper board change.", 

      "Yum! Brands (2015-05-01) - status: closed; core issue: China separation; capital allocation; tactics: large stake, public thesis, board seat; outcome: Corvex pressed for a separation of the China business, won a board seat for Meister, and he stepped down after the spin-off was completed.", 

      "Pandora Media (2016-05-17) - status: closed; core issue: sale pressure; strategic review; tactics: activist letter, public criticism; outcome: Corvex disclosed a large stake and urged Pandora to explore a sale instead of a costly standalone plan.", 

      "Energen (2018-01-31) - status: settled; core issue: sale review; board refresh; tactics: nomination slate, board settlement, possible bid escalation; outcome: Corvex nominated four directors, settled for two board seats, and later explored a possible bid with Carl Icahn before the company agreed to sell to Diamondback.", 

      "MGM Resorts International (2019-01-17) - status: settled; core issue: strategic value unlock; board representation; tactics: stake building, private engagement, board seat; outcome: MGM added Keith Meister to the board after constructive discussions with Corvex.", 

      "Exelon (2020-10-08) - status: closed; core issue: corporate separation; sum-of-the-parts value realization; tactics: public presentation, breakup advocacy; outcome: Exelon later approved and announced the separation of its utility and competitive-energy businesses.", 

      "Algonquin Power & Utilities (2023-04-29) - status: closed; core issue: strategic review; sale of renewables; tactics: stake building reported publicly, private engagement, shadow activism alongside other funds; outcome: Corvex was publicly linked to pressure for change at Algonquin and to the push for a renewables review and sale, but Starboard later became the more visible formal activist leading the board contest and public letters.", 

      "Anaplan (2022-03-17) - status: withdrawn; core issue: board representation; strategic pressure; tactics: Schedule 13D, coordination with JS Capital, overlapping campaign with Sachem Head; outcome: Corvex entered a coordinated activism setup at Anaplan but the campaign ended almost immediately after Thoma Bravo agreed to buy the company.", 

      "MDU Resources Group (2022-08-08) - status: settled; core issue: breakup of non-core businesses; board representation; tactics: Schedule 13D, cooperation agreement, board seat for partner; outcome: Corvex won a board seat for James H. Gemmel while MDU pursued the Knife River and Everus separations and related strategic actions.", 

      "Southwest Gas Holdings (2023-10-23) - status: ongoing; core issue: value unlock; strategic pressure; tactics: Schedule 13D, continued stake management; outcome: Corvex disclosed a major activist stake in 2023 and remained involved through 2025 before reporting that it had fallen below 5% ownership in May 2026.", 

      "Vestis Corporation (2024-05-08) - status: ongoing; core issue: operating improvement; board representation; tactics: Schedule 13D, letter agreement, board seat; outcome: Corvex built a large stake, signed a cooperation agreement, placed Meister on the board, and remained a significant holder through at least May 2025.", 

      "Illumina (2025-03-25) - status: ongoing; core issue: board representation; operational and governance influence; tactics: large ownership position, board seat; outcome: Illumina added Keith Meister to its board in March 2025, giving Corvex a direct governance role in a major recent holding.", 

      "Fortrea Holdings (2024-10-22) - status: provisional; core issue: margin improvement; sale of non-core assets; tactics: public conference thesis, follow-on activism after Starboard, stake disclosure in press reporting; outcome: Corvex publicly disclosed a Fortrea stake and activist thesis at the October 22, 2024 13D Monitor summit, but the visible formal SEC activist paper trail remained Starboard's, so the episode is kept as a provisional public-thesis campaign." 

    ], 

    "latest13F": { 

      "filingDate": "2026-05-15", 

      "periodEnd": "2026-03-31", 

      "reportedValue": "$2.5B", 

      "topHoldings": [ 

        "Illumina", 

        "Southwest Gas Holdings", 

        "Walt Disney", 

        "GeneDx Holdings", 

        "MGM Resorts International", 

        "Amazon.com", 

        "Vestis Corporation", 

        "IAC", 

        "Union Pacific", 

        "Restaurant Brands International" 

      ] 

    }, 

    "peopleSnapshot": { 

      "visiblePersonnel": [], 

      "nominees": [ 

        "Keith Meister", 

        "James H. Gemmel", 

        "Jonathan Z. Cohen", 

        "Vincent J. Intrieri" 

      ] 

    } 

  }, 

  {"id":"land-buildings","name":"Land & Buildings Investment Management, LLC","aliases":["Land & Buildings Investment Management, LLC"],"type":"Activist Investor Profile","headquarters":"Stamford, Connecticut","founded":"2008","aum":"$591.4M","confidence":"Profile loaded","strategy":"discount to NAV; real estate monetization; strategic alternatives; liquidation / capital return; board refreshment; governance reform; executive compensation discipline; capital allocation","customerSummary":"Land & Buildings is a specialist public-real-estate activist led by Jonathan Litt. Its campaigns are concentrated in REITs and real-estate-heavy companies, with recurring demands for asset monetization, strategic alternatives, liquidation, board refreshment, governance reform, and tighter capital allocation.","riskLevel":"Medium-High","engagementStyle":"Public activism / engagement","campaignCount":14,"activeCampaigns":4,"avgOwnership":"N/A","typicalAsk":"Discount To Nav","sectors":["Apartments","Reit","Gaming","Lodging","Real-Estate-Heavy","Malls","Retail Reit","Data Center","Industrial","Healthcare Reit","Development","Leisure"],"recentTargets":["First Industrial Realty Trust","National Health Investors","Equity Commonwealth","Sun Communities","Six Flags Entertainment","Aimco"],"thesisThemes":["discount to NAV","real estate monetization","strategic alternatives","liquidation / capital return","board refreshment","governance reform","executive compensation discipline","capital allocation"],"signals":["Monitor public letters and presentations","Track nomination windows and board refresh demands","Watch for strategic review or transaction criticism","Review peer benchmarking and governance vulnerabilities"],"campaignOutcomes":[{"label":"Closed","value":7},{"label":"Partially Successful","value":1},{"label":"Ongoing Or Open","value":4},{"label":"Settled","value":1},{"label":"Successful Directional Pressure","value":1}],"activityTrend":[{"year":"2013","campaigns":1},{"year":"2014","campaigns":1},{"year":"2015","campaigns":1},{"year":"2017","campaigns":1},{"year":"2018","campaigns":1},{"year":"2020","campaigns":1},{"year":"2021","campaigns":1},{"year":"2022","campaigns":3},{"year":"2024","campaigns":3},{"year":"2025","campaigns":1}],"notableTactics":["discount to NAV","real estate monetization","strategic alternatives","liquidation / capital return","board refreshment","governance reform"],"prepChecklist":["Review campaign history and recurring themes","Prepare governance and board composition response","Stress-test capital allocation and strategic alternatives narrative","Track campaign status and latest profile updates"],"sourceStatus":"Uploaded JSON","lastUpdated":"2026-05-23","campaigns":["BRE Properties (2013-12-05) - status: closed; core issue: sale / strategic alternatives; board refresh; tactics: public letter; board slate; outcome: BRE agreed to sell itself to Essex Property Trust later in December 2013.","Associated Estates Realty (2014-06-01) - status: closed; core issue: board and management change; strategic review / sale; tactics: letters; presentations; nomination threats; outcome: Campaign culminated in the company's sale to Brookfield in 2015.","MGM Resorts International (2015-03-01) - status: closed; core issue: unlock real-estate value; governance / board change; tactics: presentation; proxy campaign; public letters; outcome: Land & Buildings pressed MGM toward a REIT-oriented separation framework and broader strategic review.","Taubman Centers (2017-04-01) - status: closed; core issue: governance reform; board accountability; tactics: special meeting solicitation; litigation; letters; board nominations; outcome: Multi-year governance-heavy campaign remained one of the firm's most public mall-sector fights.","Quality Technology Services Realty Trust (2018-02-01) - status: closed; core issue: governance and leadership pressure; tactics: withhold campaign; letters; presentations; outcome: Public governance campaign centered on withholding votes.","Apartment Investment and Management Company (2020-09-01) - status: closed; core issue: force shareholder vote on reverse spin; shareholder-rights protection; tactics: preliminary solicitation; definitive solicitation; special-meeting push; outcome: High-profile governance fight around Aimco's planned separation.","Lexington Realty Trust (2021-11-15) - status: closed; core issue: board accountability; strategic review; tactics: open letter; presentation; nominations; outcome: Land & Buildings nominated Donna Brandin and Jonathan Litt during a leadership-transition period.","Ventas (2022-03-07) - status: partially_successful; core issue: board change; improve stewardship and valuation; tactics: open letter; presentations; nominee campaign; repeat engagement; outcome: The campaign did not win the 2022 seat fight, but Ventas later refreshed its board and Land & Buildings renewed pressure in 2023.","Aimco (2022-09-12) - status: ongoing_or_open; core issue: board refresh; improve governance; later pursue sale process; tactics: letters; presentation; proxy contest; sale advocacy; outcome: Campaign evolved from a board contest in 2022 into explicit sale pressure by 2025.","Six Flags Entertainment (2022-12-21) - status: ongoing_or_open; core issue: monetize real estate; highlight hidden asset value; tactics: presentation; letters; public valuation campaign; outcome: Initial 2022 campaign later re-emerged in 2025 after the legacy Six Flags / Cedar Fair combination.","Sun Communities (2024-02-15) - status: settled; core issue: board refresh; capital allocation oversight; tactics: private engagement; cooperation agreement; board additions; outcome: Sun added Jerry Ehlinger and Craig Leupold and created a capital allocation committee.","Equity Commonwealth (2024-03-13) - status: successful_directional_pressure; core issue: liquidate remaining assets; return capital to shareholders; tactics: board letter; public pressure; outcome: The company later moved into plan-of-sale and liquidation disclosures.","National Health Investors (2024-04-18) - status: ongoing_or_open; core issue: board independence; governance reform; tenant-conflict oversight; tactics: vote-against campaign; presentation; proxy fight; nominees; outcome: 2024 vote-against campaign escalated into a 2025 proxy fight with nominees Adam Troso and James Hoffmann.","First Industrial Realty Trust (2025-12-04) - status: ongoing_or_open; core issue: close discount to NAV; refresh board; push capital actions; tactics: presentation; repeated letters; vote-against campaign; nomination of Jonathan Litt; outcome: Active 2025-2026 campaign emphasizing governance discount and capital-return opportunities."],"latest13F":{"filingDate":"2026-05-15","periodEnd":"2026-03-31","reportedValue":"$591.4M","topHoldings":["First Industrial Realty Trust"]},"peopleSnapshot":{"visiblePersonnel":["Jonathan Litt - Founder & Chief Investment Officer","Craig Melcher - Principal / Investments","Corey Lorinsky - Principal / Investments","Jean Cora - Chief Financial Officer / Chief Compliance Officer"],"nominees":["Jonathan Litt","Michelle Applebaum","Jim Sullivan","Donna Brandin","James Hoffmann","Adam Troso","Jerry Ehlinger","Craig Leupold","Theodore Bigman","Joe V. Rodriguez, Jr."]}} 

  , 

  { 

    "id": "sachem-head", 

    "name": "Sachem Head Capital Management LP", 

    "aliases": [ 

      "Sachem Head Capital Management LP" 

    ], 

    "type": "Activist Investor Profile", 

    "headquarters": "N/A", 

    "founded": "2012", 

    "aum": "$4.2B", 

    "confidence": "Profile loaded", 

    "strategy": "concentrated; value-oriented; activist", 

    "customerSummary": "Sachem Head Capital Management LP is a U.S.-based activist investor founded in 2012 by Scott D. Ferguson. In the 2021-05-23 to 2026-05-23 window, the clearest public campaigns were concentrated in food distribution, software, and leisure, with a recurring emphasis on negotiated board seats, management accountability, and strategic or profitability pressure. Compared with some peers, Sachem Head's public footprint in this period looks relatively selective and often settlement-driven rather than letter-heavy.", 

    "riskLevel": "Medium-High", 

    "engagementStyle": "Public activism / engagement", 

    "campaignCount": 13, 

    "activeCampaigns": 4, 

    "avgOwnership": "N/A", 

    "typicalAsk": "Concentrated", 

    "sectors": [ 

      "Board Influence", 

      "Board Refresh", 

      "Board Representation", 

      "Governance", 

      "Governance ", 

      "Governance Reform", 

      "Profitability Improvement", 

      "Strategic Pressure", 

      "Strategic Separation", 

      "Support For Strategic Execution" 

    ], 

    "recentTargets": [ 

      "Six Flags Entertainment", 

      "Performance Food Group", 

      "Grifols", 

      "Twilio", 

      "Leonardo", 

      "Anaplan" 

    ], 

    "thesisThemes": [ 

      "concentrated", 

      "value-oriented", 

      "activist" 

    ], 

    "signals": [ 

      "Monitor public letters and presentations", 

      "Track nomination windows and board refresh demands", 

      "Watch for strategic review or transaction criticism", 

      "Review peer benchmarking and governance vulnerabilities" 

    ], 

    "campaignOutcomes": [ 

      { 

        "label": "Closed", 

        "value": 8 

      }, 

      { 

        "label": "Ongoing Or Open", 

        "value": 4 

      }, 

      { 

        "label": "Ongoing_or_open", 

        "value": 1 

      } 

    ], 

    "activityTrend": [ 

      { 

        "year": "2015", 

        "campaigns": 1 

      }, 

      { 

        "year": "2017", 

        "campaigns": 1 

      }, 

      { 

        "year": "2020", 

        "campaigns": 2 

      }, 

      { 

        "year": "2021", 

        "campaigns": 2 

      }, 

      { 

        "year": "2022", 

        "campaigns": 2 

      }, 

      { 

        "year": "2023", 

        "campaigns": 1 

      }, 

      { 

        "year": "2024", 

        "campaigns": 2 

      }, 

      { 

        "year": "2025", 

        "campaigns": 3 

      } 

    ], 

    "notableTactics": [ 

      "concentrated", 

      "value-oriented", 

      "activist" 

    ], 

    "prepChecklist": [ 

      "Review campaign history and recurring themes", 

      "Prepare governance and board composition response", 

      "Stress-test capital allocation and strategic alternatives narrative", 

      "Track campaign status and latest profile updates" 

    ], 

    "sourceStatus": "Uploaded JSON", 

    "lastUpdated": "2026-05-23", 

    "campaigns": [ 

      "Autodesk (2015-11-04) - status: closed; core issue: board refresh; CEO succession; tactics: Schedule 13D, settlement, board representation; outcome: Autodesk settled in March 2016 and added Scott Ferguson, Rick Hill, and Jeff Clarke to the board; Reuters later reported Ferguson planned to exit after a new CEO was selected.", 

      "Whitbread (2017-12-01) - status: closed; core issue: strategic separation; break-up analysis; tactics: stake building, private pressure reported publicly; outcome: Reuters reported Sachem Head pushed Whitbread to consider separating Costa Coffee; Whitbread later moved to spin off Costa.", 

      "Olin (2020-02-29) - status: closed; core issue: board representation; governance reform; tactics: cooperation agreement, board seats; outcome: Olin added Scott Ferguson and W. Barnes Hauptfuhrer to the board and agreed to pursue declassification.", 

      "Elanco Animal Health (2020-10-07) - status: closed; core issue: board refresh; operational accountability; tactics: Schedule 13D, cooperation agreement, board seats; outcome: Sachem Head filed a 13D, then Elanco announced a cooperation agreement adding Scott Ferguson and Paul Herendeen to the board.", 

      "International Flavors & Fragrances (2021-02-10) - status: closed; core issue: board influence; post-merger integration / synergy execution; tactics: large stake, nomination threat, cooperation agreement; outcome: Reuters reported a roughly $1 billion stake and four nominees; IFF later announced an agreement giving Ferguson an option to join the board.", 

      "US Foods (2021-10-05) - status: closed; core issue: board reconstitution; CEO replacement; tactics: Schedule 13D, public letter, proxy fight; outcome: Sachem Head launched a major proxy fight, settled in May 2022 for three board seats and a CEO search process, later terminated the cooperation agreement in February 2024, and sold shares back to the company in August 2024.", 

      "Anaplan (2022-02-24) - status: closed; core issue: board representation; strategic pressure; tactics: stake building, nomination notice, stockholder proposals; outcome: Reuters first reported Sachem Head had built roughly 9% economic exposure; Sachem Head then filed a Schedule 13D, coordinated with Corvex, and prepared a slate of nominees before withdrawing proposals and nominations after Thoma Bravo agreed to acquire Anaplan.", 

      "Leonardo (2023-04-17) - status: closed; core issue: board representation; support for strategic execution; tactics: minority slate submission, coalition with GreenWood and Banor, AGM board election; outcome: Sachem Head co-sponsored the minority slate submitted through GreenWood Investors; four directors from that slate were elected to Leonardo's board at the May 9, 2023 shareholders' meeting.", 

      "Grifols (2024-09-19) - status: ongoing_or_open; core issue: board representation; governance reform; tactics: investor group, public board-seat demand, proportional representation request; outcome: Sachem Head joined Flat Footed and Mason Capital in a shareholder group holding 7.72% of Grifols class A shares, sought a board seat for Paul Herendeen, secured his appointment by co-option in December 2024, and his designation was later ratified in 2025.", 

      "Twilio (2024-03-11) - status: ongoing_or_open; core issue: board representation; profitability improvement; tactics: nomination notice, shareholder proposals, cooperation agreement; outcome: Twilio and Sachem Head settled on March 30, 2024; Andy Stafman joined the board and Sachem Head withdrew its 2024 nominations and proposals.", 

      "Performance Food Group (2025-08-21) - status: ongoing_or_open; core issue: profitability improvement; strategic review; tactics: private nominations, merger pressure, cooperation agreement; outcome: Sachem Head privately nominated four directors, then settled on September 23, 2025 for a board seat for Scott Ferguson.", 

      "Six Flags Entertainment (2025-10-17) - status: ongoing_or_open; core issue: board representation; governance and operating accountability; tactics: cooperation agreement, board seat, derivative exposure; outcome: Six Flags added Jonathan Brudnick to the board on October 17, 2025 and disclosed derivative agreements referencing 4,995,000 shares." 

    ], 

    "latest13F": { 

      "filingDate": "2026-05-15", 

      "periodEnd": "2026-03-31", 

      "reportedValue": "$4.2B", 

      "topHoldings": [ 

        "Talen Energy", 

        "EchoStar", 

        "GDS Holdings", 

        "Primo Brands", 

        "Dick's Sporting Goods", 

        "Twilio", 

        "Performance Food Group", 

        "Carvana", 

        "Weatherford International", 

        "ICON plc", 

        "Gildan Activewear", 

        "Coherent", 

        "Sotera Health", 

        "ON Semiconductor", 

        "Six Flags Entertainment", 

        "Bitdeer Technologies Group", 

        "Invesco S&P 500 Equal Weight ETF", 

        "Sprinklr", 

        "Akamai Technologies" 

      ] 

    }, 

    "peopleSnapshot": { 

      "visiblePersonnel": [ 

        "Scott D. Ferguson", 

        "Andy Stafman", 

        "Jonathan Brudnick", 

        "Michael Adamski" 

      ], 

      "nominees": [ 

        "W. Barnes Hauptfuhrer", 

        "Paul Herendeen", 

        "David A. Toy", 

        "James J. Barber, Jr." 

      ] 

    } 

  }, 

  { 

    "id": "starboard-value", 

    "name": "Starboard Value", 

    "aliases": [ 

      "Starboard Value" 

    ], 

    "type": "Activist Investor Profile", 

    "headquarters": "N/A", 

    "founded": "N/A", 

    "aum": "N/A", 

    "confidence": "Profile loaded", 

    "strategy": "growth plus profitability; margin expansion; board refreshment; accountability for missed targets; capital allocation; strategic alternatives", 

    "customerSummary": "Starboard Value is a U.S. activist investor led by Jeff Smith. In the 2021-05-23 to 2026-05-23 window, the clearest public campaigns were concentrated in software, internet, restaurants, utilities, and governance-heavy media situations. The dominant pattern was operational activism tied to margin expansion, board accountability, capital allocation, and strategic-alternative pressure, with escalation from private engagement to letters, decks, proxy materials, or nomination notices when needed.", 

    "riskLevel": "Medium-High", 

    "engagementStyle": "Public activism / engagement", 

    "campaignCount": 10, 

    "activeCampaigns": 0, 

    "avgOwnership": "N/A", 

    "typicalAsk": "Growth Plus Profitability", 

    "sectors": [ 

      "Chemicals", 

      "Cloud", 

      "Consumer", 

      "Consumer-Tech", 

      "Conversational-Ai", 

      "Enterprise-Software", 

      "Governance", 

      "Internet", 

      "Media", 

      "Power", 

      "Restaurants", 

      "Software" 

    ], 

    "recentTargets": [ 

      "Autodesk", 

      "Match Group", 

      "News Corp", 

      "Salesforce", 

      "Bloomin' Brands", 

      "Algonquin Power & Utilities" 

    ], 

    "thesisThemes": [ 

      "growth plus profitability", 

      "margin expansion", 

      "board refreshment", 

      "accountability for missed targets", 

      "capital allocation", 

      "strategic alternatives", 

      "governance reform", 

      "pressure on entrenched control structures" 

    ], 

    "signals": [ 

      "Monitor public letters and presentations", 

      "Track nomination windows and board refresh demands", 

      "Watch for strategic review or transaction criticism", 

      "Review peer benchmarking and governance vulnerabilities" 

    ], 

    "campaignOutcomes": [ 

      { 

        "label": "Reviewed", 

        "value": 10 

      } 

    ], 

    "activityTrend": [ 

      { 

        "year": "2021", 

        "campaigns": 1 

      }, 

      { 

        "year": "2022", 

        "campaigns": 5 

      }, 

      { 

        "year": "2023", 

        "campaigns": 4 

      }, 

      { 

        "year": "2024", 

        "campaigns": 4 

      }, 

      { 

        "year": "2025", 

        "campaigns": 1 

      } 

    ], 

    "notableTactics": [ 

      "growth plus profitability", 

      "margin expansion", 

      "board refreshment", 

      "accountability for missed targets", 

      "capital allocation", 

      "strategic alternatives" 

    ], 

    "prepChecklist": [ 

      "Review campaign history and recurring themes", 

      "Prepare governance and board composition response", 

      "Stress-test capital allocation and strategic alternatives narrative", 

      "Track campaign status and latest profile updates" 

    ], 

    "sourceStatus": "Uploaded JSON", 

    "lastUpdated": "2026-05-23", 

    "campaigns": [ 

      "GoDaddy (2022, 2023) - status: reviewed; core issue: internet; software; tactics: N/A; outcome: Not separately stated in JSON", 

      "LivePerson (2022, 2023) - status: reviewed; core issue: software; conversational-ai; tactics: N/A; outcome: Not separately stated in JSON", 

      "Bloomin' Brands (2023, 2024) - status: reviewed; core issue: restaurants; consumer; tactics: N/A; outcome: Not separately stated in JSON", 

      "Algonquin Power & Utilities (2023, 2024) - status: reviewed; core issue: utilities; power; tactics: N/A; outcome: Not separately stated in JSON", 

      "Match Group (2024) - status: reviewed; core issue: internet; consumer-tech; tactics: N/A; outcome: Not separately stated in JSON", 

      "Autodesk (2024, 2025) - status: reviewed; core issue: software; tactics: N/A; outcome: Not separately stated in JSON", 

      "News Corp (2024) - status: reviewed; core issue: media; governance; tactics: N/A; outcome: Not separately stated in JSON", 

      "Box (2021) - status: reviewed; core issue: software; cloud; tactics: N/A; outcome: Not separately stated in JSON", 

      "Huntsman (2022) - status: reviewed; core issue: chemicals; tactics: N/A; outcome: Not separately stated in JSON", 

      "Salesforce (2022, 2023, 2024) - status: reviewed; core issue: enterprise-software; tactics: N/A; outcome: Not separately stated in JSON" 

    ], 

    "latest13F": null, 

    "peopleSnapshot": { 

      "visiblePersonnel": [], 

      "nominees": [ 

        "Brett Carter", 

        "Christopher Lopez", 

        "Rob Schriesheim", 

        "Peter A. Feld", 

        "John R. McCormack", 

        "Vanessa Pegueros", 

        "Yael Zheng", 

        "Dave George", 

        "Jon Sagal", 

        "Geoff Ribar", 

        "Christie Simons", 

        "Jeff Epstein", 

        "Jeffrey C. Smith", 

        "Jeff Epstein" 

      ] 

    } 

  } 

]; 

 

const riskStyles = { 

  High: "bg-red-50 text-red-700 border-red-200", 

  "Medium-High": "bg-orange-50 text-orange-700 border-orange-200", 

  Medium: "bg-amber-50 text-amber-700 border-amber-200", 

  Low: "bg-emerald-50 text-emerald-700 border-emerald-200", 

}; 

 

function extractCampaignYears(campaign) { 

  return String(campaign).match(new RegExp("[12][0-9]{3}", "g"))?.map(Number) || []; 

} 

 

function extractCampaignDates(campaign) { 

  return String(campaign).match(new RegExp("[12][0-9]{3}-[0-9]{2}(?:-[0-9]{2})?", "g")) || []; 

} 

 

function formatDateDDMMYYYY(value) { 

  const text = String(value || ""); 

  const monthNames = { 

    "01": "Jan", 

    "02": "Feb", 

    "03": "Mar", 

    "04": "Apr", 

    "05": "May", 

    "06": "Jun", 

    "07": "Jul", 

    "08": "Aug", 

    "09": "Sep", 

    "10": "Oct", 

    "11": "Nov", 

    "12": "Dec", 

  }; 

 

  const fullDateMatch = text.match(new RegExp("^([12][0-9]{3})-([0-9]{2})-([0-9]{2})$")); 

  if (fullDateMatch) { 

    return `${monthNames[fullDateMatch[2]] || fullDateMatch[2]} ${fullDateMatch[1]}`; 

  } 

 

  const yearMonthMatch = text.match(new RegExp("^([12][0-9]{3})-([0-9]{2})$")); 

  if (yearMonthMatch) { 

    return `${monthNames[yearMonthMatch[2]] || yearMonthMatch[2]} ${yearMonthMatch[1]}`; 

  } 

 

  return text; 

} 

 

function formatDatesInText(value) { 

  return String(value || "").replace(new RegExp("[12][0-9]{3}-[0-9]{2}(?:-[0-9]{2})?", "g"), (match) => formatDateDDMMYYYY(match)); 

} 

 

function firstCampaignYear(campaign) { 

  const dates = extractCampaignDates(campaign); 

  if (dates.length) return dates[0].slice(0, 4); 

 

  const years = extractCampaignYears(campaign); 

  return years.length ? Math.min(...years) : "N/A"; 

} 

 

function latestCampaignYear(campaign) { 

  const years = extractCampaignYears(campaign); 

  return years.length ? Math.max(...years) : 0; 

} 

 

function sortCampaignsNewestFirst(campaigns = []) { 

  return [...campaigns].sort((a, b) => latestCampaignYear(b) - latestCampaignYear(a)); 

} 

 

function splitCampaign(campaign) { 

  const [targetPart, ...detailParts] = String(campaign).split(" - "); 

  const years = extractCampaignYears(campaign); 

  const details = detailParts.join(" - ") || "Campaign detail available in JSON"; 

  const formattedDetails = formatDatesInText(details); 

  const lower = details.toLowerCase(); 

  let status = "Reviewed"; 

  if (lower.includes("ongoing") || String(campaign).toLowerCase().includes("present")) status = "Ongoing"; 

  if (lower.includes("settlement") || lower.includes("settled") || lower.includes("cooperation agreement")) status = "Settled"; 

  if (lower.includes("withdrawn")) status = "Withdrawn"; 

  if (lower.includes("closed")) status = "Closed"; 

  const coreIssue = formattedDetails 

    .replaceAll("core issue:", "") 

    .replaceAll("status: closed;", "") 

    .replaceAll("status: settled;", "") 

    .replaceAll("status: ongoing;", "") 

    .replaceAll("status: withdrawn;", "") 

    .replaceAll("status: reviewed;", "") 

    .replaceAll("status: provisional;", "") 

    .replaceAll("status: contested;", "") 

    .replaceAll("status: partial outcome;", "") 

    .replaceAll("outcome:", "") 

    .trim(); 

  return { 

    target: formatDatesInText(targetPart || "Unknown campaign"), 

    period: firstCampaignYear(campaign), 

    years: years.length ? years.join(", ") : "N/A", 

    latestYear: years.length ? Math.max(...years) : "N/A", 

    status, 

    coreIssue, 

    details: formattedDetails, 

    raw: formatDatesInText(campaign), 

  }; 

} 

 

function deriveCampaignFocus(profile) { 

  const sectorValues = (profile.sectors || []).filter((sector) => sector && sector !== "N/A"); 

  if (sectorValues.length) return sectorValues; 

 

  return Array.from( 

    new Set( 

      (profile.campaigns || []) 

        .map((campaign) => splitCampaign(campaign).details) 

        .flatMap((details) => details.split(new RegExp("[,/]", "g")).map((item) => item.trim())) 

        .filter(Boolean) 

    ) 

  ).slice(0, 10); 

} 

 

function derivePrimaryPattern(profile) { 

  const focus = deriveCampaignFocus(profile); 

  return focus[0] || profile.thesisThemes?.[0] || "N/A"; 

} 

 

function normalizeThesisLabel(label) { 

  const text = String(label || "").toLowerCase(); 

  if (text.includes("capital allocation") || text.includes("buyback") || text.includes("capital return")) return "Capital Allocation"; 

  if (text.includes("margin") || text.includes("profitability") || text.includes("operating") || text.includes("performance")) return "Operating Performance"; 

  if (text.includes("board") || text.includes("governance") || text.includes("leadership") || text.includes("accountability")) return "Governance / Board Change"; 

  if (text.includes("transaction") || text.includes("m&a") || text.includes("merger") || text.includes("sale") || text.includes("strategic alternatives")) return "Strategic Alternatives / M&A"; 

  if (text.includes("spin") || text.includes("separation") || text.includes("breakup")) return "Breakup / Separation"; 

  if (text.includes("coalition") || text.includes("settlement") || text.includes("proxy")) return "Escalation / Settlement"; 

  if (text.includes("real estate") || text.includes("reit") || text.includes("nav")) return "Real Estate / NAV"; 

  return label; 

} 

 

function getThesisIcon(label) { 

  const normalized = normalizeThesisLabel(label); 

  if (normalized === "Capital Allocation") return Briefcase; 

  if (normalized === "Operating Performance") return TrendingUp; 

  if (normalized === "Governance / Board Change") return ShieldCheck; 

  if (normalized === "Strategic Alternatives / M&A") return Scale; 

  if (normalized === "Breakup / Separation") return FileText; 

  if (normalized === "Escalation / Settlement") return MessageSquareQuote; 

  if (normalized === "Real Estate / NAV") return Building2; 

  return Target; 

} 

 

function formatThemeLabel(label) { 

  const normalized = normalizeThesisLabel(label); 

 

  const mapping = { 

    "Capital Allocation": "Capital Allocation", 

    "Operating Performance": "Operating Performance", 

    "Governance / Board Change": "Governance / Board Change", 

    "Strategic Alternatives / M&A": "Strategic Alternatives / M&A", 

    "Breakup / Separation": "Breakup / Separation", 

    "Escalation / Settlement": "Escalation / Settlement", 

    "Real Estate / NAV": "Real Estate / NAV", 

  }; 

 

  return mapping[normalized] || normalized; 

} 

 

function getUnifiedThesisItems(profile) { 

  const items = [...(profile.thesisThemes || [])]; 

  const seen = new Set(); 

 

  return items 

    .map((item) => formatThemeLabel(item)) 

    .filter((item) => { 

      const key = String(item).toLowerCase(); 

      if (!key || key === "n/a" || seen.has(key)) return false; 

      seen.add(key); 

      return true; 

    }); 

} 

 

function getLatest13FSnapshot(profile) { 

  return profile.latest13F || null; 

} 

 

function getPeopleSnapshot(profile) { 

  return profile.peopleSnapshot || { visiblePersonnel: [], nominees: [] }; 

} 

 

function formatUsdMillions(value) { 

  const numericValue = Number(value); 

  if (!Number.isFinite(numericValue)) return "N/A"; 

  return `$${numericValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`; 

} 

 

function normalizeHolding(holding, index) { 

  if (typeof holding === "string") { 

    return { 

      rank: index + 1, 

      issuer: holding, 

      value: "N/A", 

      shares: "N/A", 

    }; 

  } 

 

  let valueInMillions = null; 

  if (holding.value_usd_thousands) valueInMillions = Number(holding.value_usd_thousands) / 1000; 

  else if (holding.value_usd) valueInMillions = Number(holding.value_usd) / 1000000; 

  else if (holding.value) valueInMillions = Number(holding.value) / 1000000; 

 

  return { 

    rank: holding.rank || index + 1, 

    issuer: holding.issuer || holding.name || holding.company || "N/A", 

    value: valueInMillions !== null ? formatUsdMillions(valueInMillions) : "N/A", 

    shares: holding.shares ? Number(holding.shares).toLocaleString() : holding.shares_or_principal || "N/A", 

  }; 

} 

 

function getFull13FHoldings(snapshot) { 

  const holdings = Array.isArray(snapshot?.holdings) 

    ? snapshot.holdings 

    : Array.isArray(snapshot?.topHoldings) 

      ? snapshot.topHoldings 

      : []; 

 

  return holdings.map((holding, index) => normalizeHolding(holding, index)); 

} 

 

function getPersonName(person) { 

  if (typeof person === "object" && person !== null) return String(person.name || "").trim(); 

  return String(person || "").split(" - ")[0].trim(); 

} 

 

function getPersonRole(person) { 

  if (typeof person !== "object" || person === null) return ""; 

  return person.role || person.role_or_context || ""; 

} 

 

function getPersonNote(person) { 

  if (typeof person !== "object" || person === null) return ""; 

  return person.public_note || person.linkedin_note || ""; 

} 

 

function getPersonLinkedInUrl(person) { 

  if (typeof person === "object" && person !== null) { 

    return person.linkedinUrl || person.linkedin_url || person.url || ""; 

  } 

  return ""; 

} 

function getLinkedInSearchUrl(name) { 
  const cleanName = getPersonName(name); 
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(cleanName)}`; 
} 

 

function getCrossCampaignObservations(profile) { 

  const themes = getUnifiedThesisItems(profile).slice(0, 4); 

  const recent = sortCampaignsNewestFirst(profile.campaigns).slice(0, 3).map((campaign) => splitCampaign(campaign).target); 

  return [ 

    `Recurring campaign focus: ${themes.join(", ") || "not specified in JSON"}.`, 

    `Most recent visible situations include ${recent.join(", ") || "not specified in JSON"}.`, 

    `Campaign pattern spans ${profile.campaignCount} tracked situations, with ${profile.activeCampaigns} active or ongoing situations flagged in the dashboard.`, 

  ]; 

} 

 

 

 

function MetricCard({ icon: Icon, label, value, detail }) { 

  return ( 

    <Card className="rounded-2xl shadow-sm border-slate-200 bg-white"> 

      <CardContent className="p-5"> 

        <div className="flex items-start justify-between gap-3"> 

          <div> 

            <p className="text-sm text-slate-500">{label}</p> 

            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p> 

            {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>} 

          </div> 

          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"> 

            <Icon className="h-5 w-5" /> 

          </div> 

        </div> 

      </CardContent> 

    </Card> 

  ); 

} 

 

function InfoList({ title, items, icon: Icon }) { 

  return ( 

    <Card className="rounded-2xl shadow-sm border-slate-200 bg-white"> 

      <CardHeader className="pb-3"> 

        <CardTitle className="flex items-center gap-2 text-base text-slate-950"> 

          <Icon className="h-4 w-4 text-slate-500" /> {title} 

        </CardTitle> 

      </CardHeader> 

      <CardContent className="space-y-2 pt-0"> 

        {items.map((item) => ( 

          <div key={item} className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"> 

            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> 

            <span>{item}</span> 

          </div> 

        ))} 

      </CardContent> 

    </Card> 

  ); 

} 

 

function PeopleList({ title, items, icon: Icon }) { 

  return ( 

    <Card className="rounded-2xl shadow-sm border-slate-200 bg-white"> 

      <CardHeader className="pb-3"> 

        <CardTitle className="flex items-center gap-2 text-base text-slate-950"> 

          <Icon className="h-4 w-4 text-slate-500" /> {title} 

        </CardTitle> 

      </CardHeader> 

      <CardContent className="space-y-3 pt-0"> 

        {items.map((item, index) => { 

          const label = getPersonName(item); 

          const role = getPersonRole(item); 

          const note = getPersonNote(item); 

          const directLinkedInUrl = getPersonLinkedInUrl(item); 

          const url = directLinkedInUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(label)}`; 

          const isPlaceholder = String(label).toLowerCase().startsWith("no "); 

 

          return ( 

            <div key={`${label}-${role}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700"> 

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"> 

                <div> 

                  <p className="font-semibold text-slate-950">{label}</p> 

                  {role ? <p className="mt-1 text-xs leading-5 text-slate-500">{role}</p> : null} 

                  {note && !String(note).toLowerCase().includes("not confidently identified") ? ( 

                    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> 

                  ) : null} 

                   

                </div> 

 

                {!isPlaceholder ? ( 

                  <a 

                    href={url} 

                    target="_blank" 

                    rel="noopener noreferrer" 

                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm hover:border-red-200 hover:text-red-600" 

                  > 

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-1.336-.025-3.056-1.861-3.056-1.863 0-2.148 1.455-2.148 2.96v5.7h-3v-11h2.881v1.507h.041c.401-.761 1.381-1.562 2.844-1.562 3.042 0 3.604 2.002 3.604 4.604v6.451z"/></svg> LinkedIn 

                  </a> 

                ) : null} 

              </div> 

            </div> 

          ); 

        })} 

      </CardContent> 

    </Card> 

  ); 

} 

 

export default function ActivistInvestorProfileDashboard() { 

  

  const [selectedId, setSelectedId] = useState(investorProfiles[0].id); 

  

  const [riskFilter, setRiskFilter] = useState("all"); 

 

  const filteredProfiles = useMemo(() => { 
    return investorProfiles.filter((profile) => { 
      const riskMatch = riskFilter === "all" || profile.riskLevel === riskFilter; 
      return riskMatch; 
    }); 
  }, [riskFilter]); 

 

  const selectedProfile = useMemo(() => { 

    return filteredProfiles.find((profile) => profile.id === selectedId) || filteredProfiles[0] || investorProfiles[0]; 

  }, [filteredProfiles, selectedId]); 

 

  const sortedCampaigns = useMemo(() => sortCampaignsNewestFirst(selectedProfile.campaigns), [selectedProfile]); 

  const campaignFocus = useMemo(() => deriveCampaignFocus(selectedProfile), [selectedProfile]); 

  const primaryPattern = useMemo(() => derivePrimaryPattern(selectedProfile), [selectedProfile]); 

  const unifiedThesisItems = useMemo(() => getUnifiedThesisItems(selectedProfile), [selectedProfile]); 

  const latest13F = useMemo(() => getLatest13FSnapshot(selectedProfile), [selectedProfile]); 

  const peopleSnapshot = useMemo(() => getPeopleSnapshot(selectedProfile), [selectedProfile]); 

  const crossCampaignObservations = useMemo(() => getCrossCampaignObservations(selectedProfile), [selectedProfile]); 

 

  const allRisks = Array.from(new Set(investorProfiles.map((profile) => profile.riskLevel))); 

 

  return ( 

    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8"> 

      <div className="mx-auto max-w-7xl space-y-6"> 

        <div className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm"> 

          <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8"> 

            <div> 

              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl"> 

                <span className="text-red-600">Activist Intelligence Dashboard</span> 

              </h1> 

            </div> 

 

            <div className="relative z-50 w-full md:w-[360px]"> 
              <TomSelect
                value={selectedProfile.id}
                onChange={(event) => setSelectedId(String(event.target.value))}
                options={{
                  placeholder: "Search investor profiles...",
                  closeAfterSelect: true,
                }}
                className="w-full text-[15px]"
              >
                {filteredProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} / {profile.headquarters}
                  </option>
                ))}
              </TomSelect>
            </div>

          </div> 

        </div> 

 

        <div className="grid gap-5 lg:grid-cols-[1fr]"> 

           

 

          <div key={selectedProfile.id} className="space-y-5"> 

            <Card className="rounded-3xl border-slate-200 bg-white shadow-sm"> 

              <CardContent className="p-6"> 

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"> 

                  <div> 

                    <div className="flex flex-wrap items-center gap-2"> 

                      <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 text-slate-600"> 

                        Updated {formatDateDDMMYYYY(selectedProfile.lastUpdated)} 

                      </Badge> 

                    </div> 

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{selectedProfile.name}</h2> 

                    <p className="mt-2 text-sm text-slate-500"> 

                      {selectedProfile.type} • {selectedProfile.headquarters} • Founded {selectedProfile.founded} 

                    </p> 

                    <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">{selectedProfile.customerSummary}</p> 

                  </div> 

                  </div> 

              </CardContent> 

            </Card> 

 

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"> 

              <MetricCard icon={Briefcase} label="Estimated AUM" value={selectedProfile.aum} detail="From profile summary" /> 

              <MetricCard icon={Target} label="Tracked Campaigns" value={selectedProfile.campaignCount} detail="Historical profile count" /> 

              <MetricCard icon={TrendingUp} label="Active Campaigns" value={selectedProfile.activeCampaigns} detail="Current watchlist" /> 

            </div> 

 

            <Tab.Group as="div" className="space-y-5"> 

              <Tab.List variant="boxed-tabs" className="grid h-auto grid-cols-2 rounded-2xl bg-slate-100 p-1 md:grid-cols-4"> 

                <Tab fullWidth={false}> 
                  <Tab.Button as="button" className="w-full rounded-xl">Summary</Tab.Button> 
                </Tab> 

                <Tab fullWidth={false}> 
                  <Tab.Button as="button" className="w-full rounded-xl">Campaigns</Tab.Button> 
                </Tab> 

                <Tab fullWidth={false}> 
                  <Tab.Button as="button" className="w-full rounded-xl">13F</Tab.Button> 
                </Tab> 

                <Tab fullWidth={false}> 
                  <Tab.Button as="button" className="w-full rounded-xl">People</Tab.Button> 
                </Tab> 

              </Tab.List> 

              <Tab.Panels> 

              <Tab.Panel className="space-y-5"> 

                <div className="grid gap-5 xl:grid-cols-2"> 

                  <InfoList title="Key Campaign Observations" items={crossCampaignObservations} icon={MessageSquareQuote} /> 

                </div> 

 

                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"> 

                  <CardHeader> 

                    <CardTitle className="flex items-center gap-2 text-base"> 

                      <Target className="h-4 w-4 text-slate-500" /> Key Thesis & Campaign Focus 

                    </CardTitle> 

                  </CardHeader> 

                  <CardContent> 

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"> 

                      {unifiedThesisItems.map((theme) => { 

                        const ThemeIcon = getThesisIcon(theme); 

                        return ( 

                          <div key={theme} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"> 

                            <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm"> 

                              <ThemeIcon className="h-4 w-4" /> 

                            </div> 

                            <div> 

                              <p className="text-sm font-semibold text-slate-950">{theme}</p> 

                              <div className="mt-2 flex flex-wrap gap-1"> 

                                {selectedProfile.recentTargets.slice(0, 4).map((target) => ( 

                                  <span 

                                    key={`${theme}-${target}`} 

                                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600" 

                                  > 

                                    {target} 

                                  </span> 

                                ))} 

                              </div> 

                            </div> 

                          </div> 

                        ); 

                      })} 

                    </div> 

                  </CardContent> 

                </Card> 

              </Tab.Panel> 

              <Tab.Panel className="space-y-5"> 

                <div className="grid gap-5 xl:grid-cols-[320px_1fr]"> 

                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"> 

                    <CardHeader> 

                      <CardTitle className="flex items-center gap-2 text-base"> 

                        <Scale className="h-4 w-4 text-slate-500" /> Campaign Outcomes 

                      </CardTitle> 

                    </CardHeader> 

                    <CardContent className="h-72"> 

                      <ResponsiveContainer width="100%" height="100%"> 

                        <BarChart data={selectedProfile.campaignOutcomes}> 

                          <CartesianGrid strokeDasharray="3 3" /> 

                          <XAxis dataKey="label" tick={{ fontSize: 12 }} /> 

                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} /> 

                          <Tooltip /> 

                          <Bar dataKey="value" radius={[10, 10, 0, 0]} /> 

                        </BarChart> 

                      </ResponsiveContainer> 

                    </CardContent> 

                  </Card> 

 

                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"> 

                    <CardHeader> 

                      <CardTitle className="flex items-center gap-2 text-base"> 

                        <FileText className="h-4 w-4 text-slate-500" /> Campaign Details & Full Campaign List 

                      </CardTitle> 

                    </CardHeader> 

                    <CardContent> 

                      <div className="overflow-x-auto"> 

                        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm"> 

                          <thead> 

                            <tr className="text-xs uppercase tracking-wide text-slate-500"> 

                              <th className="px-3 py-2 font-medium">Target</th> 

                              <th className="px-3 py-2 font-medium">Period</th> 

                              <th className="px-3 py-2 font-medium">Status</th> 

                              <th className="px-3 py-2 font-medium">Core Issue</th> 

                               

                            </tr> 

                          </thead> 

                          <tbody> 

                            {sortedCampaigns.map((campaign, index) => { 

                              const parsed = splitCampaign(campaign); 

                              return ( 

                                <tr key={`${campaign}-row-${index}`}> 

                                  <td className="rounded-l-2xl border-y border-l border-slate-100 bg-slate-50 px-3 py-3 font-semibold text-slate-950 align-top"> 

                                    {parsed.target} 

                                  </td> 

                                  <td className="border-y border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 align-top"> 

                                    {parsed.period} 

                                  </td> 

                                  <td className="border-y border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 align-top"> 

                                    <Badge variant="secondary" className="rounded-full bg-white text-slate-700"> 

                                      {parsed.status} 

                                    </Badge> 

                                  </td> 

                                  <td className="border-y border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 leading-6 align-top"> 

                                    {parsed.coreIssue} 

                                  </td> 

                                   

                                </tr> 

                              ); 

                            })} 

                          </tbody> 

                        </table> 

                      </div> 

                    </CardContent> 

                  </Card> 

                </div> 

              </Tab.Panel> 

              <Tab.Panel className="space-y-5"> 

                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"> 

                  <CardHeader> 

                    <CardTitle className="flex items-center gap-2 text-base"> 

                      <Briefcase className="h-4 w-4 text-slate-500" /> 13F Snapshot 

                    </CardTitle> 

                  </CardHeader> 

                  <CardContent> 

                    {latest13F ? ( 

                      <div className="space-y-5"> 

                        <div className="grid gap-4 md:grid-cols-3"> 

                          <MetricCard icon={CalendarDays} label="Filing Date" value={formatDateDDMMYYYY(latest13F.filingDate)} detail="13F filing" /> 

                          <MetricCard icon={CalendarDays} label="Period End" value={formatDateDDMMYYYY(latest13F.periodEnd)} detail="Reporting period" /> 

                          <MetricCard icon={Briefcase} label="Reported Value" value={latest13F.reportedValue} detail="Portfolio value" /> 

                        </div> 

                        <div> 

                          <p className="text-sm font-medium text-slate-950">Full 13F Holdings Table</p> 

                          <div className="mt-3 overflow-x-auto"> 

                            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm"> 

                              <thead> 

                                <tr className="text-xs uppercase tracking-wide text-slate-500"> 

                                  <th className="px-3 py-2 font-medium">Rank</th> 

                                  <th className="px-3 py-2 font-medium">Issuer</th> 

                                  <th className="px-3 py-2 font-medium">Value</th> 

                                  <th className="px-3 py-2 font-medium">Shares</th> 

                                </tr> 

                              </thead> 

                              <tbody> 

                                {getFull13FHoldings(latest13F).map((holding) => ( 

                                  <tr key={`${holding.rank}-${holding.issuer}`}> 

                                    <td className="rounded-l-2xl border-y border-l border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 align-top"> 

                                      {holding.rank} 

                                    </td> 

                                    <td className="border-y border-slate-100 bg-slate-50 px-3 py-3 font-semibold text-slate-950 align-top"> 

                                      {holding.issuer} 

                                    </td> 

                                    <td className="border-y border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 align-top"> 

                                      {holding.value} 

                                    </td> 

                                    <td className="rounded-r-2xl border-y border-r border-slate-100 bg-slate-50 px-3 py-3 text-slate-700 align-top"> 

                                      {holding.shares} 

                                    </td> 

                                  </tr> 

                                ))} 

                              </tbody> 

                            </table> 

                          </div> 

                        </div> 

                      </div> 

                    ) : ( 

                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500"> 

                        No 13F snapshot was included for this investor in the uploaded JSON. 

                      </div> 

                    )} 

                  </CardContent> 

                </Card> 

              </Tab.Panel> 

              <Tab.Panel className="space-y-5"> 

                <div className="grid gap-5 xl:grid-cols-2"> 

                  <PeopleList title="Visible Personnel" items={peopleSnapshot.visiblePersonnel.length ? peopleSnapshot.visiblePersonnel : ["No visible personnel included in uploaded JSON"]} icon={Users} /> 

                  <PeopleList title="Nominees / Appointees Noted" items={peopleSnapshot.nominees.length ? peopleSnapshot.nominees : ["No nominees included in uploaded JSON"]} icon={ShieldCheck} /> 

                </div> 

              </Tab.Panel> 

              </Tab.Panels> 

            </Tab.Group> 

 

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm"> 
              Source status: {selectedProfile.sourceStatus}. This prototype expects each Profiler output to include normalized profile metadata, thesis themes, campaign outcomes, warning signals, and customer-ready preparation guidance. 
            </div> 
          </div> 
        </div> 
      </div> 
    </div> 
  ); 
} 