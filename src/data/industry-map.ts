// Auto-ported from reference/AI_Industry_Map.source.html (Sep 18, 2026 snapshot).
// Data only — node/edge/column/source content. Rendering logic is reimplemented in React.

export type EdgeType = 'supply' | 'money' | 'power' | 'partner';

export interface MapNode {
  id: string;
  name: string;
  layer: string;
  sub: string;
  desc: string;
  fact: string;
  src: string;
}

export interface MapEdge {
  from: string;
  to: string;
  type: EdgeType;
  label: string;
  cite: string;
  id: string;
}

export interface MapColumn {
  label: string;
  ids: string[];
}

export interface SourceRef {
  label: string;
  url: string | null;
}

export const nodes: MapNode[] = [
  {
    "id": "openai",
    "name": "OpenAI",
    "layer": "Frontier labs",
    "sub": "ChatGPT · $122B round",
    "desc": "Frontier-model lab with commitments spanning Azure, AWS, Oracle, CoreWeave and custom silicon.",
    "fact": "The February $110B announcement and March $122B close were one round; Nvidia and SoftBank each finalized $30B.",
    "src": "openaiRound"
  },
  {
    "id": "anthropic",
    "name": "Anthropic",
    "layer": "Frontier labs",
    "sub": "Claude · IPO filed",
    "desc": "Frontier lab backed by Amazon and Google and committed to both AWS Trainium and Google TPU capacity.",
    "fact": "Confidential IPO filing confirmed; timing and a possible $100B raise remain aspirational.",
    "src": "anthropicRound"
  },
  {
    "id": "deepmind",
    "name": "Google DeepMind",
    "layer": "Frontier labs",
    "sub": "Gemini · TPU stack",
    "desc": "Google’s frontier lab, vertically integrated with Google Cloud and the TPU platform.",
    "fact": "Google’s formal custom-silicon partner remains Broadcom.",
    "src": "broadcom"
  },
  {
    "id": "microsoftai",
    "name": "Microsoft AI",
    "layer": "Frontier labs",
    "sub": "MAI · 7 models",
    "desc": "Mustafa Suleyman’s in-house model group—not Meta—released seven MAI models and a draft code of conduct.",
    "fact": "The prior map misattributed these models and the 37-page code to Meta.",
    "src": "microsoft"
  },
  {
    "id": "metamsl",
    "name": "Meta MSL",
    "layer": "Frontier labs",
    "sub": "Muse Spark · Apr 2026",
    "desc": "Meta Superintelligence Labs is led by Alexandr Wang after Meta’s $14.3B Scale AI deal.",
    "fact": "Released the proprietary Muse Spark model family on April 8, 2026. Muse, Meta's consumer agentic app built on it, topped US free iPhone app charts for three straight days in September 2026, fueling a sector-wide re-rating of server-CPU demand (Arm, AMD, Intel, Qualcomm) for agentic-inference workloads.",
    "src": "metaMSL"
  },
  {
    "id": "mistral",
    "name": "Mistral AI",
    "layer": "Frontier labs",
    "sub": "Europe · €3B Series D",
    "desc": "European frontier lab with a stated 1GW European compute plan.",
    "fact": "Raised €3B at roughly €21B in September 2026; Samsung co-led.",
    "src": "mistral"
  },
  {
    "id": "deepseek",
    "name": "DeepSeek",
    "layer": "Frontier labs",
    "sub": "China · open models",
    "desc": "Chinese frontier-model lab whose low-cost models reshaped the economics debate around training and inference.",
    "fact": "Included as a confirmed major lab; this validation pass did not establish a current 2026 financing or cloud edge.",
    "src": "smic"
  },
  {
    "id": "xai",
    "name": "xAI / SpaceX",
    "layer": "Frontier labs",
    "sub": "Grok · post-merger",
    "desc": "xAI merged into SpaceX in February 2026; its large training clusters depend on Nvidia systems and new power.",
    "fact": "SpaceX completed its IPO in June 2026: $75B base proceeds at a reported $1.77T valuation.",
    "src": "spacex"
  },
  {
    "id": "azure",
    "name": "Microsoft Azure",
    "layer": "Cloud & compute",
    "sub": "$190B 2026 capex",
    "desc": "OpenAI’s primary cloud partner and a major buyer of Nvidia infrastructure, Nebius capacity and power.",
    "fact": "Microsoft's FY2026 10-K discloses $13.0B of OpenAI funding commitments, with OpenAI as the anchor AI workload on Azure.",
    "src": "microsoft"
  },
  {
    "id": "aws",
    "name": "AWS",
    "layer": "Cloud & compute",
    "sub": ">$230B capex",
    "desc": "Primary cloud and strategic investor for Anthropic; also expanded an OpenAI cloud arrangement.",
    "fact": "Anthropic commitment: more than $100B over ten years; Amazon investment: up to $33B total.",
    "src": "awsAnthropic"
  },
  {
    "id": "gcloud",
    "name": "Google Cloud",
    "layer": "Cloud & compute",
    "sub": "$180–190B capex",
    "desc": "TPU-centered cloud supporting DeepMind, Anthropic and Apple Private Cloud Compute.",
    "fact": "Google’s Anthropic package is reported at up to $40B plus up to 1M TPUs and 5GW by 2027.",
    "src": "hyperscaler"
  },
  {
    "id": "oracle",
    "name": "Oracle OCI",
    "layer": "Cloud & compute",
    "sub": "Stargate partner",
    "desc": "Cloud and data-center partner to OpenAI and Stargate, carrying a capital-intensive build.",
    "fact": "The $300B arrangement began as reported terms; Oracle later disclosed a $30B-a-year contract.",
    "src": "stargate"
  },
  {
    "id": "metadc",
    "name": "Meta data centers",
    "layer": "Cloud & compute",
    "sub": "$125–145B capex",
    "desc": "Meta’s compute estate buys Nvidia systems and custom MTIA accelerators.",
    "fact": "Nuclear package reaches up to 6.6GW by 2035—not “over 20 years.”",
    "src": "metaPower"
  },
  {
    "id": "apple",
    "name": "Apple PCC",
    "layer": "Cloud & compute",
    "sub": "Private Cloud Compute",
    "desc": "Apple ships Houston-built custom-silicon AI servers to its data centers and broadened PCC capacity in 2026.",
    "fact": "June reporting says PCC expanded onto Google Cloud and Nvidia GPUs; TSMC remains a key Apple foundry supplier.",
    "src": "apple"
  },
  {
    "id": "coreweave",
    "name": "CoreWeave",
    "layer": "Cloud & compute",
    "sub": "Nvidia-backed neocloud",
    "desc": "GPU cloud with more than 250,000 Nvidia GPUs and concentrated customer exposure.",
    "fact": "Microsoft was 62% of 2024 sales; Nvidia made a fresh $2B stock purchase in January 2026.",
    "src": "nebius"
  },
  {
    "id": "nebius",
    "name": "Nebius",
    "layer": "Cloud & compute",
    "sub": ">$40B backlog",
    "desc": "AI neocloud expanding on Microsoft and Meta contracts, Nvidia warrants and convertible debt.",
    "fact": "2026 capex guidance rose to $20–25B; year-end contracted-power target rose to 5GW.",
    "src": "nebius"
  },
  {
    "id": "humain",
    "name": "Humain",
    "layer": "Cloud & compute",
    "sub": "Saudi sovereign AI",
    "desc": "PIF-owned AI infrastructure company building sovereign compute around AMD, Nvidia, Cisco and Qualcomm systems.",
    "fact": "Reported plans include a $10B AMD framework and 1.9GW by 2030.",
    "src": "humain"
  },
  {
    "id": "chinacsp",
    "name": "Chinese CSPs",
    "layer": "Cloud & compute",
    "sub": "Alibaba · Tencent · ByteDance · Baidu",
    "desc": "China’s largest cloud and internet platforms form a parallel AI capex and custom-silicon market.",
    "fact": "Moody’s estimated leading Chinese platforms at roughly $140B of capex; ByteDance was separately reported at up to $70B in 2026.",
    "src": "smic"
  },
  {
    "id": "inference",
    "name": "Inference clouds",
    "layer": "Cloud & compute",
    "sub": "Fireworks · Baseten",
    "desc": "The fast-growing model-serving tier rounded out by Fireworks AI and Baseten, alongside the now separately tracked Together AI.",
    "fact": "Fireworks raised $1.51B in July 2026; Baseten's growth has tracked the same inference-serving boom.",
    "src": "inference"
  },
  {
    "id": "nvidia",
    "name": "Nvidia",
    "layer": "Software & silicon",
    "sub": "GPU + networking",
    "desc": "The central accelerator and networking supplier—and a financier of several customers.",
    "fact": "Q1 FY27 networking revenue was $14.8B, up 199%; Nvidia led data-center Ethernet by revenue.",
    "src": "networking"
  },
  {
    "id": "cuda",
    "name": "CUDA ecosystem",
    "layer": "Software & silicon",
    "sub": "Runtime moat",
    "desc": "Nvidia’s software stack, libraries and tooling make accelerator switching costly.",
    "fact": "The missing software layer is a structural dependency, not an optional add-on.",
    "src": "rocm"
  },
  {
    "id": "broadcom",
    "name": "Broadcom",
    "layer": "Software & silicon",
    "sub": "Custom XPU + Ethernet",
    "desc": "Designs custom accelerators for Google and Meta and supplies merchant Ethernet silicon.",
    "fact": "$73B AI backlog was reported; longer $58B→$115B→$230B figures are management outlook, not booked revenue.",
    "src": "broadcom"
  },
  {
    "id": "amd",
    "name": "AMD",
    "layer": "Software & silicon",
    "sub": "MI450 challenger",
    "desc": "Accelerator challenger building a full system and networking stack.",
    "fact": "MI450 is specified with 432GB HBM4; the $14B Core Scientific figure is lease value, not a chip order. Rose ~3-6% in September 2026 alongside Arm and Intel as Meta's Muse agentic app surged in App Store rankings, reinforcing the $60B/6GW Meta Instinct GPU commitment signed Feb 24, 2026.",
    "src": "servers"
  },
  {
    "id": "rocm",
    "name": "ROCm",
    "layer": "Software & silicon",
    "sub": "CUDA alternative",
    "desc": "AMD’s open software stack is the only credible large-scale alternative to CUDA in the validation pass.",
    "fact": "Software maturity gates how quickly AMD hardware can convert into deployed workloads.",
    "src": "rocm"
  },
  {
    "id": "marvell",
    "name": "Marvell",
    "layer": "Software & silicon",
    "sub": "Teralynx + custom XPU",
    "desc": "Networking and custom-silicon supplier with material 2026 interconnect products.",
    "fact": "Google work remains talks; Microsoft Maia could not be independently confirmed. Teralynx T100 is 102Tbps.",
    "src": "marvell"
  },
  {
    "id": "trainium",
    "name": "AWS Annapurna",
    "layer": "Software & silicon",
    "sub": "Trainium3 shipping",
    "desc": "Amazon’s in-house operation behind Trainium and Graviton.",
    "fact": "Trainium3 is shipping; Trainium4 is in development for 2027, not deployed.",
    "src": "awsAnthropic"
  },
  {
    "id": "maia",
    "name": "Microsoft Maia",
    "layer": "Software & silicon",
    "sub": "Maia 200 · in-house",
    "desc": "Microsoft’s in-house accelerator program serves Azure and OpenAI workloads.",
    "fact": "Maia 200 was announced January 2026 with 217GB HBM3e and serves GPT-5.2.",
    "src": "microsoft"
  },
  {
    "id": "cerebras",
    "name": "Cerebras",
    "layer": "Software & silicon",
    "sub": "CBRS · May 2026 IPO",
    "desc": "Wafer-scale accelerator company and alternative AI-compute supplier.",
    "fact": "Already public: May 2026 IPO at $185, raising roughly $5.5B.",
    "src": "cerebras"
  },
  {
    "id": "cambricon",
    "name": "Cambricon",
    "layer": "Software & silicon",
    "sub": "China AI chips",
    "desc": "China’s leading listed AI-chip challenger, reliant on domestic foundry capacity.",
    "fact": "H1 2026 revenue reported at ¥6B; ByteDance reportedly represented more than half of orders.",
    "src": "cambricon"
  },
  {
    "id": "tsmc",
    "name": "TSMC",
    "layer": "Fabrication & links",
    "sub": "73% foundry share",
    "desc": "The indispensable manufacturer behind Nvidia, Apple, AMD, Broadcom and hyperscaler chips.",
    "fact": "2026 capex guidance rose to $60–64B; the >90% advanced-logic claim is a widely cited characterization, not an audited figure.",
    "src": "tsmc"
  },
  {
    "id": "smic",
    "name": "SMIC",
    "layer": "Fabrication & links",
    "sub": "5.4% foundry share",
    "desc": "The world’s third-largest foundry and the essential advanced-node source for China’s AI chip ecosystem.",
    "fact": "Q2 2026 revenue was $3.006B and share 5.4%.",
    "src": "smic"
  },
  {
    "id": "skhynix",
    "name": "SK Hynix",
    "layer": "Fabrication & links",
    "sub": "~50% HBM share",
    "desc": "Leading high-bandwidth memory supplier and strategic Nvidia partner.",
    "fact": "About half of projected 2026 HBM; claims that all DRAM, NAND and HBM were sold out were not retained.",
    "src": "sk"
  },
  {
    "id": "samsung",
    "name": "Samsung",
    "layer": "Fabrication & links",
    "sub": "HBM + foundry",
    "desc": "HBM supplier and foundry competitor; also invested strategically in Anthropic.",
    "fact": "Qualification leadership is not volume leadership; SK Hynix was projected at 60–70% of Rubin HBM4 volume.",
    "src": "hbm"
  },
  {
    "id": "micron",
    "name": "Micron",
    "layer": "Fabrication & links",
    "sub": "HBM supplier",
    "desc": "One of three major HBM suppliers and a strategic investor in Anthropic.",
    "fact": "2026 capex guidance rose to roughly $27B; calendar-2026 HBM was fully booked.",
    "src": "hbm"
  },
  {
    "id": "asml",
    "name": "ASML",
    "layer": "Fabrication & links",
    "sub": "Sole EUV supplier",
    "desc": "The sole source of EUV systems required for leading-edge manufacturing.",
    "fact": "2026 revenue guidance rose to €43–45B; estimated lithography share was 94%.",
    "src": "asml"
  },
  {
    "id": "packaging",
    "name": "ASE / Amkor",
    "layer": "Fabrication & links",
    "sub": "OSAT + CoWoS overflow",
    "desc": "Advanced packaging and test sit between wafers and deployable accelerators.",
    "fact": "ASE advanced-packaging sales were expected to roughly double in 2026; Amkor partners with TSMC in the US.",
    "src": "packaging"
  },
  {
    "id": "eda",
    "name": "Synopsys + Cadence",
    "layer": "Fabrication & links",
    "sub": "EDA + simulation",
    "desc": "The chip-design software layer used before tape-out, missing from the first map.",
    "fact": "Synopsys closed its $35B Ansys deal; Cadence raised 2026 guidance amid AI-design demand.",
    "src": "eda"
  },
  {
    "id": "optics",
    "name": "Innolight + Eoptolink",
    "layer": "Fabrication & links",
    "sub": "800G / 1.6T optics",
    "desc": "Chinese optical-module leaders carrying traffic between AI racks.",
    "fact": "Innolight was estimated at ~28% share; the pair was expected to win ~80% of Google’s 800G+ orders.",
    "src": "optics"
  },
  {
    "id": "interconnect",
    "name": "Credo + Astera",
    "layer": "Fabrication & links",
    "sub": "AEC · retimers · CXL",
    "desc": "Interconnect suppliers spanning active electrical cables, retimers, DSPs and fabric switches.",
    "fact": "Credo FY2026 revenue grew 206%; Astera Q1 2026 revenue grew 93%.",
    "src": "interconnect"
  },
  {
    "id": "dell",
    "name": "Dell",
    "layer": "Systems & sites",
    "sub": "$74B FY27 outlook",
    "desc": "AI-server integrator turning GPU and custom platforms into deployable systems.",
    "fact": "Dell raised FY27 AI-server revenue outlook to $74B on September 1, 2026.",
    "src": "dell"
  },
  {
    "id": "supermicro",
    "name": "Super Micro",
    "layer": "Systems & sites",
    "sub": "AI GPU systems",
    "desc": "High-volume server integrator with legal and margin risk.",
    "fact": "The alleged export scheme was $2.5B; the company itself was not charged.",
    "src": "servers"
  },
  {
    "id": "odms",
    "name": "Taiwan ODMs",
    "layer": "Systems & sites",
    "sub": "Quanta · Wistron · Wiwynn",
    "desc": "The contract manufacturers that physically build a large share of AI racks.",
    "fact": "Wistron opened a $700M Fort Worth plant; Quanta said AI servers exceeded 75% of server revenue.",
    "src": "odm"
  },
  {
    "id": "foxconn",
    "name": "Foxconn",
    "layer": "Systems & sites",
    "sub": "Rack assembly",
    "desc": "Large AI-rack manufacturer expanding US production.",
    "fact": "Its roughly 40% rack-share figure is a company/brokerage estimate, not audited market share.",
    "src": "servers"
  },
  {
    "id": "equinix",
    "name": "Equinix + Digital Realty",
    "layer": "Systems & sites",
    "sub": "DC REITs · ~9GW pipeline",
    "desc": "The property and interconnection layer between cloud contracts and power procurement.",
    "fact": "Equinix Q2 revenue was $2.63B; Digital Realty reported a roughly 9GW pipeline.",
    "src": "dc"
  },
  {
    "id": "vertiv",
    "name": "Vertiv",
    "layer": "Systems & sites",
    "sub": "Rack power + cooling",
    "desc": "Critical rack-level power and thermal infrastructure supplier.",
    "fact": "2026 sales guidance was $13.5–14B with about $15B backlog.",
    "src": "vertiv"
  },
  {
    "id": "applieddigital",
    "name": "Applied Digital",
    "layer": "Systems & sites",
    "sub": "210MW lease",
    "desc": "Data-center developer converting power access into long-duration AI capacity.",
    "fact": "Reported $5.2B, 15-year hyperscaler lease and 1.4GW portfolio.",
    "src": "dc"
  },
  {
    "id": "crusoe",
    "name": "Crusoe",
    "layer": "Systems & sites",
    "sub": "Energy-first builder",
    "desc": "Data-center builder at the Abilene Stargate site and buyer of gas turbines.",
    "fact": "Its Microsoft buildings are adjacent to Stargate after OpenAI passed on expansion; Project Kilby is separate.",
    "src": "ge"
  },
  {
    "id": "ge",
    "name": "GE Vernova",
    "layer": "Power & utilities",
    "sub": "$176B backlog",
    "desc": "Gas-turbine supplier to AI data-center developers including Crusoe.",
    "fact": "2026 revenue guidance rose to $45.5–46.5B; unverified sold-out/pricing superlatives were removed.",
    "src": "ge"
  },
  {
    "id": "constellation",
    "name": "Constellation",
    "layer": "Power & utilities",
    "sub": "Nuclear PPAs",
    "desc": "Nuclear generator restarting Three Mile Island Unit 1 for Microsoft.",
    "fact": "$1.6B restart; 835MW, 20-year PPA targeting 2028.",
    "src": "constellation"
  },
  {
    "id": "vistra",
    "name": "Vistra",
    "layer": "Power & utilities",
    "sub": "Meta + AWS PPAs",
    "desc": "Nuclear and gas generator serving hyperscaler demand.",
    "fact": "Meta package includes more than 2.6GW; separate AWS PPA covers 1,200MW.",
    "src": "metaPower"
  },
  {
    "id": "entergy",
    "name": "Entergy",
    "layer": "Power & utilities",
    "sub": "Meta Louisiana · 5.2GW",
    "desc": "Regulated utility expanding generation and transmission for Meta’s Louisiana build.",
    "fact": "Meta agreed to fund seven gas plants, transmission and renewable capacity; reported generation exceeds 5.2GW.",
    "src": "utility"
  },
  {
    "id": "talen",
    "name": "Talen Energy",
    "layer": "Power & utilities",
    "sub": "AWS nuclear · 1,920MW",
    "desc": "Independent power producer supplying Amazon from Susquehanna nuclear generation.",
    "fact": "$18B, 17-year PPA covers up to 1,920MW through 2042.",
    "src": "utility"
  },
  {
    "id": "nextera",
    "name": "NextEra + Dominion",
    "layer": "Power & utilities",
    "sub": "$67B merger announced",
    "desc": "Utility-scale expression of AI load growth centered on Northern Virginia Data Center Alley.",
    "fact": "All-stock merger announced May 2026; Dominion had ~51GW contracted data-center capacity.",
    "src": "utility"
  },
  {
    "id": "arm",
    "name": "Arm Holdings",
    "layer": "Software & silicon",
    "sub": "Neoverse · AGI CPU",
    "desc": "Architecture licensor whose designs underpin Nvidia Grace/Vera, AWS Graviton, Azure Cobalt and Google Axion — and, since March 2026, its own production CPU.",
    "fact": "The AGI CPU (announced Mar 24, 2026) is Arm's first production chip in 35 years, co-developed with Meta; Arm-based designs were estimated near 50% of hyperscaler CPU share in 2026. Gained ~4-9% in September 2026 as Meta's Muse agentic app drove expectations that agentic-inference workloads need more server CPUs, not just GPUs — building on Arm's Oct 2025 Neoverse partnership powering Meta's ranking and recommendation infrastructure.",
    "src": "arm"
  },
  {
    "id": "softbank",
    "name": "SoftBank",
    "layer": "Software & silicon",
    "sub": "Arm owner · OpenAI backer",
    "desc": "Japanese conglomerate holding roughly 90% of Arm and standing as one of OpenAI's two $30B anchor investors.",
    "fact": "Finalized $30B into OpenAI's $122B round; acquired Arm for $32B in 2016 and retains about 90% ownership.",
    "src": "openaiRound"
  },
  {
    "id": "groq",
    "name": "Groq",
    "layer": "Software & silicon",
    "sub": "LPU · Nvidia-licensed",
    "desc": "Inference-chip maker whose low-latency LPU architecture now underlies Nvidia's fastest inference racks, while GroqCloud continues operating as a nominally independent business.",
    "fact": "Nvidia agreed to a $20B non-exclusive licensing-and-acquihire deal in December 2025 — its largest transaction on record; Groq 3 LPU racks reached full production in August 2026.",
    "src": "groq"
  },
  {
    "id": "qualcomm",
    "name": "Qualcomm",
    "layer": "Software & silicon",
    "sub": "AI200 · AI250 inference",
    "desc": "Mobile-chip leader pushing into data-center AI inference silicon and sovereign-compute partnerships.",
    "fact": "Signed an AI compute partnership with Saudi Arabia's Humain at LEAP 2026, adding to a partner list that already included Adobe, AMD, Cisco and Groq.",
    "src": "qualcomm"
  },
  {
    "id": "intel",
    "name": "Intel",
    "layer": "Software & silicon",
    "sub": "Xeon 6+ · Gaudi",
    "desc": "Legacy CPU leader supplying Xeon server processors into AI systems while its own accelerator and foundry ambitions lag rivals.",
    "fact": "Twelve new Xeon 6+-optimized Supermicro server families launched alongside AMD and Arm platforms in Supermicro's mid-2026 rack-scale product wave. Rallied ~6-8% in September 2026 alongside Arm and AMD as Meta's Muse agentic app topped App Store charts and investors re-rated the whole server-CPU sector for agentic-inference demand — notably without a specific Intel-Meta deal: Meta's own recent CPU contracts (Arm Neoverse, Qualcomm Dragonfly) bypassed Intel entirely.",
    "src": "intel"
  },
  {
    "id": "cisco",
    "name": "Cisco",
    "layer": "Systems & sites",
    "sub": "Secure AI Factory",
    "desc": "Networking incumbent bundling Nvidia and Supermicro compute into a packaged AI-factory architecture for enterprise, neocloud and sovereign customers.",
    "fact": "Announced a Supermicro partnership for its Secure AI Factory architecture and a 250MW Humain venture alongside AMD beginning in 2027.",
    "src": "cisco"
  },
  {
    "id": "oklo",
    "name": "Oklo",
    "layer": "Power & utilities",
    "sub": "Aurora fast reactor",
    "desc": "Advanced-fission startup building a fast-reactor campus to help supply Meta's Ohio AI buildout.",
    "fact": "Meta's January 2026 nuclear RFP gives Oklo's Pike County, Ohio campus a path to up to 1.2GW by 2034, pending regulatory approval.",
    "src": "metaPower"
  },
  {
    "id": "terrapower",
    "name": "TerraPower",
    "layer": "Power & utilities",
    "sub": "Natrium SMR",
    "desc": "Bill Gates-backed advanced-reactor developer supplying small modular reactor capacity into Meta's nuclear procurement.",
    "fact": "One of three winners in Meta's January 9, 2026 nuclear RFP alongside Vistra and Oklo, sharing in the 6.6GW package targeted by 2035.",
    "src": "metaPower"
  },
  {
    "id": "g42",
    "name": "G42",
    "layer": "Cloud & compute",
    "sub": "Abu Dhabi · Stargate UAE",
    "desc": "Emirati AI operating company anchoring Stargate UAE, a Nvidia-based compute cluster built with OpenAI, Oracle, Cisco and SoftBank.",
    "fact": "Stargate UAE targets 1GW of capacity within a 5GW campus ceiling; its first 200MW phase is slated for 2026. Microsoft has held a $1.5B stake in G42 since 2024.",
    "src": "g42"
  },
  {
    "id": "mgx",
    "name": "MGX",
    "layer": "Cloud & compute",
    "sub": "Abu Dhabi · $100B fund",
    "desc": "Abu Dhabi sovereign investment vehicle, chaired by Sheikh Tahnoon bin Zayed, that is an equity funder of Stargate LLC and a backer of OpenAI, Anthropic, xAI and Databricks.",
    "fact": "Targets roughly $100B in AUM; participated in a $30B Anthropic round (Feb 2026) and a $10B Databricks round at a $62B valuation.",
    "src": "mgx"
  },
  {
    "id": "scaleai",
    "name": "Scale AI",
    "layer": "Frontier labs",
    "sub": "Data · Meta-backed",
    "desc": "Data-labeling and RLHF provider that became the launchpad for Meta's frontier-model reset after Meta's $14.3B investment.",
    "fact": "The deal installed Scale AI founder Alexandr Wang as head of the newly formed Meta Superintelligence Labs.",
    "src": "metaMSL"
  },
  {
    "id": "databricks",
    "name": "Databricks",
    "layer": "Cloud & compute",
    "sub": "Data + AI platform",
    "desc": "Enterprise data and AI platform whose valuation has climbed alongside hyperscaler-scale funding rounds from sovereign and venture investors.",
    "fact": "Raised $10B in 2024 at a $62B valuation, backed in part by Abu Dhabi's MGX; ranked the fourth most highly valued U.S. startup behind OpenAI, SpaceX and Stripe.",
    "src": "mgx"
  },
  {
    "id": "hpe",
    "name": "HPE",
    "layer": "Systems & sites",
    "sub": "AI servers + networking",
    "desc": "Server and networking integrator competing with Dell and Supermicro, now bundling Juniper's networking gear into its AI-factory pitch.",
    "fact": "Q3 FY2026 AI systems orders reached $2.4B, pushing its AI backlog to roughly $7.6B even as memory shortages capped shipments.",
    "src": "hpe"
  },
  {
    "id": "togetherai",
    "name": "Together AI",
    "layer": "Cloud & compute",
    "sub": "Inference · fine-tuning",
    "desc": "Model-serving and fine-tuning cloud that has moved beyond pure inference into sovereign-scale infrastructure deals.",
    "fact": "Signed on for a planned 250MW facility with Saudi Arabia's Humain at LEAP 2026, on top of its own $800M raise.",
    "src": "inference"
  }
];

export const edges: MapEdge[] = [
  {
    "from": "openai",
    "to": "azure",
    "type": "partner",
    "label": "increasing Azure consumption",
    "cite": "Microsoft FY2026 10-K",
    "id": "e0"
  },
  {
    "from": "openai",
    "to": "aws",
    "type": "partner",
    "label": "$100B / 8-year cloud expansion",
    "cite": "Reuters · Feb 27, 2026",
    "id": "e1"
  },
  {
    "from": "openai",
    "to": "oracle",
    "type": "partner",
    "label": "reported $300B cloud arrangement",
    "cite": "Oracle filing / reported terms",
    "id": "e2"
  },
  {
    "from": "openai",
    "to": "coreweave",
    "type": "partner",
    "label": "$11.9B infrastructure deal",
    "cite": "Reuters · Mar 10, 2025",
    "id": "e3"
  },
  {
    "from": "anthropic",
    "to": "aws",
    "type": "partner",
    "label": ">$100B / 10 years",
    "cite": "TechCrunch · Apr 20, 2026",
    "id": "e4"
  },
  {
    "from": "anthropic",
    "to": "gcloud",
    "type": "partner",
    "label": "up to 1M TPUs / 5GW by 2027",
    "cite": "TechCrunch · Apr 24, 2026",
    "id": "e5"
  },
  {
    "from": "aws",
    "to": "anthropic",
    "type": "money",
    "label": "up to $33B total",
    "cite": "TechCrunch · Apr 20, 2026",
    "id": "e6"
  },
  {
    "from": "gcloud",
    "to": "anthropic",
    "type": "money",
    "label": "up to $40B; milestones apply",
    "cite": "TechCrunch · Apr 24, 2026",
    "id": "e7"
  },
  {
    "from": "azure",
    "to": "openai",
    "type": "money",
    "label": "$13.0B total commitments",
    "cite": "Microsoft FY2026 10-K",
    "id": "e8"
  },
  {
    "from": "aws",
    "to": "openai",
    "type": "money",
    "label": "$50B equity; cloud deal separate",
    "cite": "Reuters · Feb 27, 2026",
    "id": "e9"
  },
  {
    "from": "nvidia",
    "to": "openai",
    "type": "money",
    "label": "$30B finalized; $100B LOI superseded",
    "cite": "PYMNTS · Feb/Mar 2026",
    "id": "e10"
  },
  {
    "from": "nvidia",
    "to": "coreweave",
    "type": "money",
    "label": "$2B stock purchase, Jan 2026",
    "cite": "Morningstar/MarketWatch · Jan 26, 2026",
    "id": "e11"
  },
  {
    "from": "nvidia",
    "to": "nebius",
    "type": "money",
    "label": "single ~$2B warrant investment",
    "cite": "Reuters · Mar 23, 2026",
    "id": "e12"
  },
  {
    "from": "deepmind",
    "to": "gcloud",
    "type": "partner",
    "label": "vertically integrated",
    "cite": "TrendForce · Mar 5, 2026",
    "id": "e13"
  },
  {
    "from": "microsoftai",
    "to": "azure",
    "type": "partner",
    "label": "in-house compute",
    "cite": "Microsoft · Sep 2026",
    "id": "e14"
  },
  {
    "from": "metamsl",
    "to": "metadc",
    "type": "partner",
    "label": "in-house compute",
    "cite": "Reuters via Goldsea · Apr 2026",
    "id": "e15"
  },
  {
    "from": "metadc",
    "to": "broadcom",
    "type": "partner",
    "label": "MTIA multi-generation partnership",
    "cite": "TrendForce · Jun 4, 2026",
    "id": "e16"
  },
  {
    "from": "aws",
    "to": "trainium",
    "type": "partner",
    "label": "in-house accelerator",
    "cite": "TechCrunch · Apr 20, 2026",
    "id": "e17"
  },
  {
    "from": "azure",
    "to": "maia",
    "type": "partner",
    "label": "in-house accelerator",
    "cite": "Microsoft · Jan 26, 2026",
    "id": "e18"
  },
  {
    "from": "gcloud",
    "to": "broadcom",
    "type": "partner",
    "label": "formal TPU partner",
    "cite": "TrendForce · Mar 5, 2026",
    "id": "e19"
  },
  {
    "from": "coreweave",
    "to": "nvidia",
    "type": "supply",
    "label": ">250K GPUs",
    "cite": "Reuters · Mar 27, 2025",
    "id": "e20"
  },
  {
    "from": "nebius",
    "to": "nvidia",
    "type": "supply",
    "label": "Vera Rubin capacity",
    "cite": "Reuters · Mar 23, 2026",
    "id": "e21"
  },
  {
    "from": "azure",
    "to": "nebius",
    "type": "partner",
    "label": "up to $19.4B",
    "cite": "Reuters · Sep 8, 2025",
    "id": "e22"
  },
  {
    "from": "metadc",
    "to": "nebius",
    "type": "partner",
    "label": "up to $27B",
    "cite": "Morningstar/Dow Jones · Mar 16, 2026",
    "id": "e23"
  },
  {
    "from": "chinacsp",
    "to": "cambricon",
    "type": "partner",
    "label": "ByteDance reportedly >50% of orders",
    "cite": "Morningstar · Jul 1, 2026",
    "id": "e56"
  },
  {
    "from": "humain",
    "to": "amd",
    "type": "partner",
    "label": "$10B / 500MW framework",
    "cite": "Data Center Dynamics · Sep 2026",
    "id": "e24"
  },
  {
    "from": "nvidia",
    "to": "cuda",
    "type": "supply",
    "label": "software ecosystem",
    "cite": "EE Times · Mar 30, 2026",
    "id": "e25"
  },
  {
    "from": "amd",
    "to": "rocm",
    "type": "supply",
    "label": "open software stack",
    "cite": "EE Times · Mar 30, 2026",
    "id": "e26"
  },
  {
    "from": "tsmc",
    "to": "nvidia",
    "type": "supply",
    "label": "advanced fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e27"
  },
  {
    "from": "tsmc",
    "to": "apple",
    "type": "supply",
    "label": "custom silicon fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e28"
  },
  {
    "from": "gcloud",
    "to": "apple",
    "type": "partner",
    "label": "PCC expansion, reported Jun 2026",
    "cite": "MacRumors · Jun 8, 2026",
    "id": "e29"
  },
  {
    "from": "nvidia",
    "to": "apple",
    "type": "supply",
    "label": "PCC GPU capacity, reported Jun 2026",
    "cite": "MacRumors · Jun 8, 2026",
    "id": "e30"
  },
  {
    "from": "tsmc",
    "to": "broadcom",
    "type": "supply",
    "label": "advanced fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e31"
  },
  {
    "from": "tsmc",
    "to": "amd",
    "type": "supply",
    "label": "advanced fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e32"
  },
  {
    "from": "tsmc",
    "to": "trainium",
    "type": "supply",
    "label": "advanced fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e33"
  },
  {
    "from": "tsmc",
    "to": "marvell",
    "type": "supply",
    "label": "advanced fabrication",
    "cite": "MacRumors/CNBC · Jan 28, 2026",
    "id": "e34"
  },
  {
    "from": "smic",
    "to": "cambricon",
    "type": "supply",
    "label": "domestic advanced-node capacity",
    "cite": "TrendForce · Sep 9, 2026",
    "id": "e35"
  },
  {
    "from": "skhynix",
    "to": "nvidia",
    "type": "supply",
    "label": "HBM; about half of 2026 market",
    "cite": "Reuters / TrendForce · 2026",
    "id": "e36"
  },
  {
    "from": "samsung",
    "to": "nvidia",
    "type": "supply",
    "label": "HBM4 qualification; volume caveat",
    "cite": "TrendForce · Mar 9, 2026",
    "id": "e37"
  },
  {
    "from": "micron",
    "to": "nvidia",
    "type": "supply",
    "label": "HBM; 2026 capacity booked",
    "cite": "TrendForce · 2026",
    "id": "e38"
  },
  {
    "from": "asml",
    "to": "tsmc",
    "type": "supply",
    "label": "EUV systems",
    "cite": "Reuters · Sep 14, 2026",
    "id": "e39"
  },
  {
    "from": "packaging",
    "to": "nvidia",
    "type": "supply",
    "label": "advanced packaging / test",
    "cite": "EE Times · Feb 6, 2026",
    "id": "e40"
  },
  {
    "from": "eda",
    "to": "nvidia",
    "type": "supply",
    "label": "chip design + simulation tools",
    "cite": "Synopsys / Reuters · 2025–26",
    "id": "e41"
  },
  {
    "from": "optics",
    "to": "gcloud",
    "type": "supply",
    "label": "~80% of 800G+ orders, estimate",
    "cite": "TrendForce/LEDinside · Feb 11, 2026",
    "id": "e42"
  },
  {
    "from": "interconnect",
    "to": "nvidia",
    "type": "supply",
    "label": "AEC / retimers / NVLink Fusion",
    "cite": "Morningstar/Futurum · 2026",
    "id": "e43"
  },
  {
    "from": "nvidia",
    "to": "dell",
    "type": "supply",
    "label": "AI server platforms",
    "cite": "Dell · Sep 1, 2026",
    "id": "e44"
  },
  {
    "from": "nvidia",
    "to": "supermicro",
    "type": "supply",
    "label": "AI GPU platforms",
    "cite": "Data Center Knowledge · 2026",
    "id": "e45"
  },
  {
    "from": "nvidia",
    "to": "odms",
    "type": "supply",
    "label": "rack-scale designs",
    "cite": "Reuters / TrendForce · 2026",
    "id": "e46"
  },
  {
    "from": "nvidia",
    "to": "foxconn",
    "type": "supply",
    "label": "rack-scale systems",
    "cite": "Data Center Knowledge · 2026",
    "id": "e47"
  },
  {
    "from": "odms",
    "to": "azure",
    "type": "partner",
    "label": "AI rack manufacturing",
    "cite": "Reuters / company reporting · 2026",
    "id": "e48"
  },
  {
    "from": "odms",
    "to": "aws",
    "type": "partner",
    "label": "AI rack manufacturing",
    "cite": "Reuters / company reporting · 2026",
    "id": "e49"
  },
  {
    "from": "ge",
    "to": "crusoe",
    "type": "power",
    "label": "29 turbines, ~1GW",
    "cite": "GE Vernova · Jul 22, 2025",
    "id": "e50"
  },
  {
    "from": "constellation",
    "to": "azure",
    "type": "power",
    "label": "835MW PPA",
    "cite": "Reuters · Sep 20, 2024",
    "id": "e51"
  },
  {
    "from": "vistra",
    "to": "metadc",
    "type": "power",
    "label": ">2.6GW nuclear package",
    "cite": "POWER · Jan 2026",
    "id": "e52"
  },
  {
    "from": "vistra",
    "to": "aws",
    "type": "power",
    "label": "1,200MW PPA",
    "cite": "Validation report · Nov 2025 deal",
    "id": "e53"
  },
  {
    "from": "entergy",
    "to": "metadc",
    "type": "power",
    "label": ">5.2GW generation build",
    "cite": "Reuters · Mar 27, 2026",
    "id": "e54"
  },
  {
    "from": "talen",
    "to": "aws",
    "type": "power",
    "label": "up to 1,920MW nuclear",
    "cite": "Reuters · Jun 11, 2025",
    "id": "e55"
  },
  {
    "from": "softbank",
    "to": "arm",
    "type": "money",
    "label": "~90% ownership since 2016 $32B acquisition",
    "cite": "mlq.ai · Mar 24, 2026",
    "id": "e57"
  },
  {
    "from": "softbank",
    "to": "openai",
    "type": "money",
    "label": "$30B finalized as part of $122B round",
    "cite": "OpenAI / PYMNTS · Mar 31, 2026",
    "id": "e58"
  },
  {
    "from": "arm",
    "to": "nvidia",
    "type": "supply",
    "label": "architecture underlies Grace and Vera CPUs",
    "cite": "Forbes · Mar 24, 2026",
    "id": "e59"
  },
  {
    "from": "arm",
    "to": "trainium",
    "type": "supply",
    "label": "Graviton architecture; ~40% of AWS EC2 capacity",
    "cite": "vaasblock · Sep 2026",
    "id": "e60"
  },
  {
    "from": "arm",
    "to": "maia",
    "type": "supply",
    "label": "Cobalt 100 Arm-based Azure CPUs",
    "cite": "247 Wall St · Jul 30, 2026",
    "id": "e61"
  },
  {
    "from": "arm",
    "to": "gcloud",
    "type": "supply",
    "label": "Axion Arm-based CPUs in Google infrastructure",
    "cite": "247 Wall St · Sep 7, 2026",
    "id": "e62"
  },
  {
    "from": "arm",
    "to": "supermicro",
    "type": "partner",
    "label": "AGI CPU commercial systems partner",
    "cite": "mlq.ai · Mar 24, 2026",
    "id": "e63"
  },
  {
    "from": "arm",
    "to": "cerebras",
    "type": "partner",
    "label": "AGI CPU launch partner",
    "cite": "mlq.ai · Mar 24, 2026",
    "id": "e64"
  },
  {
    "from": "arm",
    "to": "openai",
    "type": "partner",
    "label": "AGI CPU launch partner",
    "cite": "mlq.ai · Mar 24, 2026",
    "id": "e65"
  },
  {
    "from": "nvidia",
    "to": "groq",
    "type": "money",
    "label": "$20B non-exclusive licensing + acquihire",
    "cite": "CNBC · Dec 24, 2025",
    "id": "e66"
  },
  {
    "from": "groq",
    "to": "humain",
    "type": "partner",
    "label": "LPU inference platform in sovereign data centers",
    "cite": "Arab News · Aug 7, 2025",
    "id": "e67"
  },
  {
    "from": "qualcomm",
    "to": "humain",
    "type": "partner",
    "label": "AI compute partnership announced at LEAP 2026",
    "cite": "Global Data Center Hub · Sep 7, 2026",
    "id": "e68"
  },
  {
    "from": "cisco",
    "to": "humain",
    "type": "partner",
    "label": "250MW AI factory venture with AMD, starting 2027",
    "cite": "Global Data Center Hub · Sep 7, 2026",
    "id": "e69"
  },
  {
    "from": "cisco",
    "to": "supermicro",
    "type": "partner",
    "label": "Secure AI Factory rack-scale integration",
    "cite": "Yahoo Finance · Sep 3, 2026",
    "id": "e70"
  },
  {
    "from": "amd",
    "to": "supermicro",
    "type": "supply",
    "label": "Helios rack-scale platforms",
    "cite": "Simply Wall St · Jun 2026",
    "id": "e71"
  },
  {
    "from": "intel",
    "to": "supermicro",
    "type": "supply",
    "label": "Xeon 6+-optimized server families",
    "cite": "Simply Wall St · Jun 2026",
    "id": "e72"
  },
  {
    "from": "oklo",
    "to": "metadc",
    "type": "power",
    "label": "up to 1.2GW advanced reactor campus by 2034",
    "cite": "POWER · Jan 9, 2026",
    "id": "e73"
  },
  {
    "from": "terrapower",
    "to": "metadc",
    "type": "power",
    "label": "Natrium SMR; part of 6.6GW nuclear package",
    "cite": "POWER · Jan 9, 2026",
    "id": "e74"
  },
  {
    "from": "openai",
    "to": "amd",
    "type": "partner",
    "label": "6GW multi-year MI450 deal; warrant for up to 160M AMD shares (~10%)",
    "cite": "AMD · Oct 6, 2025",
    "id": "e75"
  },
  {
    "from": "openai",
    "to": "broadcom",
    "type": "partner",
    "label": "10GW custom AI accelerator co-development, 2026–2029",
    "cite": "CNBC · Oct 13, 2025",
    "id": "e76"
  },
  {
    "from": "nvidia",
    "to": "g42",
    "type": "supply",
    "label": "GB300 clusters for Stargate UAE",
    "cite": "CNBC · May 22, 2025",
    "id": "e77"
  },
  {
    "from": "cisco",
    "to": "g42",
    "type": "partner",
    "label": "zero-trust networking for Stargate UAE",
    "cite": "Tech Times · Jul 16, 2026",
    "id": "e78"
  },
  {
    "from": "oracle",
    "to": "g42",
    "type": "partner",
    "label": "Stargate UAE co-development",
    "cite": "CNBC · May 22, 2025",
    "id": "e79"
  },
  {
    "from": "softbank",
    "to": "g42",
    "type": "partner",
    "label": "financial partner on Stargate UAE",
    "cite": "AItoolDiscovery · 2026",
    "id": "e80"
  },
  {
    "from": "mgx",
    "to": "openai",
    "type": "money",
    "label": "equity funder of Stargate LLC",
    "cite": "AItoolDiscovery · 2026",
    "id": "e81"
  },
  {
    "from": "mgx",
    "to": "databricks",
    "type": "money",
    "label": "participated in $10B round at $62B valuation",
    "cite": "Crunchbase News · 2026",
    "id": "e82"
  },
  {
    "from": "mgx",
    "to": "anthropic",
    "type": "money",
    "label": "participated in $30B round",
    "cite": "AGBI · Feb 2026",
    "id": "e83"
  },
  {
    "from": "scaleai",
    "to": "metamsl",
    "type": "partner",
    "label": "$14.3B deal installed Wang as MSL lead",
    "cite": "Reuters via Goldsea · 2025",
    "id": "e84"
  },
  {
    "from": "togetherai",
    "to": "humain",
    "type": "partner",
    "label": "250MW AI infrastructure facility planned",
    "cite": "Global Data Center Hub · Sep 7, 2026",
    "id": "e85"
  },
  {
    "from": "nvidia",
    "to": "hpe",
    "type": "supply",
    "label": "AI server platforms",
    "cite": "The Next Platform · Sep 8, 2026",
    "id": "e86"
  },
  {
    "from": "amd",
    "to": "hpe",
    "type": "supply",
    "label": "Helios rack-scale platforms",
    "cite": "Yahoo Finance · Sep 2026",
    "id": "e87"
  },
  {
    "from": "samsung",
    "to": "mistral",
    "type": "money",
    "label": "co-led €3B Series D at €21B valuation",
    "cite": "Bloomberg · Sep 8, 2026",
    "id": "e88"
  },
  {
    "from": "asml",
    "to": "mistral",
    "type": "money",
    "label": "led €1.7B Series C; largest individual shareholder",
    "cite": "Mistral AI / Eastern Herald · Sep 2025–2026",
    "id": "e89"
  },
  {
    "from": "humain",
    "to": "xai",
    "type": "partner",
    "label": "500MW Saudi data center; $3B Humain investment",
    "cite": "CNBC · Nov 20, 2025",
    "id": "e90"
  },
  {
    "from": "arm",
    "to": "metadc",
    "type": "supply",
    "label": "Neoverse-based CPUs for AI ranking & recommendation infrastructure",
    "cite": "TechCrunch / Arm Newsroom · Oct 15, 2025",
    "id": "e91"
  },
  {
    "from": "metadc",
    "to": "amd",
    "type": "partner",
    "label": "$60B/6GW Instinct MI450 GPU deal; warrant for up to 160M AMD shares",
    "cite": "AMD Newsroom / about.fb.com · Feb 24, 2026",
    "id": "e92"
  },
  {
    "from": "qualcomm",
    "to": "metadc",
    "type": "supply",
    "label": "Dragonfly C1000 multi-generation data-center CPU roadmap",
    "cite": "Qualcomm / CNBC · Jun 24, 2026",
    "id": "e93"
  }
];

export const columns: MapColumn[] = [
  {
    "label": "Frontier labs",
    "ids": [
      "openai",
      "anthropic",
      "deepmind",
      "microsoftai",
      "metamsl",
      "mistral",
      "deepseek",
      "xai",
      "scaleai"
    ]
  },
  {
    "label": "Cloud + compute",
    "ids": [
      "azure",
      "aws",
      "gcloud",
      "oracle",
      "metadc",
      "apple",
      "coreweave",
      "nebius",
      "humain",
      "chinacsp",
      "inference",
      "g42",
      "mgx",
      "databricks",
      "togetherai"
    ]
  },
  {
    "label": "Software + silicon",
    "ids": [
      "nvidia",
      "cuda",
      "broadcom",
      "amd",
      "rocm",
      "marvell",
      "trainium",
      "maia",
      "cerebras",
      "cambricon",
      "arm",
      "softbank",
      "groq",
      "qualcomm",
      "intel"
    ]
  },
  {
    "label": "Fab + interconnect",
    "ids": [
      "tsmc",
      "smic",
      "skhynix",
      "samsung",
      "micron",
      "asml",
      "packaging",
      "eda",
      "optics",
      "interconnect"
    ]
  },
  {
    "label": "Systems + sites",
    "ids": [
      "dell",
      "supermicro",
      "odms",
      "foxconn",
      "equinix",
      "vertiv",
      "applieddigital",
      "crusoe",
      "cisco",
      "hpe"
    ]
  },
  {
    "label": "Power + utilities",
    "ids": [
      "ge",
      "constellation",
      "vistra",
      "entergy",
      "talen",
      "nextera",
      "oklo",
      "terrapower"
    ]
  }
];

export const sources: Record<string, SourceRef> = {
  "reutersNvidiaAnthropic": {
    "label": "Reuters · Sep 11, 2026",
    "url": "https://www.reuters.com/legal/transactional/nvidia-talks-invest-anthropics-mega-ipo-sources-say-2026-09-11/"
  },
  "anthropicRound": {
    "label": "TechCrunch · May 28, 2026",
    "url": "https://techcrunch.com/2026/05/28/anthropic-raises-65-billion-nears-1t-valuation-ahead-of-ipo/"
  },
  "stargate": {
    "label": "OpenAI · Stargate announcement",
    "url": "https://openai.com/index/announcing-the-stargate-project/"
  },
  "awsAnthropic": {
    "label": "TechCrunch · Apr 20, 2026",
    "url": "https://techcrunch.com/2026/04/20/anthropic-takes-5b-from-amazon-and-pledges-100b-in-cloud-spending-in-return/"
  },
  "hyperscaler": {
    "label": "TrendForce · May 6, 2026",
    "url": "https://www.trendforce.com/presscenter/news/20260506-13033.html"
  },
  "nvidiaWalkback": {
    "label": "PYMNTS · Feb 1, 2026",
    "url": "https://www.pymnts.com/artificial-intelligence-2/2026/nvidia-ceo-says-firm-never-committed-to-100-billion-openai-investment/"
  },
  "tsmc": {
    "label": "MacRumors/CNBC · Jan 28, 2026",
    "url": "https://www.macrumors.com/2026/01/28/nvidia-replaces-apple-as-biggest-tsmc-customer/"
  },
  "sk": {
    "label": "Reuters · Jul 24, 2026",
    "url": "https://www.reuters.com/business/media-telecom/nvidia-sk-group-unveil-500-billion-plus-ai-data-centers-initiative-memory-2026-07-24/"
  },
  "hbm": {
    "label": "TrendForce · Mar 9, 2026",
    "url": "https://www.trendforce.com/news/2026/03/09/news-samsung-sk%E2%80%AFhynix-reportedly-tapped-as-nvidia-rubin-hbm4-suppliers-shipments-could-start-in-march/"
  },
  "broadcom": {
    "label": "TrendForce · Mar 5, 2026",
    "url": "https://www.trendforce.com/news/2026/03/05/news-broadcom-reportedly-eyes-100b-ai-chip-revenue-in-2027-backed-by-six-key-clients-including-google-meta/"
  },
  "metaPower": {
    "label": "POWER · Jan 2026",
    "url": "https://www.powermag.com/meta-locks-in-up-to-6-6-gw-of-nuclear-power-through-deals-with-vistra-oklo-and-terrapower/"
  },
  "asml": {
    "label": "Reuters · Sep 14, 2026",
    "url": "https://www.reuters.com/world/asia-pacific/asml-extends-chipmaking-dominance-customers-embrace-high-na-2026-09-14/"
  },
  "nebius": {
    "label": "Reuters · Mar 23, 2026",
    "url": "https://www.reuters.com/technology/nebius-says-well-funded-ai-race-after-closing-43-billion-debt-raise-2026-03-23/"
  },
  "constellation": {
    "label": "Reuters · Sep 20, 2024",
    "url": "https://www.reuters.com/markets/deals/constellation-inks-power-supply-deal-with-microsoft-2024-09-20/"
  },
  "servers": {
    "label": "Data Center Knowledge · Sep 11, 2026",
    "url": "https://www.datacenterknowledge.com/servers/ai-server-market-update-vendors-shift-from-silicon-to-services"
  },
  "networking": {
    "label": "SDxCentral · 2026",
    "url": "https://www.sdxcentral.com/news/nvidia-tops-ethernet-data-center-switch-charts-by-revenue-as-sales-soar/"
  },
  "smic": {
    "label": "TrendForce · Sep 9, 2026",
    "url": "https://www.trendforce.com/presscenter/news/20260909-13225.html"
  },
  "apple": {
    "label": "MacRumors · Jun 8, 2026",
    "url": "https://www.macrumors.com/2026/06/08/apple-private-cloud-compute-google/"
  },
  "microsoft": {
    "label": "Microsoft FY2026 10-K · cross-validated",
    "url": "https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm"
  },
  "metaMSL": {
    "label": "Reuters via Goldsea · Apr 8, 2026",
    "url": "http://goldsea.com/article_details/alexander-wangs-meta-superintelligence-lab-releases-first-ai-model"
  },
  "mistral": {
    "label": "Reuters · Sep 8, 2026",
    "url": "https://www.reuters.com/commentary/breakingviews/french-ai-minnow-bags-surprisingly-high-valuation-2026-09-08/"
  },
  "huggingface": {
    "label": "TechCrunch · Sep 3, 2026",
    "url": "https://techcrunch.com/2026/09/03/nvidia-confirms-it-will-buy-hugging-face-for-12-9-billion/"
  },
  "openaiRound": {
    "label": "OpenAI / PYMNTS · Mar 31, 2026",
    "url": "https://openai.com/index/accelerating-the-next-phase-ai/"
  },
  "spacex": {
    "label": "Reuters · Jun 11–15, 2026",
    "url": "https://www.reuters.com/world/musks-spacex-prices-record-75-billion-ipo-135-share-2026-06-11/"
  },
  "rocm": {
    "label": "EE Times · Mar 30, 2026",
    "url": "https://www.eetimes.com/taking-on-cuda-with-rocm-one-step-after-another/"
  },
  "cerebras": {
    "label": "TechCrunch · May 14, 2026",
    "url": "https://techcrunch.com/2026/05/14/cerebras-raises-5-5b-kicking-off-2026s-ipo-season-with-a-bang/"
  },
  "cambricon": {
    "label": "Morningstar · Jul 1, 2026",
    "url": null
  },
  "packaging": {
    "label": "EE Times · Feb 6, 2026",
    "url": "https://www.eetimes.com/chip-assembler-ase-sees-advanced-packaging-sales-doubling/"
  },
  "eda": {
    "label": "Reuters / Synopsys · 2025–26",
    "url": "https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys"
  },
  "optics": {
    "label": "TrendForce/LEDinside · Feb 11, 2026",
    "url": "https://www.ledinside.com/intelligence/2026/2/2026_02_11_09"
  },
  "interconnect": {
    "label": "Credo / Astera Labs · 2026 earnings reports",
    "url": "https://investors.credosemi.com/news-events/news/news-details/2026/Credo-Technology-Group-Holding-Ltd-Reports-Fourth-Quarter-and-Fiscal-Year-2026-Financial-Results/default.aspx"
  },
  "odm": {
    "label": "Reuters / 2026 company reporting",
    "url": "https://www.reuters.com/world/asia-pacific/nvidia-supplier-wistron-launches-700-million-texas-factory-ai-system-production-2026-07-22/"
  },
  "vertiv": {
    "label": "Zacks · Jul 22, 2026",
    "url": "https://www.zacks.com/stock/news/2958512/vertivs-ai-data-center-footprint-grows-a-sign-for-more-upside"
  },
  "dc": {
    "label": "Reuters · 2026",
    "url": "https://www.reuters.com/technology/applied-digital-signs-52-billion-ai-data-center-lease-with-us-hyperscaler-2026-06-08/"
  },
  "utility": {
    "label": "POWER · 2025",
    "url": "https://www.powermag.com/talen-amazon-launch-18b-nuclear-ppa-a-grid-connected-ipp-model-for-the-data-center-era/"
  },
  "humain": {
    "label": "Data Center Dynamics · Sep 11, 2026",
    "url": null
  },
  "inference": {
    "label": "Reuters / TechCrunch · Jul 2026",
    "url": "https://www.reuters.com/technology/nvidia-backed-startup-fireworks-valued-175-billion-latest-funding-2026-07-16/"
  },
  "marvell": {
    "label": "Marvell · Jun 1, 2026",
    "url": "https://www.businesswire.com/news/home/20260601564526/en/Marvell-Announces-Availability-of-Industrys-First-102.4-Tbps-Switch-Purpose-Built-for-AI-and-Cloud-Data-Center-Infrastructure"
  },
  "dell": {
    "label": "Dell · Sep 1, 2026",
    "url": "https://www.businesswire.com/news/home/20260901574850/en/Dell-Technologies-Delivers-Second-Quarter-Fiscal-2027-Financial-Results"
  },
  "ge": {
    "label": "GE Vernova · Jul 22, 2026",
    "url": "https://gevernova.com/news/press-releases/ge-vernova-reports-second-quarter-2026-financial-results-raises-2026-financial"
  },
  "arm": {
    "label": "mlq.ai · Mar 24, 2026",
    "url": "https://mlq.ai/research/arm-agi-cpu/"
  },
  "groq": {
    "label": "CNBC · Dec 24, 2025",
    "url": "https://www.cnbc.com/2025/12/24/nvidia-buying-ai-chip-startup-groq-for-about-20-billion-biggest-deal.html"
  },
  "qualcomm": {
    "label": "Global Data Center Hub · Sep 7, 2026",
    "url": "https://www.globaldatacenterhub.com/p/saudi-arabias-leap-2026-15-billion"
  },
  "intel": {
    "label": "Simply Wall St · Jun 2026",
    "url": "https://simplywall.st/stocks/us/tech/nasdaq-smci/super-micro-computer/news/why-super-micro-computer-smci-is-up-352-after-new-ai-rack-sc"
  },
  "cisco": {
    "label": "Yahoo Finance · Sep 3, 2026",
    "url": "https://finance.yahoo.com/technology/ai/articles/super-micro-computer-smci-joins-002225556.html"
  },
  "g42": {
    "label": "Tech Times · Jul 16, 2026",
    "url": "https://www.techtimes.com/articles/320682/20260716/uae-gets-license-free-nvidia-ai-chips-congress-probes-trump-crypto-conflict.htm"
  },
  "mgx": {
    "label": "Crunchbase News · 2026",
    "url": "https://news.crunchbase.com/ai/mgx-role-grows-stargate-openai-g42-tiktok/"
  },
  "hpe": {
    "label": "The Motley Fool · Sep 12, 2026",
    "url": "https://www.fool.com/investing/2026/09/12/hpe-billion-ai-backlog-waiting-memory-supply/"
  }
};

export const nodeById: Record<string, MapNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
