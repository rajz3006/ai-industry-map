// Curated Step 1 (Business & Moat) and Step 2 (Industry Structure & Cycle Position) reference
// data for the Evaluator tab, covering all 57 symbols tracked in src/data/tickers.ts. This is an
// LLM-curated first pass as of October 2026, built primarily from general training-data knowledge
// of each company's business model, competitive position, and sector structure (applying the
// Morningstar/Dorsey moat taxonomy and HHI/CR4/cycle-mosaic framework documented in
// `reports/Stock evaluation framework metrics.md` and `research_notes/Stock evaluation framework
// metrics/step1_2_moat_industry_cycle.md`) rather than a fresh, filing-by-filing verification pass
// for every ticker. Moat durability and industry structure change slowly relative to the live
// price/fundamentals data elsewhere in this app, but this snapshot should still be periodically
// spot-checked and refreshed, especially for smaller/speculative names where competitive position
// can shift quickly. Nothing in this file is investment advice — it is a structured research
// starting point for further due diligence, not a recommendation to buy, sell, or hold any security.

import type { StepMetric, StepScore, StepVerdict } from "@/lib/evaluation/types";

export type StepScoreInput = Omit<StepScore, "step" | "name">;

// Shared citation labels reused across entries.
const RESEARCH_NOTE =
  "research_notes/Stock evaluation framework metrics/step1_2_moat_industry_cycle.md";
const MORNINGSTAR_MOAT =
  "Morningstar Economic Moat Rating methodology (ROIC>WACC gate; network effect / switching costs / cost advantage / intangible assets / efficient scale taxonomy)";
const HHI_CR4 =
  "DOJ/FTC 2023 Merger Guidelines; CR4 concentration-ratio bands (fragmented <40%, loose oligopoly 40-60%, tight oligopoly >60%)";
const MARKS_CYCLE = "Howard Marks, Mastering the Market Cycle (cycle-position mosaic)";
const SEMI_BTB = "SEMI book-to-bill ratio; Fed G.17 capacity utilization (semiconductor/equipment cycle indicators)";
const EVAL_REPORT = "reports/Stock evaluation framework metrics.md";

function moat(
  score: number,
  verdict: StepVerdict,
  summary: string,
  metrics: StepMetric[],
  sources: string[] = [RESEARCH_NOTE, MORNINGSTAR_MOAT]
): StepScoreInput {
  return { score, verdict, summary, metrics, sources };
}

function industry(
  score: number,
  verdict: StepVerdict,
  summary: string,
  metrics: StepMetric[],
  sources: string[] = [RESEARCH_NOTE, HHI_CR4, MARKS_CYCLE]
): StepScoreInput {
  return { score, verdict, summary, metrics, sources };
}

export const moatIndustryData: Record<string, { moat: StepScoreInput; industry: StepScoreInput }> = {
  GOOGL: {
    moat: moat(
      4.7,
      "strong",
      "Search is a near-monopoly network-effect moat (advertiser liquidity + data flywheel sustain 90%+ global share), reinforced by switching costs in Workspace/Android/Cloud and massive scale; ROIC has cleared WACC by a wide margin for two decades.",
      [
        { label: "Moat type", value: "Network effect + switching costs + scale", note: "search/ads data flywheel, Android/Workspace lock-in" },
        { label: "ROIC vs WACC", value: "Sustained wide spread", note: "20+ year durability, Wide-moat territory" },
        { label: "Trailing P/E", value: "17.44x", note: "cheapest mega-cap multiple in the AI set", source: "stockanalysis.com/GOOGL via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      4.5,
      "strong",
      "Global search advertising is a near-monopoly structure and cloud infrastructure is a tight 3-firm oligopoly with Azure/AWS; the business is secularly growing but now layered with a cyclical AI-capex buildout that is early-to-mid cycle as of October 2026.",
      [
        { label: "Structure", value: "Near-monopoly (search) + oligopoly (cloud)" },
        { label: "Cycle", value: "Secular ad growth + early-mid AI capex supercycle" },
        { label: "Risk flag", value: "Antitrust/regulatory overhang on search dominance" },
      ]
    ),
  },

  MSFT: {
    moat: moat(
      4.75,
      "strong",
      "Enterprise switching costs (Windows/Office/365 embedded in corporate workflows for decades) combine with Azure's scale and network effects across LinkedIn and Teams to produce one of the most durable moats in the dataset; ROIC has run far above WACC for years.",
      [
        { label: "Moat type", value: "Switching costs + network effect + scale", note: "Office/Windows enterprise lock-in, Azure scale" },
        { label: "ROIC vs WACC", value: "Sustained wide spread", note: "Wide-moat territory" },
        { label: "Net income growth", value: "+31.3% YoY TTM", source: "stockanalysis.com/MSFT via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      4.5,
      "strong",
      "Microsoft sits inside the same tight cloud-infrastructure oligopoly as AWS and Google Cloud, with enterprise software switching costs adding a second layer of structural protection; secular productivity-software growth is now compounding with an early-to-mid-cycle AI capex buildout ($190B 2026 Azure capex).",
      [
        { label: "Structure", value: "Cloud oligopoly (3 hyperscalers) + software incumbency" },
        { label: "Cycle", value: "Secular + early-mid AI capex supercycle" },
      ]
    ),
  },

  META: {
    moat: moat(
      4.0,
      "good",
      "The social graph across Facebook/Instagram/WhatsApp (3.5B+ users) is a genuine network-effect moat with a deep first-party data advantage for ad targeting, but switching costs for users and advertisers are lower than Google's or Microsoft's and the business remains fully ad-dependent with real platform-shift risk (TikTok, generative discovery).",
      [
        { label: "Moat type", value: "Network effect + data scale", note: "weaker switching costs than peers" },
        { label: "FCF margin trend", value: "22.9% → 17.95% YoY", note: "compressing under AI capex", source: "stockanalysis.com/META via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Digital advertising is effectively a duopoly with Google at the top and a long tail of smaller platforms below; the category is secularly growing as ad budgets keep shifting online, but Meta is mid-cycle in a self-funded AI infrastructure buildout that is currently suppressing free cash flow margin.",
      [
        { label: "Structure", value: "Ad duopoly (Google + Meta)" },
        { label: "Cycle", value: "Secular ad growth, mid-cycle AI capex drag on FCF" },
      ]
    ),
  },

  SPCX: {
    moat: moat(
      3.25,
      "good",
      "This ticker blends two very different moats: SpaceX's reusable-rocket cost advantage and Starlink's network effect give it a near-monopoly in commercial launch, while xAI's Grok competes in a crowded, undifferentiated frontier-LLM race with no demonstrated durable edge yet. Very recent IPO (June 2026) with thin trading history, so confidence here is lower than for established names.",
      [
        { label: "Moat type", value: "Cost advantage + network effect (launch/Starlink)", note: "xAI model layer has weak/unproven moat" },
        { label: "Data caveat", value: "IPO'd June 2026", note: "few sessions of history — verify before acting" },
      ]
    ),
    industry: industry(
      3.5,
      "good",
      "Orbital launch services are close to a SpaceX-dominated near-monopoly on cost per kg, a genuinely favorable structure, but the frontier AI model layer xAI competes in is intensely fragmented and competitive (OpenAI, Anthropic, Google, Meta all spending tens of billions); blended, this sits early-cycle in both the space-infrastructure buildout and the AI-model arms race.",
      [
        { label: "Structure", value: "Launch near-monopoly; AI models fragmented/competitive" },
        { label: "Cycle", value: "Early-cycle space buildout + frontier-model arms race" },
      ]
    ),
  },

  AMZN: {
    moat: moat(
      4.4,
      "strong",
      "AWS carries high switching costs from deep workload integration plus massive scale economics, while the retail marketplace and Prime combine a logistics cost advantage with network effects between buyers and third-party sellers; together these have sustained ROIC well above WACC for over a decade.",
      [
        { label: "Moat type", value: "Switching costs (AWS) + scale/network effect (retail)" },
        { label: "TTM FCF", value: "-$11.6B (margin -1.5%)", note: "AI capex ($173B TTM) temporarily flipped FCF negative, not a moat signal", source: "stockanalysis.com/AMZN via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "AWS holds the largest share in a cloud-infrastructure oligopoly and Amazon's logistics scale dominates US e-commerce fulfillment; the business is secularly growing but is mid-cycle in an AI capex buildout intense enough to flip even this cash machine's free cash flow negative industry-wide.",
      [
        { label: "Structure", value: "Cloud oligopoly (largest share) + e-commerce scale leader" },
        { label: "Cycle", value: "Secular + mid-cycle AI capex, FCF-suppressing" },
      ]
    ),
  },

  ORCL: {
    moat: moat(
      3.75,
      "good",
      "Decades of mission-critical database and ERP deployments create real multi-year switching costs (migrating core financial systems is high-risk and expensive), and OCI is riding a large AI-infrastructure backlog (Stargate), but Oracle Cloud remains the #4 hyperscaler and hasn't yet proven the same durable scale moat as the top three.",
      [
        { label: "Moat type", value: "Switching costs (database/ERP) + emerging cloud scale" },
        { label: "Valuation", value: "22.70x trailing / 16.99x forward", note: "net income growing 52.1%", source: "stockanalysis.com/ORCL via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      3.75,
      "good",
      "Enterprise database/ERP software is a legacy oligopoly where Oracle remains entrenched, while cloud infrastructure is intensely competitive with Oracle as the smallest of four hyperscalers; the large AI-capex-driven order backlog places Oracle early-to-mid cycle in its own infrastructure buildout even as the broader cloud market matures.",
      [
        { label: "Structure", value: "Database oligopoly + 4th-place cloud challenger" },
        { label: "Cycle", value: "Early-mid cycle AI capex backlog (Stargate)" },
      ]
    ),
  },

  AAPL: {
    moat: moat(
      4.4,
      "strong",
      "The iOS ecosystem creates deep switching costs (App Store, iMessage, hardware/software integration, accessories), and the brand sustains genuine pricing power — gross margins well above commodity hardware peers — rather than mere recognition; this is a textbook intangible-assets-plus-switching-costs moat.",
      [
        { label: "Moat type", value: "Switching costs (ecosystem) + brand/intangibles" },
        { label: "Pricing power evidence", value: "Premium ASPs sustained vs. Android OEMs" },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "Premium smartphones are effectively a duopoly with Samsung at the high end, but the category is mature and slow-growing with a multi-year replacement cycle, and Apple is currently behind peers in shipping differentiated on-device generative AI — a mid-to-late-cycle hardware market where the next leg of growth (AI features) is still early and unproven.",
      [
        { label: "Structure", value: "Premium smartphone duopoly (Apple/Samsung)" },
        { label: "Cycle", value: "Mature/slow-growth hardware; AI-feature cycle still early" },
      ]
    ),
  },

  CRWV: {
    moat: moat(
      1.5,
      "weak",
      "CoreWeave rents commodity Nvidia GPU capacity with low switching costs relative to hyperscalers, carries severe customer concentration (Microsoft ~62% of 2025 revenue; Microsoft/OpenAI/Meta together projected over 85% of 2026 revenue) and heavy leverage ($35.6B debt, ~25% of revenue to interest), none of which clears a moat bar even before judging durability.",
      [
        { label: "Moat type", value: "None durable — commodity GPU rental + relationship access" },
        { label: "Customer concentration", value: "Microsoft ~62% (2025); top 3 >85% (2026E)", source: "The Motley Fool / electroneconomics via " + EVAL_REPORT },
        { label: "TTM FCF", value: "-$13.655B (margin -179.91%)", source: "stockanalysis.com/CRWV via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      2.25,
      "neutral",
      "The neocloud/GPU-rental segment (CoreWeave, Nebius, Lambda, IREN and others) is fragmented and intensely competitive with low barriers to re-pricing power once hyperscalers build out their own capacity; it is riding a cyclical AI-capex boom that is currently hot but carries real overbuild/financing risk if hyperscaler capex growth decelerates.",
      [
        { label: "Structure", value: "Fragmented, undifferentiated GPU hosting" },
        { label: "Cycle", value: "Red-hot but late-stage overbuild risk building" },
      ]
    ),
  },

  NBIS: {
    moat: moat(
      1.75,
      "weak",
      "Nebius has a large reported backlog (>$40B) that provides revenue visibility, but the underlying business is the same commodity GPU-cloud rental model as its neocloud peers with limited product differentiation and no durable switching-cost or scale advantage over CoreWeave, Lambda, or the hyperscalers it ultimately competes against.",
      [
        { label: "Moat type", value: "None durable — commodity GPU rental" },
        { label: "Backlog", value: ">$40B", note: "provides visibility, not a moat" },
      ]
    ),
    industry: industry(
      2.25,
      "neutral",
      "Same fragmented, capital-intensive neocloud segment as CoreWeave and IREN — favorable near-term demand from the AI capex boom, but no structural barrier preventing new entrants or hyperscaler in-housing from compressing pricing over time.",
      [
        { label: "Structure", value: "Fragmented GPU-cloud segment" },
        { label: "Cycle", value: "Cyclical AI capex boom, overbuild risk" },
      ]
    ),
  },

  BABA: {
    moat: moat(
      3.25,
      "good",
      "Taobao/Tmall retain real network effects between shoppers and merchants plus merchant-side switching costs (storefronts, logistics, advertising tools), and Alibaba Cloud adds a scale moat in Chinese cloud infrastructure, but share erosion to PDD and ByteDance's e-commerce push plus a multi-year regulatory overhang have visibly weakened the moat versus its 2015-2020 peak.",
      [
        { label: "Moat type", value: "Network effect (marketplace) + switching costs (merchants) + cloud scale" },
        { label: "Competitive erosion", value: "Share loss to PDD, Douyin e-commerce" },
      ]
    ),
    industry: industry(
      3.0,
      "neutral",
      "Chinese e-commerce and cloud both have oligopoly-like structures at the top but face unusually intense competitive rivalry (Alibaba, PDD, JD, ByteDance); the sector is working through a China regulatory cycle that has eased since the 2021-2022 crackdown, with a new AI-investment stimulus tailwind, placing it in an early-stage recovery rather than a clean secular uptrend.",
      [
        { label: "Structure", value: "Oligopoly at top, intense rivalry" },
        { label: "Cycle", value: "Post-regulatory-crackdown recovery + AI stimulus" },
      ]
    ),
  },

  BIDU: {
    moat: moat(
      2.5,
      "neutral",
      "Baidu's search dominance in China is a network-effect moat facing the same structural disruption risk Google faces globally from generative AI answers, compounded by a multi-year share shift toward short-video discovery (Douyin/Kuaishou); Apollo Go robotaxi is a credible long-term optionality but not yet a proven moat at scale.",
      [
        { label: "Moat type", value: "Network effect (search), eroding" },
        { label: "Emerging optionality", value: "Apollo Go autonomous driving, unproven at scale" },
      ]
    ),
    industry: industry(
      2.75,
      "neutral",
      "Chinese search/AI is moderately concentrated but under structural pressure from short-video discovery platforms and generative AI search substitutes; the sector sits in the same China regulatory/macro recovery cycle as its internet peers, with Baidu's core business more exposed to disruption than Tencent's or Alibaba's.",
      [
        { label: "Structure", value: "Concentrated but structurally challenged" },
        { label: "Cycle", value: "China internet recovery cycle, disruption risk" },
      ]
    ),
  },

  TCEHY: {
    moat: moat(
      4.0,
      "good",
      "WeChat's 1.3B+ monthly users create one of the strongest network-effect moats in Chinese tech (the super-app layers payments, social, and mini-programs into daily life), reinforced by a deep gaming IP portfolio with real switching costs around social/competitive play; this combination has sustained high returns on capital through multiple regulatory cycles.",
      [
        { label: "Moat type", value: "Network effect (WeChat super-app) + IP/switching costs (gaming)" },
        { label: "Scale", value: "1.3B+ WeChat MAU" },
      ]
    ),
    industry: industry(
      3.75,
      "good",
      "Chinese gaming and social messaging are both effective oligopolies with Tencent at the top; the sector is cyclically exposed to Chinese regulatory policy (gaming approval cycles, anti-addiction rules) but is now in a recovery phase with secular digital-engagement growth still intact.",
      [
        { label: "Structure", value: "Gaming/social oligopoly, Tencent dominant" },
        { label: "Cycle", value: "Post-regulatory recovery, secular engagement growth" },
      ]
    ),
  },

  NVDA: {
    moat: moat(
      4.9,
      "strong",
      "CUDA's decade-plus software ecosystem creates the deepest switching-cost moat in semiconductors — rewriting production ML pipelines off CUDA is prohibitively costly for most customers — layered on top of a network effect among developers/frameworks built around it and a dominant (>80%) share of AI accelerator compute; ROIC has run far above WACC with widening margin.",
      [
        { label: "Moat type", value: "Switching costs (CUDA) + network effect (developer ecosystem) + scale" },
        { label: "AI accelerator share", value: ">80% estimated" },
      ]
    ),
    industry: industry(
      4.5,
      "strong",
      "Nvidia sits at the center of a structurally favorable near-monopoly in AI training/inference silicon, but the underlying semiconductor industry remains cyclical and capex-sensitive; as of October 2026 the mosaic (hyperscaler capex guidance, SEMI book-to-bill) reads early-to-mid cycle in a historic AI buildout rather than late-cycle, though concentration in a handful of hyperscaler customers is a real dependency.",
      [
        { label: "Structure", value: "Near-monopoly AI accelerator share" },
        { label: "Cycle", value: "Early-mid AI capex supercycle; semis still cyclical" },
      ],
      [RESEARCH_NOTE, SEMI_BTB, MARKS_CYCLE]
    ),
  },

  AVGO: {
    moat: moat(
      4.1,
      "good",
      "Broadcom pairs VMware's deep enterprise switching costs with a cost-advantage/scale position as the leading merchant partner for hyperscaler custom AI accelerators (XPUs) and networking silicon — a diversified, multi-source moat rather than reliance on one customer or product line.",
      [
        { label: "Moat type", value: "Switching costs (VMware) + cost advantage/scale (custom XPU, networking)" },
        { label: "ROIC / FCF margin", value: "30.68% ROIC, 44.22% FCF margin", note: "revenue +48.7% YoY", source: "stockanalysis.com/AVGO via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Custom AI silicon design (XPUs) is close to a duopoly with Marvell, and core networking/connectivity chips are similarly concentrated; the segment is secularly growing on hyperscaler in-house silicon demand and is early-to-mid cycle in the broader AI capex buildout.",
      [
        { label: "Structure", value: "Custom-silicon duopoly (Broadcom/Marvell) + networking scale" },
        { label: "Cycle", value: "Secular + early-mid AI capex tailwind" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  AMD: {
    moat: moat(
      2.75,
      "neutral",
      "AMD is a merchant chipmaker competing against Nvidia's entrenched CUDA ecosystem in AI accelerators and against Intel in CPUs; it has real engineering execution and growing hyperscaler design wins (MI450) but customer concentration and a trailing ROIC that has run below the semiconductor sector's own estimated WACC mean the moat gate (ROIC>WACC sustained) is not yet clearly cleared.",
      [
        { label: "Moat type", value: "Weak/emerging — merchant silicon, no CUDA-equivalent ecosystem lock-in" },
        { label: "ROIC vs sector WACC", value: "9.77% vs ~10.55% est. semi WACC", note: "below the ROIC>WACC gate on a trailing basis", source: "calcmastery.com WACC benchmark via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "AMD competes in a GPU/CPU space effectively duopolized at the top (vs. Nvidia in accelerators, vs. Intel in CPUs), with Nvidia holding a commanding lead in AI compute specifically; the broader semiconductor cycle is mid-cycle with a strong secular AI tailwind, which is the main reason the valuation multiple sits far ahead of trailing fundamentals.",
      [
        { label: "Structure", value: "Duopoly positioning (distant #2 in AI accelerators)" },
        { label: "Cycle", value: "Mid-cycle semis + secular AI demand" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  MRVL: {
    moat: moat(
      2.75,
      "neutral",
      "Marvell has a strong position in custom ASICs and optical DSPs for hyperscaler AI networking, giving it real design-win switching costs during multi-year programs, but it is smaller-scale than Broadcom, has concentrated hyperscaler customer exposure, and faces rising competition from in-house/Alchip-style alternatives.",
      [
        { label: "Moat type", value: "Switching costs (multi-year design wins) + niche scale", note: "thinner than Broadcom's VMware-anchored moat" },
        { label: "Customer concentration", value: "Hyperscaler-concentrated revenue base" },
      ]
    ),
    industry: industry(
      3.5,
      "good",
      "Custom AI silicon and optical interconnect sit in a Broadcom/Marvell-led duopoly-ish structure within the broader semiconductor space; the segment carries a strong secular AI-networking tailwind and is early-to-mid cycle, though order lumpiness around hyperscaler capex plans remains a real swing factor.",
      [
        { label: "Structure", value: "Custom-silicon duopoly-ish (#2 to Broadcom)" },
        { label: "Cycle", value: "Secular AI networking tailwind, early-mid cycle" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  CBRS: {
    moat: moat(
      1.5,
      "weak",
      "Cerebras' wafer-scale architecture is a genuine engineering differentiator but remains a thin commercial niche against Nvidia's entrenched CUDA ecosystem, with limited customer breadth and heavy R&D burn; this is a recent (May 2026) IPO with little trading/earnings history to confirm any durable return-on-capital advantage.",
      [
        { label: "Moat type", value: "Unproven — niche hardware architecture, no ecosystem lock-in yet" },
        { label: "Data caveat", value: "May 2026 IPO", note: "thinly covered, verify before acting" },
      ]
    ),
    industry: industry(
      2.0,
      "weak",
      "Alternative AI-accelerator architectures (Cerebras, Groq, and others) compete in a fragmented, intensely competitive niche against Nvidia's incumbency; demand tailwinds from the AI buildout are real but the sub-segment itself has no structural protection and faces constant risk of being out-invested by larger incumbents.",
      [
        { label: "Structure", value: "Fragmented alt-accelerator niche" },
        { label: "Cycle", value: "Early-stage, high execution risk despite secular demand" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  ARM: {
    moat: moat(
      3.75,
      "good",
      "Arm's instruction-set architecture is embedded across nearly all mobile SoCs and a fast-growing share of datacenter CPUs, creating genuine switching costs and a network effect among chip designers standardized on it — a real intangible-assets/licensing moat — though the open RISC-V alternative is an emerging long-term competitive threat and SoftBank ownership concentrates governance risk.",
      [
        { label: "Moat type", value: "Intangible assets (architecture licensing) + switching costs" },
        { label: "Valuation vs. cash generation", value: "301.80x trailing / 126.83x forward P/E, 0.48% FCF yield", note: "highest multiple pair in the dataset", source: "stockanalysis.com/ARM via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      3.5,
      "good",
      "Arm's architecture is close to a monopoly in mobile CPU IP and is gaining share in datacenter/AI-adjacent CPUs, a structurally favorable position, but RISC-V is a credible emerging competitive threat and customer concentration (SoftBank, major licensees) adds risk; the datacenter CPU-IP expansion is early-cycle and secular.",
      [
        { label: "Structure", value: "Near-monopoly mobile IP, emerging RISC-V threat" },
        { label: "Cycle", value: "Secular datacenter CPU-IP expansion, early-cycle" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  QCOM: {
    moat: moat(
      2.75,
      "neutral",
      "Qualcomm's cellular-patent licensing business is a genuine intangible-assets/regulatory moat with durable royalty economics, but the modem/SoC hardware business faces real customer-concentration risk (Apple's multi-year in-house modem transition) that will structurally shrink Qualcomm's largest single relationship over time.",
      [
        { label: "Moat type", value: "Intangible assets (patent licensing) + weaker hardware moat" },
        { label: "Key risk", value: "Apple in-house modem transition" },
      ]
    ),
    industry: industry(
      3.0,
      "neutral",
      "Mobile chipsets are a duopoly-ish structure (Qualcomm/MediaTek) in a mature, slow-growing smartphone market; Qualcomm is diversifying into automotive, IoT, and edge-AI inference, which gives it a secular growth leg layered on an otherwise mature, cyclical core business.",
      [
        { label: "Structure", value: "Mobile chipset duopoly-ish (vs. MediaTek)" },
        { label: "Cycle", value: "Mature smartphone cycle + diversifying secular legs" },
      ]
    ),
  },

  INTC: {
    moat: moat(
      2.0,
      "weak",
      "Intel's x86 ecosystem still carries real software/compatibility switching costs, but years of process-node execution missteps have ceded leading-edge manufacturing leadership to TSMC and share to AMD/Arm; the foundry turnaround is unproven and ROIC has run below WACC for an extended stretch, failing the Morningstar gate for a Narrow/Wide rating at present.",
      [
        { label: "Moat type", value: "Weakened — x86 switching costs eroding, process leadership lost" },
        { label: "ROIC vs WACC", value: "Below cost of capital in recent years, failing moat gate" },
      ]
    ),
    industry: industry(
      2.5,
      "neutral",
      "x86 CPUs remain a duopoly with AMD, but Intel's foundry ambitions place it in the leading-edge fabrication market dominated by TSMC — a highly concentrated, capital-intensive segment where Intel is a distant challenger; the company sits at an early stage of its own internal turnaround cycle rather than riding a clean industry tailwind.",
      [
        { label: "Structure", value: "CPU duopoly (vs. AMD); foundry challenger to TSMC" },
        { label: "Cycle", value: "Early-stage company turnaround within cyclical semis" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  TSM: {
    moat: moat(
      4.7,
      "strong",
      "TSMC's leading-edge process scale is close to a true manufacturing monopoly (>90% share of sub-5nm production) built on decades of capex and process-engineering lead that competitors have been unable to close; this cost-advantage/efficient-scale moat shows up directly in ROIC sustained far above WACC, despite real customer-concentration exposure to Apple and Nvidia.",
      [
        { label: "Moat type", value: "Cost advantage + efficient scale (leading-edge process)" },
        { label: "Leading-edge share", value: ">90% of advanced-node production" },
      ]
    ),
    industry: industry(
      4.5,
      "strong",
      "Leading-edge semiconductor fabrication is a near-monopoly structure with TSMC dominant and Samsung/Intel distant challengers; the business benefits from a secular AI-driven demand wave but remains part of the fundamentally cyclical semiconductor capex cycle, currently read as mid-upcycle via SEMI book-to-bill and hyperscaler capex guidance.",
      [
        { label: "Structure", value: "Near-monopoly leading-edge foundry" },
        { label: "Cycle", value: "Secular AI demand + mid-upcycle semis capex" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  MU: {
    moat: moat(
      2.75,
      "neutral",
      "Memory (DRAM/NAND) is historically a commodity, price-taking business with thin structural moat, but Micron's leadership position in HBM for AI accelerators currently affords real pricing power within a tight 3-player DRAM oligopoly (Samsung, SK Hynix, Micron) — a cyclically-earned edge rather than a permanent one.",
      [
        { label: "Moat type", value: "Weak structurally; cyclical cost-advantage/scale edge in HBM" },
        { label: "Oligopoly position", value: "1 of 3 global DRAM suppliers" },
      ]
    ),
    industry: industry(
      3.75,
      "good",
      "DRAM and NAND are tight oligopolies (3 players control ~95% of DRAM supply) that are classically boom-bust cyclical; the sector is currently in a strong up-cycle driven by HBM/AI memory demand outstripping supply, which is the main reason the industry score here sits well above Micron's own standalone moat score.",
      [
        { label: "Structure", value: "DRAM/NAND oligopoly (Samsung/SK Hynix/Micron)" },
        { label: "Cycle", value: "Strong up-cycle, HBM-driven memory supercycle" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  ASML: {
    moat: moat(
      4.85,
      "strong",
      "ASML is the sole global supplier of EUV lithography systems — a true single-source monopoly protected by decades of patents and process know-how that no competitor has replicated — giving it essentially unlimited switching-cost leverage over every advanced-node chipmaker on earth.",
      [
        { label: "Moat type", value: "Efficient scale / monopoly + intangible assets (patents)" },
        { label: "Market position", value: "Sole global EUV lithography supplier" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Lithography equipment is a true monopoly at the EUV node and a tight oligopoly more broadly (ASML/Applied Materials/Lam/KLA/Tokyo Electron); the business rides a secular semiconductor-capex tailwind but order timing is still cyclical and sensitive to the equipment book-to-bill cycle.",
      [
        { label: "Structure", value: "EUV monopoly; broader WFE oligopoly" },
        { label: "Cycle", value: "Secular capex tailwind, cyclical order timing" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  ASX: {
    moat: moat(
      2.0,
      "weak",
      "ASE (ASX) is the largest outsourced semiconductor assembly and test (OSAT) provider, giving it scale, but packaging/assembly is a lower-margin, commoditized step in the chip supply chain with real customer bargaining power from foundries and hyperscalers squeezing pricing; advanced-packaging demand (CoWoS overflow) is a cyclical tailwind rather than a structural moat.",
      [
        { label: "Moat type", value: "Weak — scale/cost advantage in a commoditized, low-margin step" },
        { label: "Current tailwind", value: "CoWoS/advanced-packaging overflow demand" },
      ]
    ),
    industry: industry(
      2.75,
      "neutral",
      "OSAT packaging/test is moderately concentrated among a handful of players (ASE, Amkor, JCET) but margins stay thin because customers (foundries, fabless chip designers) hold significant bargaining power; the segment is currently benefiting from an advanced-packaging capacity crunch tied to AI chip demand, an early-to-mid cycle tailwind layered on an otherwise commoditized industry.",
      [
        { label: "Structure", value: "Moderately concentrated OSAT, low pricing power" },
        { label: "Cycle", value: "Advanced-packaging capacity crunch tailwind" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  AMKR: {
    moat: moat(
      1.75,
      "weak",
      "Amkor is the second-largest OSAT provider but smaller-scale and thinner-margin than ASE, with essentially no pricing power of its own and heavy dependence on a handful of large foundry/fabless customers — a commodity assembly-and-test business riding, rather than creating, the AI packaging cycle.",
      [
        { label: "Moat type", value: "Weak — commoditized OSAT, limited scale advantage" },
      ]
    ),
    industry: industry(
      2.75,
      "neutral",
      "Same moderately concentrated OSAT structure as ASE, with thin standalone pricing power but a real near-term tailwind from advanced-packaging demand tied to AI accelerator shipments.",
      [
        { label: "Structure", value: "Moderately concentrated OSAT, low pricing power" },
        { label: "Cycle", value: "Advanced-packaging demand tailwind" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  SNPS: {
    moat: moat(
      4.1,
      "good",
      "Synopsys's EDA tools are embedded in multi-decade chip-design workflows — switching away mid-design is effectively impossible, and retraining engineering teams onto a competitor's toolchain is a multi-year undertaking — producing one of the deepest switching-cost moats in software, shared in a tight duopoly with Cadence.",
      [
        { label: "Moat type", value: "Switching costs (embedded design flows) + duopoly scale" },
        { label: "Duopoly position", value: "1 of 2 dominant EDA vendors" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "EDA software is a tight duopoly (Synopsys + Cadence) with very high barriers to entry given the decades of accumulated process-design-kit relationships with foundries; the segment has a strong secular tailwind from rising chip-design complexity and the AI-chip boom, placing it early-to-mid cycle with limited cyclicality relative to hardware semis.",
      [
        { label: "Structure", value: "Tight EDA duopoly" },
        { label: "Cycle", value: "Secular chip-design-complexity tailwind, low cyclicality" },
      ]
    ),
  },

  CDNS: {
    moat: moat(
      4.1,
      "good",
      "Cadence shares the same structurally entrenched position as Synopsys — EDA tools embedded in foundational chip-design workflows with extreme switching costs — and the two together form a duopoly that has proven durable through multiple semiconductor cycles.",
      [
        { label: "Moat type", value: "Switching costs (embedded design flows) + duopoly scale" },
        { label: "Duopoly position", value: "1 of 2 dominant EDA vendors" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Same tight EDA duopoly dynamics as Synopsys, benefiting from rising design complexity driven by the AI chip boom; structurally one of the more secular, lower-cyclicality corners of the semiconductor supply chain.",
      [
        { label: "Structure", value: "Tight EDA duopoly" },
        { label: "Cycle", value: "Secular tailwind, low cyclicality" },
      ]
    ),
  },

  CRDO: {
    moat: moat(
      2.25,
      "neutral",
      "Credo has a genuine technology lead in active electrical cables and SerDes IP for AI cluster interconnect, with real design-win switching costs during a program's life, but it is a small-scale niche player with concentrated hyperscaler customer exposure and faces emerging competition as the interconnect market attracts more entrants.",
      [
        { label: "Moat type", value: "Switching costs (design wins) in a narrow, fast-growing niche" },
        { label: "Risk", value: "Small scale, customer concentration" },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "AI cluster interconnect (AECs, retimers) is a fragmented-to-niche-duopoly segment where Credo and Astera Labs are current leaders in their respective sub-niches; it carries a strong secular AI-networking tailwind and sits early-cycle in adoption of higher-speed interconnect standards, though competitive entry risk is real given the pace of growth.",
      [
        { label: "Structure", value: "Niche leadership within a fragmenting interconnect market" },
        { label: "Cycle", value: "Early-cycle secular AI-networking tailwind" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  ALAB: {
    moat: moat(
      2.5,
      "neutral",
      "Astera Labs has strong design wins for PCIe/CXL retimers and connectivity chips inside Nvidia-centric AI server platforms, giving it real near-term switching costs, but its product base is narrow, customer concentration is high, and the valuation (186.68x trailing / 67.54x forward P/E on a 0.41% FCF yield) prices in far more durability than the company has yet demonstrated.",
      [
        { label: "Moat type", value: "Switching costs (design wins), narrow product base" },
        { label: "Valuation vs. cash generation", value: "186.68x trailing P/E, 0.41% FCF yield", source: "stockanalysis.com/ALAB via " + EVAL_REPORT },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "Same fast-growing, secularly-tailwinded AI-interconnect niche as Credo, with Astera currently a leader in PCIe/CXL retimers specifically; early-cycle growth with real execution and competitive-entry risk given how richly the growth is already priced.",
      [
        { label: "Structure", value: "Niche leadership, fragmenting interconnect market" },
        { label: "Cycle", value: "Early-cycle secular AI-networking tailwind" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  DELL: {
    moat: moat(
      2.25,
      "neutral",
      "Dell's direct-sales model and enterprise relationships give it a modest scale/distribution cost advantage, but servers and PCs are largely commoditized hardware with thin differentiation versus HPE, Lenovo, and Supermicro — a volume business rather than a pricing-power business.",
      [
        { label: "Moat type", value: "Weak — distribution scale in a commoditized hardware category" },
        { label: "FY27 outlook", value: "$74B revenue guide", note: "AI server demand driven" },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "Server/PC OEM hardware is a moderately concentrated market (Dell, HPE, Lenovo, Supermicro) riding a strong cyclical AI-server capex boom; the underlying industry is capital-equipment cyclical, currently mid-upcycle on hyperscaler and enterprise AI infrastructure spend.",
      [
        { label: "Structure", value: "Moderately concentrated server/PC OEM market" },
        { label: "Cycle", value: "Mid-upcycle AI server capex boom" },
      ]
    ),
  },

  SMCI: {
    moat: moat(
      1.5,
      "weak",
      "Super Micro is a fast-moving systems integrator with first-mover design-win relationships on new Nvidia platforms, but it has thin differentiation versus other integrators, a history of governance and accounting-control problems, and heavy supplier/customer concentration — none of which supports a durable moat claim.",
      [
        { label: "Moat type", value: "Weak — commodity system integration, governance risk history" },
      ]
    ),
    industry: industry(
      2.75,
      "neutral",
      "AI server integration is a fragmented, commoditized segment benefiting from the same AI-server capex boom as Dell/HPE, but with lower barriers to entry and intense price competition among integrators; favorable demand cycle, unfavorable industry structure.",
      [
        { label: "Structure", value: "Fragmented, commoditized system integration" },
        { label: "Cycle", value: "Riding AI server capex boom" },
      ]
    ),
  },

  EQIX: {
    moat: moat(
      3.9,
      "good",
      "Equinix's colocation facilities sit at the center of dense interconnection ecosystems — once a company's network, cloud on-ramps, and partners are physically wired into an Equinix facility, migrating is expensive and operationally risky, producing a genuine network-effect-plus-switching-cost moat that is rare among real estate-adjacent businesses.",
      [
        { label: "Moat type", value: "Switching costs (physical interconnection) + network effect (tenant density)" },
        { label: "Pipeline", value: "~9GW data-center pipeline (with Digital Realty)" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Retail/carrier-neutral colocation is effectively a duopoly at global scale (Equinix + Digital Realty), riding the secular data-center and power-demand supercycle driven by AI infrastructure buildout; early-to-mid cycle given multi-year site/power lead times still constraining supply.",
      [
        { label: "Structure", value: "Global colocation duopoly" },
        { label: "Cycle", value: "Secular data-center/power supercycle, early-mid cycle" },
      ]
    ),
  },

  DLR: {
    moat: moat(
      3.75,
      "good",
      "Digital Realty shares Equinix's colocation switching-cost dynamic — tenants wired into interconnection-dense facilities face high migration costs — though its interconnection ecosystem is somewhat less dense than Equinix's flagship markets, making the moat slightly narrower in degree rather than in kind.",
      [
        { label: "Moat type", value: "Switching costs (colocation) + scale" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Same global colocation duopoly and secular data-center/power supercycle as Equinix, with Digital Realty as the #2 global scale player.",
      [
        { label: "Structure", value: "Global colocation duopoly" },
        { label: "Cycle", value: "Secular data-center/power supercycle, early-mid cycle" },
      ]
    ),
  },

  VRT: {
    moat: moat(
      2.75,
      "neutral",
      "Vertiv's rack-level power and thermal management systems carry real engineering-relationship switching costs over long product-qualification cycles, and it holds a strong position in the data-center critical-infrastructure niche, but it competes against larger diversified players like Schneider Electric and Eaton and remains exposed to the broader data-center capex cycle.",
      [
        { label: "Moat type", value: "Switching costs (engineering qualification cycles)" },
        { label: "Competitive set", value: "Schneider Electric, Eaton" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Data-center power and cooling infrastructure is an oligopoly-ish structure among a few scaled suppliers, riding the same secular data-center/power-demand supercycle as the colocation REITs; early-to-mid cycle given multi-year order backlogs for rack power and liquid cooling.",
      [
        { label: "Structure", value: "Oligopoly-ish power/cooling infrastructure market" },
        { label: "Cycle", value: "Secular data-center supercycle, early-mid cycle" },
      ]
    ),
  },

  APLD: {
    moat: moat(
      1.25,
      "weak",
      "Applied Digital is an early-stage data-center developer/lessor with a notable 210MW lease win, but it has a thin balance sheet, high customer concentration, and no demonstrated durable cost or switching-cost advantage over larger, better-capitalized developers — a speculative capacity bet rather than a moated business.",
      [
        { label: "Moat type", value: "None durable — early-stage capacity developer" },
        { label: "Key contract", value: "210MW lease" },
      ]
    ),
    industry: industry(
      2.75,
      "neutral",
      "Third-party data-center development/leasing for AI workloads is a fragmented, capital-intensive, speculative segment benefiting from the current power/capacity crunch, but carrying real overbuild and financing risk if hyperscaler leasing demand decelerates.",
      [
        { label: "Structure", value: "Fragmented, capital-intensive capacity development" },
        { label: "Cycle", value: "Hot demand cycle, real overbuild/financing risk" },
      ]
    ),
  },

  CSCO: {
    moat: moat(
      3.25,
      "good",
      "Cisco's networking equipment is deeply embedded in enterprise infrastructure with real switching costs (certifications, config/operations tooling, multi-vendor integration risk), but AI-cluster networking specifically is seeing share pressure from Arista and white-box alternatives, keeping the moat intact in legacy enterprise but less dominant in the newest growth segment.",
      [
        { label: "Moat type", value: "Switching costs (installed base, certifications)" },
        { label: "Emerging pressure", value: "Arista/white-box competition in AI data-center networking" },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "Enterprise networking equipment is an oligopoly (Cisco, Arista, Juniper/HPE) in a mature core market, with a newer secular AI data-center networking growth leg layered on top; mid-cycle in enterprise IT spend, early-cycle in AI cluster networking specifically.",
      [
        { label: "Structure", value: "Networking equipment oligopoly" },
        { label: "Cycle", value: "Mature core market + early-cycle AI networking growth leg" },
      ]
    ),
  },

  HPE: {
    moat: moat(
      2.0,
      "weak",
      "HPE's server and storage hardware is largely commoditized with thin differentiation; the Juniper networking acquisition adds some switching-cost depth in networking, but the core business still lacks a durable pricing-power advantage over Dell, Lenovo, or white-box competitors.",
      [
        { label: "Moat type", value: "Weak — commoditized hardware, Juniper adds modest networking depth" },
      ]
    ),
    industry: industry(
      3.0,
      "neutral",
      "Server/storage/networking OEM hardware is a moderately concentrated market benefiting from the AI server capex boom, similar to Dell, with HPE's recent Juniper combination improving its networking competitive position somewhat.",
      [
        { label: "Structure", value: "Moderately concentrated server/networking OEM market" },
        { label: "Cycle", value: "AI server capex boom tailwind" },
      ]
    ),
  },

  GEV: {
    moat: moat(
      3.25,
      "good",
      "GE Vernova's heavy gas-turbine business benefits from a genuine scale/engineering-relationship moat and a multi-year backlog ($176B) that is extremely difficult for new entrants to replicate given the certification and long-cycle manufacturing lead times shared by only Siemens Energy and Mitsubishi Power globally.",
      [
        { label: "Moat type", value: "Scale + switching costs (long-cycle engineering relationships)" },
        { label: "Backlog", value: "$176B" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Large gas turbines are an oligopoly of essentially three global suppliers (GE Vernova, Siemens Energy, Mitsubishi Power), and the segment is riding a secular power-demand supercycle driven by AI data-center load growth; early-cycle given multi-year turbine order lead times already stretching past 2028.",
      [
        { label: "Structure", value: "Global gas-turbine oligopoly (3 suppliers)" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle backlog" },
      ]
    ),
  },

  CEG: {
    moat: moat(
      3.5,
      "good",
      "Constellation owns the largest US nuclear generation fleet, an asset class that is effectively impossible to replicate given multi-decade licensing timelines and public opposition to new builds — a scarcity-driven regulatory/intangible moat reinforced by long-term power purchase agreements with hyperscalers.",
      [
        { label: "Moat type", value: "Intangible assets/regulatory (nuclear licenses) + scarcity" },
        { label: "Demand signal", value: "Multi-year hyperscaler nuclear PPAs" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Large-scale nuclear generation ownership is a tight oligopoly among a handful of operators; the sector is riding a secular power-demand supercycle from AI data-center load growth that is re-rating nuclear assets industry-wide, placing it early-cycle in that re-rating.",
      [
        { label: "Structure", value: "Nuclear-fleet ownership oligopoly" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle nuclear re-rating" },
      ]
    ),
  },

  VST: {
    moat: moat(
      3.0,
      "neutral",
      "Vistra's diversified generation fleet (including nuclear) and direct PPAs with Meta and AWS provide real revenue visibility and scale advantages, but as a merchant generator it remains more exposed to wholesale power-price volatility than regulated utilities, which caps the durability of its moat relative to a true franchise business.",
      [
        { label: "Moat type", value: "Scale + contracted revenue, but merchant price exposure" },
        { label: "Key contracts", value: "Meta + AWS PPAs" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Merchant power generation in competitive markets like ERCOT is moderately concentrated among a few large players and is riding the same secular power-demand supercycle as regulated utilities, though merchant price exposure makes it somewhat more cyclical than its regulated peers.",
      [
        { label: "Structure", value: "Moderately concentrated merchant generation" },
        { label: "Cycle", value: "Secular power-demand supercycle, merchant-price cyclicality" },
      ]
    ),
  },

  ETR: {
    moat: moat(
      3.25,
      "good",
      "Entergy holds a classic regulatory-franchise moat — an exclusive, government-granted service territory where competition is legally excluded — now amplified by massive data-center load growth from Meta's 5.2GW Louisiana commitment, a textbook intangible-assets/regulatory moat type.",
      [
        { label: "Moat type", value: "Intangible assets/regulatory (service-territory franchise)" },
        { label: "Demand signal", value: "Meta Louisiana, 5.2GW committed" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Regulated utilities operate as government-sanctioned monopolies within their service territories; the sector is riding a secular, multi-decade power-demand supercycle from AI data-center load growth, and Entergy's territory specifically has an outsized concentration of committed new demand, placing it early in that growth cycle.",
      [
        { label: "Structure", value: "Regulated monopoly (service-territory franchise)" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle load growth" },
      ]
    ),
  },

  TLN: {
    moat: moat(
      2.75,
      "neutral",
      "Talen's nuclear/merchant generation fleet is smaller-scale than Constellation's or Vistra's, and its AWS PPA (1,920MW) provides meaningful revenue visibility, but as a smaller merchant generator it carries more price and counterparty concentration risk than the larger, more diversified names in the power space.",
      [
        { label: "Moat type", value: "Scale/scarcity (nuclear) but smaller, less diversified" },
        { label: "Key contract", value: "AWS nuclear PPA, 1,920MW" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Same favorable secular power-demand supercycle as its utility/IPP peers, with Talen's direct AWS nuclear PPA giving it outsized exposure to hyperscaler-driven demand growth relative to its scale.",
      [
        { label: "Structure", value: "Merchant nuclear/power generation" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle" },
      ]
    ),
  },

  NEE: {
    moat: moat(
      3.75,
      "good",
      "NextEra combines the largest US regulated-utility franchise (Florida Power & Light) with the largest renewables development platform in the country, giving it both a classic regulatory moat and a scale/project-pipeline advantage in wind/solar/storage development that smaller developers can't match.",
      [
        { label: "Moat type", value: "Regulatory franchise + scale (renewables development pipeline)" },
        { label: "Corporate action", value: "$67B NextEra/Dominion merger announced" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Regulated utilities plus utility-scale renewables development form a monopoly/oligopoly structure riding the secular power-demand and energy-transition supercycle; early-to-mid cycle given the multi-year interconnection queues still backing up new generation.",
      [
        { label: "Structure", value: "Regulated monopoly + renewables development oligopoly" },
        { label: "Cycle", value: "Secular power-demand + energy-transition supercycle" },
      ]
    ),
  },

  D: {
    moat: moat(
      3.25,
      "good",
      "Dominion's regulated-utility franchise sits at the center of Virginia's 'Data Center Alley,' the largest concentration of data centers globally, giving it an unusually direct and geographically concentrated version of the regulatory-franchise moat shared by other utilities in this dataset.",
      [
        { label: "Moat type", value: "Regulatory franchise (service-territory monopoly)" },
        { label: "Geographic concentration", value: "Northern Virginia 'Data Center Alley'" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Same regulated-monopoly structure and secular power-demand supercycle as its utility peers, with Dominion arguably the most directly levered of the group given its service territory's outsized share of global data-center capacity.",
      [
        { label: "Structure", value: "Regulated monopoly (service-territory franchise)" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle" },
      ]
    ),
  },

  OKLO: {
    moat: moat(
      1.25,
      "weak",
      "Oklo is a pre-revenue small modular reactor developer with no commercial Aurora reactor operating yet; any eventual moat (nuclear licensing scarcity) is entirely prospective, and execution/regulatory risk is high enough that no sustained ROIC-above-WACC claim can be made at this stage.",
      [
        { label: "Moat type", value: "None yet — pre-revenue, pre-commercial-operation" },
        { label: "Status", value: "Aurora fast reactor, not yet operating commercially" },
      ]
    ),
    industry: industry(
      3.0,
      "neutral",
      "Advanced/small modular nuclear is an emerging, fragmented segment (Oklo, TerraPower, X-energy, NuScale and others competing) with no commercially operating SMR fleet yet anywhere in the US; the secular tailwind from AI power demand is genuine, but the industry itself is pre-commercialization and highly speculative as a group.",
      [
        { label: "Structure", value: "Fragmented, pre-commercialization SMR segment" },
        { label: "Cycle", value: "Very early-cycle, secular tailwind but unproven technology at scale" },
      ]
    ),
  },

  WDC: {
    moat: moat(
      3.5,
      "good",
      "Western Digital and Seagate form a genuine hard-drive duopoly in nearline/enterprise capacity storage, with multi-quarter hyperscaler qualification cycles creating real switching costs and capacity currently sold out — a cost-advantage-plus-switching-cost moat that is unusually clean for a hardware manufacturer.",
      [
        { label: "Moat type", value: "Scale + switching costs", note: "duopoly with Seagate in nearline HDD" },
        { label: "Capacity", value: "Sold out", note: "per current demand/supply balance" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Nearline HDD is a clean duopoly (WDC + Seagate, ~90% combined share) benefiting from a secular AI-storage tailwind as exabyte demand for cold/warm AI training data grows faster than flash capacity can economically serve it; currently early-to-mid cycle given sold-out capacity and multi-year expansion lead times.",
      [
        { label: "Structure", value: "HDD duopoly (WDC + Seagate, ~90% share)" },
        { label: "Cycle", value: "Secular AI-storage tailwind, early-mid cycle, sold-out capacity" },
      ]
    ),
  },

  SNDK: {
    moat: moat(
      2.25,
      "neutral",
      "SanDisk, spun off from Western Digital, is a member of the NAND flash oligopoly but with a weaker standalone balance sheet and less scale than Samsung, SK Hynix, or Micron, leaving it more exposed to commodity memory pricing swings than to any durable company-specific advantage.",
      [
        { label: "Moat type", value: "Weak standalone — commodity NAND, oligopoly member" },
        { label: "Corporate history", value: "Spun off from Western Digital, 2024" },
      ]
    ),
    industry: industry(
      3.5,
      "good",
      "NAND flash is an oligopoly of a handful of global suppliers that is cyclically volatile but currently in a favorable up-cycle alongside DRAM/HBM, driven by AI-related storage and memory demand.",
      [
        { label: "Structure", value: "NAND flash oligopoly" },
        { label: "Cycle", value: "Favorable memory up-cycle" },
      ]
    ),
  },

  STX: {
    moat: moat(
      3.5,
      "good",
      "Seagate shares Western Digital's clean HDD-duopoly dynamics in nearline/enterprise capacity storage, with exabyte shipment growth and sold-out capacity reflecting the same switching-cost and scale advantages that have historically kept this a rational, high-return duopoly rather than a race-to-the-bottom commodity market.",
      [
        { label: "Moat type", value: "Scale + switching costs", note: "duopoly with WDC in nearline HDD" },
        { label: "Shipment trend", value: "Exabyte shipments growing" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Same nearline HDD duopoly and secular AI-storage tailwind as Western Digital, with Seagate the other half of the industry's ~90% combined share.",
      [
        { label: "Structure", value: "HDD duopoly (WDC + Seagate, ~90% share)" },
        { label: "Cycle", value: "Secular AI-storage tailwind, early-mid cycle" },
      ]
    ),
  },

  AMAT: {
    moat: moat(
      3.75,
      "good",
      "Applied Materials holds a broad, diversified wafer-fab-equipment portfolio across deposition, etch, and ion implantation with real process-qualification switching costs, though it is not a single-category monopoly the way ASML is in lithography — its moat rests on breadth and scale across many tool categories rather than exclusivity in one.",
      [
        { label: "Moat type", value: "Switching costs (process qualification) + breadth/scale" },
        { label: "Competitive set", value: "Lam Research, Tokyo Electron, KLA" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Wafer fab equipment is a tight oligopoly (AMAT, Lam Research, Tokyo Electron, KLA, ASML) with a secular semiconductor-capex tailwind from AI chip demand, but order timing remains cyclical and sensitive to the SEMI book-to-bill ratio; currently mid-upcycle.",
      [
        { label: "Structure", value: "Wafer-fab-equipment oligopoly" },
        { label: "Cycle", value: "Secular capex tailwind, mid-upcycle, book-to-bill sensitive" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  LRCX: {
    moat: moat(
      3.75,
      "good",
      "Lam Research's leadership in etch and deposition — particularly for advanced 3D NAND and leading-edge logic — creates real process-qualification switching costs, giving it a strong position within the wafer-fab-equipment oligopoly even though it doesn't hold a single-supplier monopoly in any one tool category.",
      [
        { label: "Moat type", value: "Switching costs (process qualification, etch/deposition leadership)" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Same wafer-fab-equipment oligopoly dynamics as Applied Materials, with Lam particularly exposed to the memory (NAND/DRAM) capex cycle in addition to leading-edge logic; currently mid-upcycle on AI-driven capex.",
      [
        { label: "Structure", value: "Wafer-fab-equipment oligopoly" },
        { label: "Cycle", value: "Secular capex tailwind, mid-upcycle" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  KLAC: {
    moat: moat(
      4.0,
      "good",
      "KLA holds an unusually concentrated position within process control and defect inspection/metrology — tools that are yield-critical and therefore extremely difficult to displace once qualified into a fab's production flow — giving it a narrower but arguably deeper moat than the broader-portfolio equipment makers.",
      [
        { label: "Moat type", value: "Switching costs (yield-critical qualification) + concentrated share in process control" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "Process control/inspection is a tighter sub-segment of the wafer-fab-equipment oligopoly where KLA holds an especially strong share; same secular AI-capex tailwind and mid-upcycle positioning as the broader WFE group.",
      [
        { label: "Structure", value: "Concentrated process-control niche within WFE oligopoly" },
        { label: "Cycle", value: "Secular capex tailwind, mid-upcycle" },
      ],
      [RESEARCH_NOTE, SEMI_BTB]
    ),
  },

  ANET: {
    moat: moat(
      3.5,
      "good",
      "Arista's EOS software and strong hyperscaler/AI-cluster design wins create real switching costs around its networking stack, but it competes against both Cisco's installed base and lower-cost white-box alternatives, keeping its moat real but narrower than the EDA or lithography names in this dataset.",
      [
        { label: "Moat type", value: "Switching costs (EOS software, hyperscaler design wins)" },
        { label: "Competitive set", value: "Cisco, white-box/Broadcom-based switches" },
      ]
    ),
    industry: industry(
      4.0,
      "good",
      "High-performance AI/cloud networking equipment is an oligopoly-ish structure (Arista, Cisco, Juniper, plus white-box alternatives) riding a strong secular AI-cluster-networking tailwind; early-to-mid cycle given the ongoing transition to higher-bandwidth cluster fabrics.",
      [
        { label: "Structure", value: "Oligopoly-ish AI/cloud networking market" },
        { label: "Cycle", value: "Secular AI-networking tailwind, early-mid cycle" },
      ]
    ),
  },

  BE: {
    moat: moat(
      1.75,
      "weak",
      "Bloom Energy's solid-oxide fuel cells create real switching costs once installed (long-term service contracts, site-specific integration), but the company is small-scale, has a history of cash burn, and faces competition from more flexible grid and gas-turbine alternatives — a niche technology position rather than a broad moat.",
      [
        { label: "Moat type", value: "Switching costs (installed base), small scale" },
        { label: "Key customers", value: "Oracle, AEP, CoreWeave" },
      ]
    ),
    industry: industry(
      3.25,
      "good",
      "On-site/distributed power generation (fuel cells) is a small, fragmented niche, but it benefits from a genuinely favorable secular tailwind as a faster-to-deploy bridge solution for data centers facing multi-year grid-interconnection queues; early-stage adoption within a real structural power bottleneck.",
      [
        { label: "Structure", value: "Fragmented niche within distributed power" },
        { label: "Cycle", value: "Early-stage secular tailwind from grid-interconnection bottleneck" },
      ]
    ),
  },

  IREN: {
    moat: moat(
      1.25,
      "weak",
      "IREN is pivoting from bitcoin mining to GPU-cloud hosting, a transition that carries real execution risk and leaves it with essentially the same low-differentiation, commodity-hosting economics as other neocloud entrants — no durable switching-cost or scale advantage has been established yet.",
      [
        { label: "Moat type", value: "None durable — pivoting commodity hosting business" },
        { label: "Corporate history", value: "Ex-bitcoin miner pivoting to AI/GPU hosting" },
      ]
    ),
    industry: industry(
      2.25,
      "neutral",
      "Same fragmented, competitive neocloud/GPU-hosting segment as CoreWeave and Nebius, riding the current AI capex boom but carrying real overbuild and financing risk given the capital intensity of the pivot.",
      [
        { label: "Structure", value: "Fragmented GPU-hosting segment" },
        { label: "Cycle", value: "Cyclical AI capex boom, pivot execution risk" },
      ]
    ),
  },

  AEP: {
    moat: moat(
      3.25,
      "good",
      "American Electric Power holds the same regulatory-franchise moat as its utility peers, with a growing data-center load pipeline (including as a Bloom Energy fuel-cell counterparty) that is incrementally strengthening the economics of an already-protected service territory.",
      [
        { label: "Moat type", value: "Regulatory franchise (service-territory monopoly)" },
        { label: "Demand signal", value: "Data-center load growth, Bloom Energy counterparty" },
      ]
    ),
    industry: industry(
      4.25,
      "strong",
      "Same regulated-monopoly structure and secular power-demand supercycle as the other utilities in this dataset, with AEP's territory seeing meaningful incremental data-center load growth.",
      [
        { label: "Structure", value: "Regulated monopoly (service-territory franchise)" },
        { label: "Cycle", value: "Secular power-demand supercycle, early-cycle" },
      ]
    ),
  },

  CIFR: {
    moat: moat(
      1.0,
      "poor",
      "Cipher Mining is fundamentally a power-arbitrage bitcoin-mining business pivoting toward GPU hosting; it has essentially no product differentiation, thin or negative historical returns on capital, and relies heavily on dilutive financing — among the weakest moat profiles in this dataset by design, not by mischaracterization.",
      [
        { label: "Moat type", value: "None — commodity power arbitrage / hosting, high dilution risk" },
        { label: "Corporate history", value: "Ex-bitcoin miner turned GPU host" },
      ]
    ),
    industry: industry(
      2.25,
      "neutral",
      "Same fragmented, low-differentiation neocloud/crypto-pivot segment as IREN, benefiting from the current AI capex boom's demand for any available power/GPU capacity, but with no structural protection against pricing pressure if that demand cools.",
      [
        { label: "Structure", value: "Fragmented GPU-hosting / crypto-pivot segment" },
        { label: "Cycle", value: "Cyclical AI capex boom, high financing/dilution risk" },
      ]
    ),
  },

  COHR: {
    moat: moat(
      2.75,
      "neutral",
      "Coherent's optical transceiver and laser business has decent switching costs via multi-quarter hyperscaler/telecom qualification cycles, but the broader optics market is increasingly commoditized by lower-cost Chinese suppliers (Innolight, Eoptolink), capping how much durable pricing power Coherent can sustain.",
      [
        { label: "Moat type", value: "Switching costs (qualification cycles), under commoditization pressure" },
        { label: "Competitive pressure", value: "Innolight, Eoptolink (China-based optics suppliers)" },
      ]
    ),
    industry: industry(
      3.5,
      "good",
      "Optical transceivers for data-center networking are oligopoly-ish at the high end but face real pricing pressure from lower-cost Chinese entrants, fragmenting industry pricing power even as the segment rides a strong secular 800G/1.6T optics upgrade tailwind tied to AI cluster networking; early-to-mid cycle.",
      [
        { label: "Structure", value: "Oligopoly-ish but fragmenting under China-based competition" },
        { label: "Cycle", value: "Secular 800G/1.6T optics tailwind, early-mid cycle" },
      ]
    ),
  },
};
