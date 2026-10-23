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
    "layer": "Cloud & compute",
    "sub": "GroqCloud · LPU neocloud",
    "desc": "Inference-chip maker whose low-latency LPU architecture now underlies Nvidia's fastest inference racks, while GroqCloud continues operating as a nominally independent business.",
    "fact": "Nvidia's Dec 24, 2025 non-exclusive LPU license-and-acquihire (~$20B reported; $17B license + ~$3B in staff awards) moved Groq's chip team — incl. founder Jonathan Ross — to Nvidia, where Groq 3 LPU racks reached production in Aug 2026; the remaining Groq, led by CEO Simon Edwards, operates GroqCloud as an independent neocloud at a ~$3.5B valuation, while the deal faces a DOJ inquiry and an Oct 2026 Delaware suit alleging it was a sale requiring a stockholder vote.",
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
    "fact": "Targets roughly $100B in AUM; participated in a $30B Anthropic round (Feb 2026) and Databricks' $10B round (Dec 2024, then a $62B valuation; $190B by Aug 2026).",
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
    "fact": "Closed a $5B strategic round at a $190B valuation in August 2026 (Coatue-led; Blackstone and MGX among participants) after crossing a $7B revenue run-rate growing >80% y/y; no S-1 filed as of Oct 2026, with the CEO publicly pointing to 2027 or later.",
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
  },
  {
    "id": "wdc",
    "name": "Western Digital",
    "layer": "Fabrication & links",
    "sub": "HDD + NAND · capacity sold out",
    "desc": "HDD and NAND flash maker supplying exabyte-scale nearline capacity for AI training-data and checkpoint storage.",
    "fact": "CEO said 2026 capacity is fully booked with long-term deals into 2027–2028 already signed; fiscal Q2 2026 revenue hit $3.02B, up 25% YoY.",
    "src": "storage"
  },
  {
    "id": "sandisk",
    "name": "SanDisk",
    "layer": "Fabrication & links",
    "sub": "NAND flash · spun off 2024",
    "desc": "NAND flash pure-play spun off from Western Digital in 2024, now a direct read on AI-driven flash-storage demand.",
    "fact": "Shares more than tripled from the start of 2026 as AI buyers absorbed available NAND supply and flash pricing power improved.",
    "src": "sandisk"
  },
  {
    "id": "seagate",
    "name": "Seagate",
    "layer": "Fabrication & links",
    "sub": "HDD · exabyte shipments",
    "desc": "Hard-disk maker supplying high-capacity nearline drives for AI datasets and cold storage alongside Western Digital.",
    "fact": "Industry-wide HDD exabyte shipments topped 450EB by late 2025 and stayed elevated through 2026, with Seagate and Western Digital at the center of the buildout.",
    "src": "storage"
  },
  {
    "id": "appliedmaterials",
    "name": "Applied Materials",
    "layer": "Fabrication & links",
    "sub": "Wafer fab equipment",
    "desc": "Largest supplier of semiconductor wafer-fabrication equipment, benefiting broadly from AI-driven capex across TSMC, Samsung and Micron.",
    "fact": "Q2 FY2026 revenue reached $7.91B; shares were up roughly 98% YTD as of mid-August 2026 on AI-capex-driven wafer-fab-equipment demand.",
    "src": "waferequip"
  },
  {
    "id": "lamresearch",
    "name": "Lam Research",
    "layer": "Fabrication & links",
    "sub": "Etch & deposition tools",
    "desc": "Etch and deposition equipment maker critical to advanced-node and HBM production, riding the same AI capex wave as Applied Materials and KLA.",
    "fact": "Q3 FY2026 revenue rose 23.8% YoY to $5.84B; shares were up roughly 89% YTD.",
    "src": "waferequip"
  },
  {
    "id": "kla",
    "name": "KLA Corp",
    "layer": "Fabrication & links",
    "sub": "Process control",
    "desc": "Process-control and inspection equipment maker; a yield bottleneck supplier as fabs push ever-more-complex AI chips.",
    "fact": "Q3 FY2026 revenue rose 11.5% YoY to $3.42B; industry-wide wafer-fab-equipment spending was projected at $145–150B for 2026.",
    "src": "waferequip"
  },
  {
    "id": "arista",
    "name": "Arista Networks",
    "layer": "Systems & sites",
    "sub": "AI cluster networking",
    "desc": "Data-center Ethernet switch leader wiring GPU training clusters for hyperscalers; passed Cisco as the top data-center switch vendor in 2024.",
    "fact": "Q1 2026 revenue reached $2.71B, up 35% YoY; raised its full-year AI-networking sales target to $3.5B — roughly double the prior year — with Microsoft and Meta each over 10% of revenue.",
    "src": "arista"
  },
  {
    "id": "huawei",
    "name": "Huawei / HiSilicon",
    "layer": "Software & silicon",
    "sub": "Ascend · ~50% China AI chip share",
    "desc": "Huawei's HiSilicon Ascend line became the default AI accelerator in China after Nvidia's China share collapsed under export controls; the Ascend 950PR entered mass production in March 2026 on SMIC's N+3 (5nm-class) node.",
    "fact": "Huawei projects AI chip revenue up roughly 60% to about $12B in 2026, with Ascend holding an estimated 50-60% of China's AI accelerator market versus Nvidia's near-zero share.",
    "src": "huaweiAscend"
  },
  {
    "id": "bloomenergy",
    "name": "Bloom Energy",
    "layer": "Power & utilities",
    "sub": "Fuel cells · Oracle, AEP, CoreWeave",
    "desc": "Solid-oxide fuel cell maker supplying on-site power that bypasses grid interconnection queues for AI data centers; CoreWeave was its first AI-sector customer, and Oracle and AEP are now anchor buyers.",
    "fact": "Oracle's master services agreement covers up to 2.8GW of Bloom SOFC systems (expanded Apr 2026); Brookfield's project-financing partnership with Bloom scaled to $25B.",
    "src": "bloomOracle"
  },
  {
    "id": "iren",
    "name": "IREN",
    "layer": "Cloud & compute",
    "sub": "Neocloud · ex-bitcoin miner",
    "desc": "Public neocloud that converted bitcoin-mining infrastructure into GPU cloud capacity; signed a five-year, roughly $9.7B GPU cloud services agreement with Microsoft in 2026.",
    "fact": "Nvidia holds a five-year right to invest up to about $2.1B in IREN via warrants (30M shares at $70) tied to a separate $3.4B GPU cloud services deal.",
    "src": "irenMicrosoft"
  },
  {
    "id": "aep",
    "name": "American Electric Power",
    "layer": "Power & utilities",
    "sub": "Utility · Bloom Energy counterparty",
    "desc": "One of the largest US electric utilities, facing data-center-driven load growth across its territory; signed a landmark fuel-cell offtake agreement with Bloom Energy in January 2026.",
    "fact": "AEP's 20-year offtake agreement with Bloom Energy covers up to 1GW of fuel cells for a total contract value of about $2.65B, backing a planned 900MW Wyoming facility.",
    "src": "bloomAEP"
  },
  {
    "id": "lambdaai",
    "name": "Lambda",
    "layer": "Cloud & compute",
    "sub": "Nvidia-backed neocloud",
    "desc": "GPU cloud provider renting Nvidia accelerators to AI labs and enterprises, competing with hyperscalers on price and specialist neoclouds on availability; backed by Nvidia, ARK Invest and Andrej Karpathy among others.",
    "fact": "In talks as of August 2026 to raise up to $3B in a pre-IPO round at a valuation of $12B or more, after separately borrowing about $917M ring-fenced for GPU purchases.",
    "src": "lambdaFunding"
  },
  {
    "id": "nscale",
    "name": "Nscale",
    "layer": "Cloud & compute",
    "sub": "UK neocloud · filed for NYSE IPO",
    "desc": "UK-based neocloud that converted from crypto-mining infrastructure to GPU hosting; Nvidia is a preferred shareholder and guarantees a large share of its data-center lease obligations, and Microsoft is its anchor tenant.",
    "fact": "Nvidia bought $60M of Nscale warrants and guaranteed up to $860.3M of Nscale's lease obligations for a 240MW Ward County, Texas data center; Nscale filed for a US IPO in Sep 2026 targeting up to a $35B valuation.",
    "src": "nscaleNvidia"
  },
  {
    "id": "ciphermining",
    "name": "Cipher Mining",
    "layer": "Systems & sites",
    "sub": "CIFR · bitcoin miner turned GPU host",
    "desc": "Former bitcoin miner converting sites to GPU hosting for AI workloads; Google is guaranteeing a large share of its 10-year hosting contract with AI cloud startup Fluidstack.",
    "fact": "Google agreed to guarantee $1.4B of Fluidstack's $3B, 10-year lease with Cipher covering 168MW at its Barber Lake, Texas site, in exchange for warrants on roughly 5.4% of Cipher's equity.",
    "src": "cipherGoogle"
  },
  {
    "id": "perplexity",
    "name": "Perplexity AI",
    "layer": "Frontier labs",
    "sub": "AI search & agents",
    "desc": "AI-native search and agent company (Perplexity Computer) backed by Nvidia, Jeff Bezos and SoftBank Vision Fund 2; committed to running AI agent workloads on Nvidia's Vera CPUs.",
    "fact": "Annualized revenue rose to over $750M by August 2026 from about $232M at the end of 2025; Nvidia was reportedly in talks to invest at a valuation above $30B.",
    "src": "perplexityNvidia"
  },
  {
    "id": "ssi",
    "name": "Safe Superintelligence",
    "layer": "Frontier labs",
    "sub": "Ilya Sutskever · pre-product",
    "desc": "Frontier AI lab founded by ex-OpenAI chief scientist Ilya Sutskever, focused solely on safe superintelligence research with no shipped product; Nvidia is both an investor and a compute partner via the Vera Rubin platform.",
    "fact": "Raised $5B in July 2026 (on top of $1B in 2024 and $2B in 2025, ~$8B total) from Nvidia, Greenoaks, a16z, Sequoia, DST Global and Alphabet; last disclosed valuation was $32B.",
    "src": "ssiSource"
  },
  {
    "id": "thinkingmachines",
    "name": "Thinking Machines Lab",
    "layer": "Frontier labs",
    "sub": "Mira Murati · ex-OpenAI CTO",
    "desc": "Frontier AI lab founded by former OpenAI CTO Mira Murati, staffed heavily with former OpenAI researchers.",
    "fact": "Closed a $2B seed in July 2025 followed by a $5B Series B at a $50B valuation in March 2026.",
    "src": "tmlSource"
  },
  {
    "id": "moonshotai",
    "name": "Moonshot AI",
    "layer": "Frontier labs",
    "sub": "Kimi · China",
    "desc": "Chinese frontier lab behind the Kimi model family, competing with DeepSeek, Alibaba's Qwen and ByteDance's Doubao; became China's best-funded LLM startup in 2026.",
    "fact": "Closed a $2B round at a $20B valuation in May 2026 (led by Meituan's Long-Z Investments) and was in talks to raise further at up to a $50B pre-money valuation ahead of a possible IPO.",
    "src": "moonshotSource"
  },
  {
    "id": "zhipuai",
    "name": "Zhipu AI (Z.ai)",
    "layer": "Frontier labs",
    "sub": "2513.HK · first Chinese AI IPO",
    "desc": "Chinese frontier lab behind the GLM model family; became the first major Chinese generative-AI startup to go public, listing on the Hong Kong Stock Exchange in January 2026.",
    "fact": "IPO raised about $558M on Jan 8, 2026, opening at HK$120/share with an initial market cap of roughly HK$52.8B (~$6.8B).",
    "src": "zhipuSource"
  },
  {
    "id": "tokyoelectron",
    "name": "Tokyo Electron",
    "layer": "Fabrication & links",
    "sub": "8035.T · wafer fab equipment",
    "desc": "Japanese semiconductor equipment maker alongside Applied Materials, Lam Research and KLA in the tools layer beneath the foundries; its top five customers (TSMC, Samsung, Intel, SK hynix, Micron) are all expanding capacity for AI chips.",
    "fact": "Equipment for advanced chips rose to nearly 40% of fiscal 2026 sales; first-half FY2027 guidance of ¥1.57T implies about 33% YoY growth on AI-driven demand.",
    "src": "tokyoElectronAI"
  },
  {
    "id": "coherentcorp",
    "name": "Coherent Corp",
    "layer": "Fabrication & links",
    "sub": "COHR · optical transceivers",
    "desc": "US optical-components maker supplying transceivers and silicon photonics for AI data-center networking, distinct from Chinese suppliers Innolight/Eoptolink already in this map; a recipient of part of Nvidia's optics investment program.",
    "fact": "Nvidia split a $4B optics commitment evenly between Coherent and Lumentum ($2B each), including equity stakes and multibillion-dollar purchase commitments for laser components.",
    "src": "coherentNvidia"
  },
  {
    "id": "lenovo",
    "name": "Lenovo",
    "layer": "Systems & sites",
    "sub": "0992.HK · global AI server ODM",
    "desc": "Global PC maker turned major AI-server ODM through its Infrastructure Solutions Group, building Nvidia GPU-based systems for hyperscale and enterprise customers.",
    "fact": "Q1 FY2027 revenue hit a record $26.94B, up 43% YoY; Infrastructure Solutions Group revenue rose 98% YoY to $8.5B and the AI server pipeline reached $54B.",
    "src": "lenovoAI"
  },
  {
    "id": "apollo",
    "name": "Apollo Global Management",
    "layer": "Cloud & compute",
    "sub": "Alternative asset manager · credit",
    "desc": "Alternative asset manager emerging as one of the most active arrangers of AI-infrastructure debt, in reported talks to finance OpenAI's custom chips (via Broadcom), Oracle's Nvidia chip purchase, and SpaceX's ~$40B raise.",
    "fact": "Expected to lead SpaceX's ~$40B chip financing for Nvidia chips, with a close eyed in 2027; also in talks on the $50B+ OpenAI package and Oracle's chip purchase.",
    "src": "wsjChipFinancing"
  },
  {
    "id": "blackstone",
    "name": "Blackstone",
    "layer": "Cloud & compute",
    "sub": "Alternative asset manager · credit",
    "desc": "The world's largest alternative asset manager, approached as a lender across the reported AI-chip financing wave.",
    "fact": "Committed ~$9B to the $18B junior tranche of the reported $60B Broadcom–Anthropic chip-financing package; also approached on Broadcom's $50B+ OpenAI chip financing.",
    "src": "anthropicFinancingFT"
  },
  {
    "id": "pimco",
    "name": "PIMCO",
    "layer": "Cloud & compute",
    "sub": "Bond manager · credit",
    "desc": "Major bond manager in reported talks to help finance SpaceX's Nvidia chip purchase.",
    "fact": "In talks to join the lender group for SpaceX's ~$40B Nvidia chip financing, alongside Apollo.",
    "src": "ftSpaceX40B"
  },
  {
    "id": "goldmansachs",
    "name": "Goldman Sachs",
    "layer": "Cloud & compute",
    "sub": "Investment bank · financing",
    "desc": "Investment bank in reported talks with Apollo on arranging financing for Oracle's large Nvidia chip purchase.",
    "fact": "In talks with Apollo to arrange money for Oracle's Nvidia chip purchase, per WSJ reporting on the Oct 2026 financing wave.",
    "src": "wsjChipFinancing"
  },
  {
    "id": "amphenol",
    "name": "Amphenol",
    "layer": "Fabrication & links",
    "sub": "APH · connectors & interconnect",
    "desc": "Connector and interconnect giant whose IT datacom business has become one of the purest large-cap reads on AI server buildouts; closed a ~$10.5B acquisition of CommScope's connectivity business in January 2026.",
    "fact": "Q2 2026 revenue rose 55% y/y to $8.76B; IT datacom reached 43% of sales, up 89% y/y, with management attributing virtually all sequential growth to AI-related products.",
    "src": "amphenolAI"
  },
  {
    "id": "monolithicpower",
    "name": "Monolithic Power Systems",
    "layer": "Fabrication & links",
    "sub": "MPWR · board power delivery",
    "desc": "Power-management chip maker supplying the voltage-regulation layer on AI accelerator boards — the power-semiconductor presence the map previously lacked entirely.",
    "fact": "Enterprise Data was 38.8% of Q2 2026 revenue ($380.6M, +164% y/y); KeyBanc estimates a ~70% share of Nvidia Vera Rubin power sockets, and Reuters reports dominant Nvidia/AMD power share.",
    "src": "monolithicAI"
  },
  {
    "id": "ttmtech",
    "name": "TTM Technologies",
    "layer": "Fabrication & links",
    "sub": "TTMI · high-layer-count PCBs",
    "desc": "US maker of high-layer-count printed circuit boards, RF components and mission systems for AI servers and networking gear — the board layer beneath every accelerator rack.",
    "fact": "Data Center Computing & Networking reached 40% of net sales in Q2 2026, up 91% y/y with a 1.49 book-to-bill; in October 2026 it added a $400M AI-PCB expansion in China and Penang, taking announced 2025–29 capex to ~$1.6B.",
    "src": "ttmiAI"
  },
  {
    "id": "teradyne",
    "name": "Teradyne",
    "layer": "Fabrication & links",
    "sub": "TER · semiconductor test equipment",
    "desc": "Largest US maker of automated test equipment for SoCs and memory — the test layer every AI chip must pass through before shipment, previously absent from the map.",
    "fact": "Q2 2026 revenue rose 104% y/y to $1.33B, with Semi Test up 128% (84% of sales), SoC compute test up ~600% y/y and record HBM/DRAM memory-test revenue of $212M; management says over 60% of revenue is AI-driven.",
    "src": "teradyneAI"
  },
  {
    "id": "advantest",
    "name": "Advantest",
    "layer": "Fabrication & links",
    "sub": "6857.T · semiconductor test equipment",
    "desc": "Japanese test-equipment leader with roughly two-thirds global share of SoC testers; the foreign-major counterpart to Teradyne in the test layer.",
    "fact": "Holds ~65% global tester share (66% in SoC test); its fiscal-year plan calls for ¥1.714T (~$11B) of revenue, up 51%, on AI-chip test demand.",
    "src": "advantestAI"
  },
  {
    "id": "entegris",
    "name": "Entegris",
    "layer": "Fabrication & links",
    "sub": "ENTG · semiconductor materials",
    "desc": "Largest US semiconductor-materials name — filtration, specialty chemicals and advanced materials for leading-edge logic, HBM and packaging; the first representative of the materials layer in the map.",
    "fact": "Q2 2026 revenue rose 11% y/y to $883M with EPS up 41%; management attributes growth to AI-driven demand across advanced logic, HBM and advanced packaging, with ~75% of sales tracking wafer starts.",
    "src": "entegrisAI"
  },
  {
    "id": "ibiden",
    "name": "Ibiden",
    "layer": "Fabrication & links",
    "sub": "4062.T · ABF package substrates",
    "desc": "Japanese substrate maker holding an estimated 70–80% share of the ABF package substrates beneath AI-server chips — a genuine chokepoint layer sitting under every accelerator.",
    "fact": "Plans ¥500B of capex across FY2026–28, the largest substrate expansion on record; BofA estimates the ABF supply gap widens to ~19–21% by 2027–28.",
    "src": "ibidenAI"
  },
  {
    "id": "fabrinet",
    "name": "Fabrinet",
    "layer": "Fabrication & links",
    "sub": "FN · optical contract manufacturing",
    "desc": "Dominant contract manufacturer behind the optical-module brands — it assembles 1.6T transceivers and silicon-photonics products for hyperscalers while the module names take the design credit.",
    "fact": "FY2026 revenue rose 36% to $4.64B, with optical communications over 75% of sales.",
    "src": "fabrinetAI"
  },
  {
    "id": "corning",
    "name": "Corning",
    "layer": "Fabrication & links",
    "sub": "GLW · optical fiber & connectivity",
    "desc": "Glass and fiber giant whose optical fiber has become a named input to AI data-center builds, with direct supply partnerships at Nvidia, Meta and Amazon.",
    "fact": "The Nvidia partnership announced May 6, 2026 targets 10× optical-connectivity capacity and +50% fiber output across three new US plants; Meta signed a $6B multiyear deal in January 2026 and Amazon a multiyear multibillion deal in Q2 2026, when Optical Communications revenue rose 32% to $2.07B.",
    "src": "corningAI"
  },
  {
    "id": "kioxia",
    "name": "Kioxia",
    "layer": "Fabrication & links",
    "sub": "285A.T · NAND flash",
    "desc": "Japanese NAND maker (the former Toshiba Memory) and top-five global supplier — the one major memory maker previously missing from the map; runs its flash joint venture with SanDisk.",
    "fact": "FY2026 revenue rose 37% y/y to ¥2.34T (~$15.5B); Q1 FY2027 revenue jumped 415% y/y on AI enterprise-SSD demand.",
    "src": "kioxiaAI"
  },
  {
    "id": "celestica",
    "name": "Celestica",
    "layer": "Systems & sites",
    "sub": "CLS · contract systems builder",
    "desc": "Contract manufacturer that has become the primary builder of Google's TPU systems and a manufacturing partner for AMD's Helios racks; cloud and hyperscaler work is 81% of revenue.",
    "fact": "FY2026 revenue forecast raised to $20.5B (+65% y/y) with a ~$34B framework for 2027; rack deliveries for the Broadcom/OpenAI program are expected in late 2026.",
    "src": "celesticaAI"
  },
  {
    "id": "jabil",
    "name": "Jabil",
    "layer": "Systems & sites",
    "sub": "JBL · contract builder / EMS",
    "desc": "Contract manufacturing giant building servers, racks, liquid cooling, power and networking gear for three hyperscalers — carrying one of the largest disclosed AI revenue lines in the chain.",
    "fact": "Guided FY2026 AI-related revenue to $13.6B, up ~50% from $9B in FY2025, on ~$35B of total revenue — its AI line alone is roughly 3× TTM Technologies' total revenue.",
    "src": "jabilAI"
  },
  {
    "id": "eaton",
    "name": "Eaton",
    "layer": "Systems & sites",
    "sub": "ETN · data-center electrical equipment",
    "desc": "Power-management major supplying switchgear, UPS and distribution into data centers — Vertiv's larger electrical peer, and a direct read on the lead-time bottleneck gating AI capacity.",
    "fact": "Q2 2026 revenue was a record $8.5B (+21% y/y); Electrical Americas data-center revenue grew ~65% y/y with data-center orders up ~240% on a rolling basis, and switchgear lead times run 52–104 weeks.",
    "src": "eatonAI"
  },
  {
    "id": "schneider",
    "name": "Schneider Electric",
    "layer": "Systems & sites",
    "sub": "SU.PA · data-center electrical equipment",
    "desc": "French power-equipment major — arguably the world's #1 data-center electrical vendor — spanning switchgear, UPS and cooling for AI halls.",
    "fact": "Q3 2026 revenue hit a record €11.46B (+16.9% organic); data-center orders grew triple-digit and are now ~30% of total orders, prompting two FY2026 guidance raises.",
    "src": "schneiderAI"
  },
  {
    "id": "modine",
    "name": "Modine",
    "layer": "Systems & sites",
    "sub": "MOD · data-center cooling",
    "desc": "Thermal-management maker pivoting into a data-center cooling pure play, supplying chillers and cooling distribution for AI halls; spinning off its non-data-center business.",
    "fact": "Data-center revenue reached $1.1B in FY2026 (+73% y/y, ~41% of sales), backed by a >$4B long-term supply agreement covering 2027–2029; data-center revenue is guided above $2B by FY2028.",
    "src": "modineAI"
  },
  {
    "id": "corescientific",
    "name": "Core Scientific",
    "layer": "Systems & sites",
    "sub": "CORZ · neocloud hosting",
    "desc": "Former bitcoin miner turned hosting landlord — CoreWeave's largest hosting counterparty, ranked #3 among neoclouds by live power, ahead of tracked Applied Digital.",
    "fact": "~590 MW is contracted to CoreWeave across six sites, worth ~$10.2B of projected 12-year revenue; colocation became its largest segment in Q1 2026, with a further ~530 MW leased to AMD from 2027.",
    "src": "corescientificAI"
  },
  {
    "id": "blueowl",
    "name": "Blue Owl Capital",
    "layer": "Cloud & compute",
    "sub": "OWL · equity sponsor · data-center JV owner",
    "desc": "Alternative asset manager on the equity side of AI infrastructure — the owner, not the lender: it holds the majority equity in Meta's Hyperion data-center JV and was an early Crusoe backer.",
    "fact": "Blue Owl owns 80% of the Meta Hyperion JV (~$27–29B phase-1 development, scaling toward 5 GW / >$50B per Meta); the JV's $27.3B debt package was led by PIMCO — the map previously had the lender, not the owner.",
    "src": "blueowlAI"
  },
  {
    "id": "teconnectivity",
    "name": "TE Connectivity",
    "layer": "Fabrication & links",
    "sub": "TEL · connectors & interconnect",
    "desc": "Connector and sensor major that is Amphenol's direct peer in AI datacom, supplying the high-speed interconnect inside AI server racks.",
    "fact": "AI/cloud revenue is on track to exceed its $3B target ahead of schedule (~17% of $17.3B FY2025 sales; $19.3B TTM); Digital Data Networks grew 34% y/y in Q3 FY2026 and AI datacom orders are up ~70% YTD.",
    "src": "teconnectivityAI"
  },
  {
    "id": "sanmina",
    "name": "Sanmina",
    "layer": "Systems & sites",
    "sub": "SANM · contract builder / EMS",
    "desc": "Contract manufacturer whose October 2025 acquisition of ZT Systems made it a third North American rack-scale builder for hyperscalers, alongside Celestica and Jabil.",
    "fact": "ZT Systems is guided to contribute $5–6B of FY2026 revenue within $13.7–14.3B total (~40% — AI rack-scale manufacturing for hyperscalers and the AMD/OpenAI ecosystem); its Cloud & AI segment grew ~280% y/y in Q2 FY2026.",
    "src": "sanminaAI"
  },
  {
    "id": "gigabyte",
    "name": "Gigabyte",
    "layer": "Systems & sites",
    "sub": "2376.TW · AI server OEM",
    "desc": "Taiwanese server and motherboard maker whose AI-server business now exceeds several tracked OEMs in scale.",
    "fact": "Servers are 71.5% of sales and ~90% of those are AI servers; FY2025 revenue was ~$10.5B and Q1 2026 AI-server sales grew 110% y/y.",
    "src": "gigabyteAI"
  },
  {
    "id": "shinetsu",
    "name": "Shin-Etsu Chemical",
    "layer": "Fabrication & links",
    "sub": "4063.T · silicon wafers & materials",
    "desc": "World's largest silicon-wafer maker (>30% share) and a leading supplier of photoresist and mask blanks — the materials layer's largest omission after Entegris and Ibiden.",
    "fact": "Total revenue is ~$17.1B; Electronics Materials (~¥1,016B, ~$6.6B) alone exceeds TTM Technologies' total revenue, at 39% of sales and 52% of operating income, growing on strong AI demand for 300mm wafers.",
    "src": "shinetsuAI"
  },
  {
    "id": "unimicron",
    "name": "Unimicron",
    "layer": "Fabrication & links",
    "sub": "3037.TW · ABF package substrates",
    "desc": "Taiwanese substrate maker and the #2 ABF supplier (~20% of global capacity) — one of only two sources for the most advanced AI-accelerator substrates, alongside Ibiden.",
    "fact": "FY2025 revenue was $4.21B ($4.8B TTM); ABF substrates reached 52% of Q2 2026 revenue, backed by NT$34B of 2026 capex aimed largely at ABF capacity.",
    "src": "unimicronAI"
  },
  {
    "id": "siemensenergy",
    "name": "Siemens Energy",
    "layer": "Power & utilities",
    "sub": "ENR.DE · grid technology & turbines",
    "desc": "German energy major spanning grid technology and gas turbines — a GE Vernova-scale peer whose data-center order book has become a direct read on the AI power buildout.",
    "fact": "It booked ~€2B of data-center orders in H1 FY2026 alone (nearly all of FY2025's total), hyperscaler revenue above €2B in Q1 FY2026 doubled y/y, and 5 GW of data-center orders landed in Q2; Grid Technologies growth is guided at +25–27%.",
    "src": "siemensenergyAI"
  },
  {
    "id": "deltaelectronics",
    "name": "Delta Electronics",
    "layer": "Systems & sites",
    "sub": "2308.TW · DC power & liquid cooling",
    "desc": "Taiwanese power and thermal giant — Nvidia's 800VDC rack-power and CDU partner — supplying server power and liquid cooling at a scale exceeding several tracked names.",
    "fact": "2025 revenue was ~$17.9B (+32% y/y); AI server power is >20% of revenue (>$3.6B) and AI liquid cooling ~9% (~$1.6B), a combined AI/data-center share of ~29%.",
    "src": "deltaAI"
  },
  {
    "id": "trane",
    "name": "Trane Technologies",
    "layer": "Systems & sites",
    "sub": "TT · data-center cooling",
    "desc": "HVAC major whose chillers have become core AI-hall infrastructure; it has been buying into liquid cooling (LiquidStack, Stellar Energy).",
    "fact": "Total revenue is $21.3B; data centers are an estimated ~10% of sales (~$2.1B), with DC cooling revenue up 120% on a three-year stack and a record $12.1B backlog driven mainly by DC chillers.",
    "src": "traneAI"
  },
  {
    "id": "johnsoncontrols",
    "name": "Johnson Controls",
    "layer": "Systems & sites",
    "sub": "JCI · DC cooling & building systems",
    "desc": "Building-systems major whose data-center cooling and controls business now runs at a high-teens share of a ~$25B revenue base.",
    "fact": "Data-center-related revenue is ~$4B+ and growing faster than the portfolio; its CDU pipeline exceeds $1B, with backlog of $21B (+32%) and orders +27% in FY Q3 2026.",
    "src": "johnsoncontrolsAI"
  },
  {
    "id": "cummins",
    "name": "Cummins",
    "layer": "Power & utilities",
    "sub": "CMI · prime & backup power",
    "desc": "Engine and power-generation major whose gensets are standard backup — and increasingly prime — power for data-center campuses.",
    "fact": "Data-center-related revenue reached $3.5B in 2025 (from $2.6B in 2024, +35%) within $33.7B total; Power Systems revenue was $7.5B (+16%) with orders booked into 2028.",
    "src": "cumminsAI"
  },
  {
    "id": "caterpillar",
    "name": "Caterpillar",
    "layer": "Power & utilities",
    "sub": "CAT · power generation",
    "desc": "Heavy-machinery giant whose Power & Energy segment sells the gensets and turbines data centers are buying for prime power as grid queues lengthen.",
    "fact": "Power & Energy is $28.6B of $67.6B sales; power-generation sales rose 44% in Q4 2025 on data-center genset and turbine demand, and a sixth 1 GW prime-power data-center deal has been signed.",
    "src": "caterpillarAI"
  },
  {
    "id": "comfortsystems",
    "name": "Comfort Systems USA",
    "layer": "Systems & sites",
    "sub": "FIX · DC construction & integration (EPC)",
    "desc": "Mechanical and electrical contractor that physically builds data centers — an anchor of the map's new construction/EPC category, where the binding constraint is skilled labor and speed-to-power.",
    "fact": "Data centers are 45% of revenue (~$4.1B of $9.1B), with backlog of ~$11.9B.",
    "src": "comfortsystemsAI"
  },
  {
    "id": "emcor",
    "name": "EMCOR",
    "layer": "Systems & sites",
    "sub": "EME · DC construction & integration (EPC)",
    "desc": "Electrical and mechanical construction giant whose data-center electrical work is booked at multi-billion scale inside a single segment.",
    "fact": "It books $2.46B of data-center electrical work in one segment alone, ~85% of that backlog DC-related, with total remaining performance obligations of $13.25B.",
    "src": "emcorAI"
  },
  {
    "id": "quantaservices",
    "name": "Quanta Services",
    "layer": "Systems & sites",
    "sub": "PWR · DC construction & integration (EPC)",
    "desc": "Infrastructure-services major for electric power whose Technology & Load Centers business wires up AI campuses and grid interconnections.",
    "fact": "Technology & Load Centers is a ~$2.9B business guided to grow +220–240% in 2026; total backlog is a record $53.4B.",
    "src": "quantaservicesAI"
  },
  {
    "id": "cameco",
    "name": "Cameco",
    "layer": "Power & utilities",
    "sub": "CCJ · uranium & nuclear fuel",
    "desc": "World's largest public uranium producer (~15% of global output) and 49% owner of Westinghouse — the fuel-chain name the coverage sweep ruled into the Energy layer.",
    "fact": "2025 revenue was C$3.48B with ~230M lbs contracted; via Westinghouse it is party to the October 2025 US-government $80B AP1000 partnership framed as power for data centers and AI.",
    "src": "camecoAI"
  },
  {
    "id": "brookfield",
    "name": "Brookfield",
    "layer": "Cloud & compute",
    "sub": "BN · infrastructure sponsor",
    "desc": "Canadian alternative-asset giant running a $100B AI Infrastructure Program — the largest financing omission the sweep found; its asset-management affiliate trades separately as BAM.",
    "fact": "The program (Nov 2025) is anchored by a $10B-equity fund (BAIIF; $5B committed, incl. Nvidia and the Kuwait Investment Authority), spans Data4's 30+ AI-ready data centers and ~$30B initial France/Sweden tranches, and its Bloom Energy partnership expanded from $5B to $25B; with Cameco it co-owns Westinghouse.",
    "src": "brookfieldAI"
  },
  {
    "id": "blackrock",
    "name": "BlackRock",
    "layer": "Cloud & compute",
    "sub": "BLK · infrastructure sponsor (GIP)",
    "desc": "Asset-management giant whose Global Infrastructure Partners arm co-founded the AI Infrastructure Partnership and manages its data-center portfolio.",
    "fact": "Through GIP it co-founded the AI Infrastructure Partnership (with MGX, Microsoft and Nvidia; targeting $30B equity / up to $100B incl. debt), whose first deal was the Oct 15, 2025 acquisition of Aligned Data Centers at ~$40B enterprise value — the largest data-center deal ever, 50 campuses, >5 GW.",
    "src": "blackrockAI"
  },
  {
    "id": "kkr",
    "name": "KKR",
    "layer": "Cloud & compute",
    "sub": "KKR · infrastructure sponsor",
    "desc": "Private-equity major with dedicated, specific data-center equity — co-owner of CyrusOne and partner in a $50B AI-infrastructure venture with ECP.",
    "fact": "Co-owns CyrusOne ($15B 2022 take-private, 60+ data centers, >1 GW) with GIP; runs a $50B ECP strategic partnership for AI infrastructure (first project ~$4B, a 190 MW Texas campus) and the reported >$10B Helix AI-infrastructure venture.",
    "src": "kkrAI"
  },
  {
    "id": "ironmountain",
    "name": "Iron Mountain",
    "layer": "Systems & sites",
    "sub": "IRM · data-center operator",
    "desc": "Records-storage giant whose Global Data Center segment has become a hyperscale landlord in its own right, energizing ~400 MW over 24 months toward 1.4 GW.",
    "fact": "FY2025 total revenue was $6.90B; the data-center segment is guided to exceed $1B in 2026 at >25% growth (Q1 2026: $255M, +47% y/y), on named hyperscale AI demand.",
    "src": "ironmountainAI"
  },
  {
    "id": "gds",
    "name": "GDS Holdings",
    "layer": "Systems & sites",
    "sub": "GDS · China data-center operator",
    "desc": "Pure-play Chinese data-center operator and the country's wholesale colocation leader, with record AI-driven bookings.",
    "fact": "FY2026 guidance was raised to RMB12.7–13.0B (~$1.9B); H1 2026 bookings hit a record 471 MW with 757 MW of backlog, with management attributing demand mainly to AI.",
    "src": "gdsAI"
  },
  {
    "id": "vnet",
    "name": "21Vianet (VNET Group)",
    "layer": "Systems & sites",
    "sub": "VNET · China data-center operator",
    "desc": "Pure-play Chinese data-center operator, peer to GDS, whose wholesale IDC business is now its largest segment on AI demand.",
    "fact": "FY2026 guidance is RMB11.5–11.8B (~$1.65B, +16–19%); wholesale IDC grew 29.3% y/y in Q2 2026 with 862 MW of wholesale orders won year-to-date.",
    "src": "vnetAI"
  },
  {
    "id": "galaxydigital",
    "name": "Galaxy Digital",
    "layer": "Systems & sites",
    "sub": "GLXY · neocloud hosting",
    "desc": "Crypto financial group whose Helios campus has flipped into one of the largest single-tenant AI hosting sites, fully leased to CoreWeave.",
    "fact": "Helios Phase I (133 MW) was delivered to CoreWeave in Q2 2026 with rent commenced (~$80M/quarter run-rate, >90% project EBITDA margin); CoreWeave is committed to the full 526 MW on 15-year leases, expected at >$1.2B average annual revenue (~$18B+ over term), with Phases II–III delivering from Q2 2027.",
    "src": "galaxydigitalAI"
  },
  {
    "id": "terawulf",
    "name": "TeraWulf",
    "layer": "Systems & sites",
    "sub": "WULF · neocloud hosting",
    "desc": "Former bitcoin miner whose revenue mix has flipped to HPC leasing, anchored by a direct 20-year Anthropic lease.",
    "fact": "HPC leasing was 71% of Q2 2026 revenue; ~839 MW is contracted, incl. the 401 MW Anthropic lease (~$19B, ~$950M/yr, delivering H2 2027) on top of a ~$12.8B Fluidstack/Core42 book — though delivered revenue is still only ~$170–180M annualized against ~$5.7B of debt.",
    "src": "terawulfAI"
  },
  {
    "id": "hut8",
    "name": "Hut 8",
    "layer": "Systems & sites",
    "sub": "HUT · neocloud hosting",
    "desc": "Energy-and-compute developer with one of the largest contracted AI data-center pipelines in the miner-pivot group, though delivered AI revenue is still negligible.",
    "fact": "949 MW of AI data-center capacity is contracted (~$26.6B expected base-term value) with 1,330 MW under construction (Fluidstack/Anthropic/Google-backed); Q2 2026 Digital Infrastructure revenue was $1.3M.",
    "src": "hut8AI"
  },
  {
    "id": "generac",
    "name": "Generac",
    "layer": "Power & utilities",
    "sub": "GNRC · backup generation",
    "desc": "Generator maker whose September 2026 Amazon deal converted a small data-center business into contracted TTMI-scale backlog.",
    "fact": "2026 data-center revenue is guided at only ~$450M, but the Amazon deal (Sep 2026) is worth up to $8B with $2.4B of initial 2027–28 deliveries (~$1.2B/yr, ~28% of 2025 revenue), alongside a $1.6B DC backlog.",
    "src": "generacAI"
  },
  {
    "id": "lasertec",
    "name": "Lasertec",
    "layer": "Fabrication & links",
    "sub": "6920.T · EUV mask inspection",
    "desc": "Japanese equipment maker holding a near-monopoly in EUV mask inspection — a chokepoint every sub-5nm AI chip depends on, with no rival above 10% share.",
    "fact": "It holds 82.6% share of EUV mask inspection; orders rose 125.7% in FY2026 with backlog of ¥323B. Revenue (~$1.5B) is sub-TTMI — it clears on monopoly criticality.",
    "src": "lasertecAI"
  },
  {
    "id": "disco",
    "name": "Disco",
    "layer": "Fabrication & links",
    "sub": "6146.T · dicing & grinding equipment",
    "desc": "Japanese precision-equipment maker with ~70–75% global share in dicing and grinding — the wafer-thinning step HBM and AI logic increasingly require.",
    "fact": "Record Q2 FY2027 sales rose 36.4% y/y, explicitly on generative-AI logic and HBM wafer-thinning demand; revenue is ~$2.8B.",
    "src": "discoAI"
  },
  {
    "id": "aaoi",
    "name": "Applied Optoelectronics",
    "layer": "Fabrication & links",
    "sub": "AAOI · optical transceivers",
    "desc": "US maker of optical transceivers for AI data centers — a domestic source in a China-led market, qualified as a 1.6T supplier at a major hyperscaler; its legacy CATV business is the non-AI remainder.",
    "fact": "Q2 2026 revenue hit a record $191.9M (+86% y/y) with data-center revenue of $107.7M (+140% y/y); 800G revenue grew >10× y/y on $124M+ of cumulative orders, plus a $200M+ 1.6T order from a long-term hyperscale customer; the FY2026 outlook exceeds $1.1B, with demand forecast to exceed supply through mid-2027.",
    "src": "aaoiAI"
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
    "label": "participated in $10B round (Dec 2024, then $62B valuation)",
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
  },
  {
    "from": "wdc",
    "to": "metadc",
    "type": "supply",
    "label": "Exabyte-scale HDD capacity for AI training data; 2026 sold out",
    "cite": "24/7 Wall St. · May 16, 2026",
    "id": "e94"
  },
  {
    "from": "sandisk",
    "to": "azure",
    "type": "supply",
    "label": "NAND flash for AI storage tiers",
    "cite": "Sahm Capital · May 1, 2026",
    "id": "e95"
  },
  {
    "from": "seagate",
    "to": "aws",
    "type": "supply",
    "label": "Nearline HDD capacity for AI datasets",
    "cite": "24/7 Wall St. · May 16, 2026",
    "id": "e96"
  },
  {
    "from": "appliedmaterials",
    "to": "tsmc",
    "type": "supply",
    "label": "Wafer fab equipment",
    "cite": "24/7 Wall St. · Aug 18, 2026",
    "id": "e97"
  },
  {
    "from": "lamresearch",
    "to": "micron",
    "type": "supply",
    "label": "Etch/deposition tools for HBM production",
    "cite": "24/7 Wall St. · Aug 18, 2026",
    "id": "e98"
  },
  {
    "from": "kla",
    "to": "skhynix",
    "type": "supply",
    "label": "Process control/inspection for HBM yield",
    "cite": "24/7 Wall St. · Aug 18, 2026",
    "id": "e99"
  },
  {
    "from": "arista",
    "to": "metadc",
    "type": "supply",
    "label": "AI cluster switching; Meta >10% of revenue",
    "cite": "Fierce Network · 2026",
    "id": "e100"
  },
  {
    "from": "smic",
    "to": "huawei",
    "type": "supply",
    "label": "5nm-class N+3 node fabs Ascend 950PR",
    "cite": "TrendForce · Apr 7, 2026",
    "id": "e101"
  },
  {
    "from": "huawei",
    "to": "chinacsp",
    "type": "partner",
    "label": "ByteDance, Alibaba, Tencent large Ascend 950PR orders",
    "cite": "Tom's Hardware · 2026",
    "id": "e102"
  },
  {
    "from": "huawei",
    "to": "deepseek",
    "type": "partner",
    "label": "DeepSeek V4 inference validated on Ascend 950PR via CANN Next",
    "cite": "TrendForce · Apr 7, 2026",
    "id": "e103"
  },
  {
    "from": "bloomenergy",
    "to": "oracle",
    "type": "supply",
    "label": "Up to 2.8GW of SOFC systems under expanded MSA",
    "cite": "Bloom Energy · Apr 13, 2026",
    "id": "e104"
  },
  {
    "from": "bloomenergy",
    "to": "coreweave",
    "type": "supply",
    "label": "On-site fuel cells for CoreWeave's Illinois AI data center",
    "cite": "Bloom Energy / BusinessWire · Jul 16, 2024",
    "id": "e105"
  },
  {
    "from": "bloomenergy",
    "to": "aep",
    "type": "supply",
    "label": "$2.65B agreement for up to 1GW of fuel cells",
    "cite": "FuelCellsWorks · Jan 8, 2026",
    "id": "e106"
  },
  {
    "from": "iren",
    "to": "azure",
    "type": "supply",
    "label": "Five-year, ~$9.7B GPU cloud compute agreement",
    "cite": "IREN · 2026",
    "id": "e107"
  },
  {
    "from": "nvidia",
    "to": "iren",
    "type": "money",
    "label": "5-year right to invest up to ~$2.1B via warrants",
    "cite": "CNBC · May 7, 2026",
    "id": "e108"
  },
  {
    "from": "nvidia",
    "to": "nscale",
    "type": "money",
    "label": "Guarantees up to $860M of Nscale's data-center lease",
    "cite": "measuredai · 2026",
    "id": "e109"
  },
  {
    "from": "nscale",
    "to": "azure",
    "type": "partner",
    "label": "Microsoft is anchor tenant with step-in right on Nscale leases",
    "cite": "measuredai · 2026",
    "id": "e110"
  },
  {
    "from": "gcloud",
    "to": "ciphermining",
    "type": "money",
    "label": "Guarantees $1.4B of Fluidstack's $3B/10yr lease with Cipher",
    "cite": "Data Center Dynamics · Nov 2025",
    "id": "e111"
  },
  {
    "from": "nvidia",
    "to": "lambdaai",
    "type": "money",
    "label": "Nvidia-backed neocloud; pre-IPO round up to $3B at ~$12B valuation",
    "cite": "Bloomberg · Aug 24, 2026",
    "id": "e112"
  },
  {
    "from": "tokyoelectron",
    "to": "samsung",
    "type": "supply",
    "label": "Etch/deposition equipment for advanced logic and HBM DRAM",
    "cite": "TrendForce · Dec 8, 2025",
    "id": "e113"
  },
  {
    "from": "coherentcorp",
    "to": "nvidia",
    "type": "supply",
    "label": "Optical transceivers/silicon photonics under Nvidia's $4B optics program",
    "cite": "Tech Insider · 2026",
    "id": "e114"
  },
  {
    "from": "lenovo",
    "to": "nvidia",
    "type": "supply",
    "label": "AI server ODM; ISG revenue +98% YoY on AI systems",
    "cite": "InfotechLead · 2026",
    "id": "e115"
  },
  {
    "from": "nvidia",
    "to": "perplexity",
    "type": "money",
    "label": "In talks to invest at $30B+ valuation; Perplexity runs agents on Nvidia Vera",
    "cite": "The Information / Yahoo Finance · Aug 23, 2026",
    "id": "e116"
  },
  {
    "from": "apollo",
    "to": "openai",
    "type": "money",
    "label": "Lender in talks on $50B+ financing for OpenAI's custom chips (reported, early talks)",
    "cite": "WSJ · Oct 7, 2026",
    "id": "e117"
  },
  {
    "from": "blackstone",
    "to": "openai",
    "type": "money",
    "label": "Lender approached on $50B+ OpenAI chip financing (reported, early talks)",
    "cite": "WSJ · Oct 7, 2026",
    "id": "e118"
  },
  {
    "from": "apollo",
    "to": "oracle",
    "type": "money",
    "label": "In talks on financing Oracle's Nvidia chip purchase (reported)",
    "cite": "WSJ · Oct 7, 2026",
    "id": "e119"
  },
  {
    "from": "goldmansachs",
    "to": "oracle",
    "type": "money",
    "label": "In talks with Apollo on Oracle chip-purchase financing (reported)",
    "cite": "WSJ · Oct 7, 2026",
    "id": "e120"
  },
  {
    "from": "apollo",
    "to": "xai",
    "type": "money",
    "label": "Expected to lead ~$40B SpaceX raise for Nvidia chips; 2027 close eyed (reported)",
    "cite": "FT via The Times · Oct 2026",
    "id": "e121"
  },
  {
    "from": "pimco",
    "to": "xai",
    "type": "money",
    "label": "In talks to help finance SpaceX's ~$40B Nvidia chip purchase (reported)",
    "cite": "FT via The Times · Oct 2026",
    "id": "e122"
  },
  {
    "from": "blackstone",
    "to": "anthropic",
    "type": "money",
    "label": "~$9B committed to junior tranche of $60B chip-financing package (reported)",
    "cite": "FT · Oct 2026",
    "id": "e123"
  },
  {
    "from": "broadcom",
    "to": "anthropic",
    "type": "money",
    "label": "Up to $42B convertible-note chip financing agreed; junior tranche flagged as conflict risk (reported)",
    "cite": "Reuters · Oct 2026",
    "id": "e124"
  },
  {
    "from": "teradyne",
    "to": "packaging",
    "type": "supply",
    "label": "SoC & memory test systems for AI chips (Semi Test +128% y/y)",
    "cite": "Zacks · Sep 16, 2026",
    "id": "e125"
  },
  {
    "from": "advantest",
    "to": "packaging",
    "type": "supply",
    "label": "Chip testers — ~65% global share — into the foundry/OSAT chain",
    "cite": "The Inference · Oct 2026",
    "id": "e126"
  },
  {
    "from": "entegris",
    "to": "tsmc",
    "type": "supply",
    "label": "Fab materials & contamination control for advanced logic, HBM and packaging",
    "cite": "TechTimes · Aug 4, 2026",
    "id": "e127"
  },
  {
    "from": "ibiden",
    "to": "packaging",
    "type": "supply",
    "label": "ABF package substrates (est. 70–80% AI-server share) feeding advanced packaging",
    "cite": "BofA via 404K Research · 2026",
    "id": "e128"
  },
  {
    "from": "amphenol",
    "to": "dell",
    "type": "supply",
    "label": "Connectors & interconnect for AI servers (IT datacom +89% y/y)",
    "cite": "Zacks · Oct 2, 2026",
    "id": "e129"
  },
  {
    "from": "ttmtech",
    "to": "supermicro",
    "type": "supply",
    "label": "High-layer-count PCBs for AI servers & networking gear",
    "cite": "GlobeNewswire · Oct 12, 2026",
    "id": "e130"
  },
  {
    "from": "monolithicpower",
    "to": "nvidia",
    "type": "supply",
    "label": "Board power management; ~70% share of Vera Rubin power sockets (KeyBanc est.)",
    "cite": "Reuters · Jul 2026",
    "id": "e131"
  },
  {
    "from": "monolithicpower",
    "to": "amd",
    "type": "supply",
    "label": "Power delivery for AI accelerators",
    "cite": "Reuters · Jul 2026",
    "id": "e132"
  },
  {
    "from": "fabrinet",
    "to": "optics",
    "type": "supply",
    "label": "Contract manufactures 1.6T transceivers & silicon photonics for module makers",
    "cite": "Motley Fool · Sep 18, 2026",
    "id": "e133"
  },
  {
    "from": "corning",
    "to": "nvidia",
    "type": "partner",
    "label": "Partnership: 10× optical-connectivity capacity, +50% fiber output, 3 new US plants",
    "cite": "Corning · May 6, 2026",
    "id": "e134"
  },
  {
    "from": "corning",
    "to": "metadc",
    "type": "supply",
    "label": "$6B multiyear fiber & optical connectivity deal (Jan 2026)",
    "cite": "Barron's · 2026",
    "id": "e135"
  },
  {
    "from": "corning",
    "to": "aws",
    "type": "supply",
    "label": "Multiyear, multibillion-dollar fiber supply deal (2026)",
    "cite": "Corning Q2 2026 release",
    "id": "e136"
  },
  {
    "from": "kioxia",
    "to": "sandisk",
    "type": "partner",
    "label": "Flash memory manufacturing JV partner",
    "cite": "Japan Stock Pulse · May 15, 2026",
    "id": "e137"
  },
  {
    "from": "celestica",
    "to": "gcloud",
    "type": "supply",
    "label": "Primary builder of Google TPU systems",
    "cite": "Bernstein · Jul 27, 2026",
    "id": "e138"
  },
  {
    "from": "celestica",
    "to": "amd",
    "type": "supply",
    "label": "Manufacturing partner for AMD Helios AI systems",
    "cite": "Bernstein · Jul 27, 2026",
    "id": "e139"
  },
  {
    "from": "celestica",
    "to": "openai",
    "type": "supply",
    "label": "Rack deliveries for the Broadcom/OpenAI program expected late 2026 (reported)",
    "cite": "Bernstein · Jul 27, 2026",
    "id": "e140"
  },
  {
    "from": "eaton",
    "to": "equinix",
    "type": "supply",
    "label": "Data-center switchgear & power distribution (broad supply; DC orders +~240%)",
    "cite": "MarketBeat · Sep 17, 2026",
    "id": "e141"
  },
  {
    "from": "schneider",
    "to": "equinix",
    "type": "supply",
    "label": "Data-center electrical & power systems (broad supply; DC ~30% of orders)",
    "cite": "Company results · Oct 16, 2026",
    "id": "e142"
  },
  {
    "from": "modine",
    "to": "equinix",
    "type": "supply",
    "label": "Data-center cooling systems (>$4B supply agreement, 2027–29)",
    "cite": "MarketBeat · May 2026",
    "id": "e143"
  },
  {
    "from": "corescientific",
    "to": "coreweave",
    "type": "supply",
    "label": "~590 MW hosting contracted across six sites (~$10.2B projected 12-yr revenue)",
    "cite": "CoinDesk · 2026",
    "id": "e144"
  },
  {
    "from": "corescientific",
    "to": "amd",
    "type": "supply",
    "label": "~530 MW leased to AMD from 2027 (reported)",
    "cite": "mrkt30 neocloud ranking · Oct 2026",
    "id": "e145"
  },
  {
    "from": "blueowl",
    "to": "metadc",
    "type": "money",
    "label": "80% equity owner of Meta's Hyperion data-center JV (~$27–29B phase 1)",
    "cite": "Data Center Frontier · Jul 2026",
    "id": "e146"
  },
  {
    "from": "blueowl",
    "to": "crusoe",
    "type": "money",
    "label": "Early financial backer",
    "cite": "DataCenterDynamics · 2025",
    "id": "e147"
  },
  {
    "from": "terawulf",
    "to": "anthropic",
    "type": "supply",
    "label": "401 MW, 20-year HPC lease (~$19B, ~$950M/yr; delivery H2 2027)",
    "cite": "Company filings · Oct 15, 2026",
    "id": "e148"
  },
  {
    "from": "terawulf",
    "to": "g42",
    "type": "supply",
    "label": "HPC capacity for Core42 (G42's US arm) within a ~$12.8B Fluidstack/Core42 contracted book",
    "cite": "Company filings · Oct 15, 2026",
    "id": "e149"
  },
  {
    "from": "galaxydigital",
    "to": "coreweave",
    "type": "supply",
    "label": "Helios campus: 526 MW on 15-year leases (>$1.2B/yr average contracted revenue)",
    "cite": "Company 8-K · Aug 5, 2026",
    "id": "e150"
  },
  {
    "from": "generac",
    "to": "aws",
    "type": "supply",
    "label": "Backup-generation deal worth up to $8B; $2.4B of initial deliveries in 2027–28",
    "cite": "Company announcement · Sep 2026",
    "id": "e151"
  },
  {
    "from": "sanmina",
    "to": "amd",
    "type": "supply",
    "label": "Rack-scale AI manufacturing via ZT Systems ($5–6B guided FY2026 revenue)",
    "cite": "Sanmina Q2 FY2026 results · Apr 2026",
    "id": "e152"
  },
  {
    "from": "gigabyte",
    "to": "nvidia",
    "type": "supply",
    "label": "AI server OEM — servers 71.5% of sales, ~90% of them AI servers",
    "cite": "Gigabyte Q1 2026 results · 2026",
    "id": "e153"
  },
  {
    "from": "deltaelectronics",
    "to": "nvidia",
    "type": "partner",
    "label": "800VDC rack-power & CDU partner for AI racks",
    "cite": "Company results · 2026",
    "id": "e154"
  },
  {
    "from": "teconnectivity",
    "to": "dell",
    "type": "supply",
    "label": "High-speed datacom interconnect for AI servers (broad supply; AI datacom orders +70% YTD)",
    "cite": "Zacks · Sep 2026",
    "id": "e155"
  },
  {
    "from": "shinetsu",
    "to": "tsmc",
    "type": "supply",
    "label": "300mm silicon wafers, photoresist & mask blanks for leading-edge fabs (broad supply)",
    "cite": "Shin-Etsu results · Jan 2026",
    "id": "e156"
  },
  {
    "from": "unimicron",
    "to": "packaging",
    "type": "supply",
    "label": "ABF package substrates — #2 supplier (~20% of capacity); substrates 52% of revenue",
    "cite": "Unimicron H1 2026 filings · Aug 2026",
    "id": "e157"
  },
  {
    "from": "lasertec",
    "to": "tsmc",
    "type": "supply",
    "label": "EUV mask inspection (82.6% share) for leading-edge fabs (broad supply)",
    "cite": "Lasertec FY2026 results · Oct 2026",
    "id": "e158"
  },
  {
    "from": "disco",
    "to": "packaging",
    "type": "supply",
    "label": "Dicing, grinding & HBM wafer-thinning equipment (~70–75% global share)",
    "cite": "Disco results · Oct 22, 2026",
    "id": "e159"
  },
  {
    "from": "trane",
    "to": "equinix",
    "type": "supply",
    "label": "Data-center chillers & cooling (broad supply; DC cooling revenue +120% on 3-yr stack)",
    "cite": "Company results · 2026",
    "id": "e160"
  },
  {
    "from": "johnsoncontrols",
    "to": "equinix",
    "type": "supply",
    "label": "Data-center cooling & CDUs (broad supply; CDU pipeline >$1B)",
    "cite": "Company results · 2026",
    "id": "e161"
  },
  {
    "from": "brookfield",
    "to": "bloomenergy",
    "type": "partner",
    "label": "Fuel-cell partnership expanded from $5B to $25B",
    "cite": "Company release · Nov 2025",
    "id": "e162"
  },
  {
    "from": "brookfield",
    "to": "cameco",
    "type": "partner",
    "label": "Co-owners of Westinghouse; parties to the $80B US AP1000 partnership",
    "cite": "Company release · Nov 2025",
    "id": "e163"
  },
  {
    "from": "blackrock",
    "to": "mgx",
    "type": "partner",
    "label": "Co-founders of the AI Infrastructure Partnership; first deal: Aligned Data Centers (~$40B EV, >5 GW)",
    "cite": "Company announcement · Oct 2025",
    "id": "e164"
  },
  {
    "from": "kkr",
    "to": "blackrock",
    "type": "partner",
    "label": "Co-owners (with GIP) of CyrusOne — 60+ data centers, >1 GW",
    "cite": "Company announcements · 2026",
    "id": "e165"
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
      "scaleai",
      "perplexity",
      "ssi",
      "thinkingmachines",
      "moonshotai",
      "zhipuai"
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
      "togetherai",
      "iren",
      "lambdaai",
      "nscale",
      "groq",
      "apollo",
      "blackstone",
      "pimco",
      "goldmansachs",
      "blueowl",
      "brookfield",
      "blackrock",
      "kkr"
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
      "qualcomm",
      "intel",
      "huawei"
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
      "interconnect",
      "wdc",
      "sandisk",
      "seagate",
      "appliedmaterials",
      "lamresearch",
      "kla",
      "tokyoelectron",
      "coherentcorp",
      "advantest",
      "teradyne",
      "entegris",
      "ibiden",
      "amphenol",
      "ttmtech",
      "monolithicpower",
      "fabrinet",
      "corning",
      "kioxia",
      "teconnectivity",
      "shinetsu",
      "unimicron",
      "lasertec",
      "disco",
      "aaoi"
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
      "hpe",
      "arista",
      "ciphermining",
      "lenovo",
      "celestica",
      "jabil",
      "eaton",
      "schneider",
      "modine",
      "corescientific",
      "sanmina",
      "gigabyte",
      "deltaelectronics",
      "trane",
      "johnsoncontrols",
      "comfortsystems",
      "emcor",
      "quantaservices",
      "ironmountain",
      "gds",
      "vnet",
      "galaxydigital",
      "terawulf",
      "hut8"
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
      "terrapower",
      "bloomenergy",
      "aep",
      "siemensenergy",
      "cummins",
      "caterpillar",
      "generac",
      "cameco"
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
  },
  "storage": {
    "label": "24/7 Wall St. · May 16, 2026",
    "url": "https://247wallst.com/investing/2026/05/16/seagate-and-western-digital-ai-storage-demand-is-now-showing-up-in-pricing-power/"
  },
  "sandisk": {
    "label": "Sahm Capital · May 1, 2026",
    "url": "https://www.sahmcapital.com/news/content/sandisk-joins-western-digital-seagate-in-signaling-strong-ai-storage-demand-2026-05-01"
  },
  "waferequip": {
    "label": "24/7 Wall St. · Aug 18, 2026",
    "url": "https://247wallst.com/investing/2026/08/18/applied-materials-rockets-98-in-2026-how-does-amat-compare-to-lam-research-and-kla-as-ai-capex-powers-chip-gear-stocks/"
  },
  "arista": {
    "label": "Fierce Network · 2026",
    "url": "https://www.fierce-network.com/cloud/arista-rides-ai-past-cisco-now-nvidia-looms"
  },
  "huaweiAscend": {
    "label": "Tom's Hardware · 2026",
    "url": "https://www.tomshardware.com/tech-industry/huawei-expects-12-billion-in-ai-chip-revenue-this-year-as-nvidias-china-market-share-hits-zero"
  },
  "bloomOracle": {
    "label": "Bloom Energy · Apr 13, 2026",
    "url": "https://www.bloomenergy.com/news/bloom-energy-and-oracle-expand-strategic-partnership-to-deploy-up-to-2-8-gw-to-accelerate-ai-infrastructure-build-out/"
  },
  "irenMicrosoft": {
    "label": "IREN · 2026",
    "url": "https://iren.com/resources/blog/iren-signs97-billion-agreement-with-microsoft-to-deploy-ai-cloud-infrastructure"
  },
  "bloomAEP": {
    "label": "FuelCellsWorks · Jan 8, 2026",
    "url": "https://fuelcellsworks.com/2026/01/08/electrolyzer/american-electric-power-locks-in-2-65bn-deal-to-deploy-up-to-1gw-of-bloom-energy-fuel-cells"
  },
  "lambdaFunding": {
    "label": "Bloomberg · Aug 24, 2026",
    "url": "https://www.bloomberg.com/news/articles/2026-08-24/ai-cloud-provider-lambda-in-talks-for-3-billion-pre-ipo-round"
  },
  "nscaleNvidia": {
    "label": "measuredai · 2026",
    "url": "https://measuredai.substack.com/p/microsoft-monarch-data-center"
  },
  "cipherGoogle": {
    "label": "Data Center Dynamics · Nov 2025",
    "url": "https://www.datacenterdynamics.com/en/news/cipher-mining-secures-fluidstack-as-a-customer-and-google-as-an-investor/"
  },
  "perplexityNvidia": {
    "label": "Yahoo Finance / The Information · Aug 23, 2026",
    "url": "https://finance.yahoo.com/technology/ai/articles/nvidia-discusses-perplexity-investment-30-031804276.html"
  },
  "ssiSource": {
    "label": "Wikipedia · Safe Superintelligence Inc.",
    "url": "https://en.wikipedia.org/wiki/Safe_Superintelligence_Inc."
  },
  "tmlSource": {
    "label": "Wikipedia · Thinking Machines Lab",
    "url": "https://en.wikipedia.org/wiki/Thinking_Machines_Lab"
  },
  "moonshotSource": {
    "label": "The AI Insider · May 8, 2026",
    "url": "https://theaiinsider.tech/2026/05/08/moonshot-ai-closes-2b-funding-round-at-20b-valuation-as-kimi-models-rival-openai-and-anthropic/"
  },
  "zhipuSource": {
    "label": "CNBC · Jan 8, 2026",
    "url": "https://www.cnbc.com/2026/01/08/china-ai-tiger-goes-ipo-zhipu-hong-kong-debut-openai-knowledge-atlas-hsi-hang-seng-listing.html"
  },
  "tokyoElectronAI": {
    "label": "TrendForce · Dec 8, 2025",
    "url": "https://www.trendforce.com/news/2025/12/08/news-tokyo-electron-sees-ai-driven-sales-hitting-40-by-2026-offsetting-china-slowdown/"
  },
  "coherentNvidia": {
    "label": "Tech Insider · 2026",
    "url": "https://tech-insider.org/nvidia-silicon-photonics-lumentum-coherent-ai-data-center-2026/"
  },
  "lenovoAI": {
    "label": "InfotechLead · 2026",
    "url": "https://infotechlead.com/networking/lenovo-revenue-jumps-43-to-26-94-bn-as-ai-server-pipeline-hits-54-bn-97687"
  },
  "wsjChipFinancing": {
    "label": "WSJ · Oct 7, 2026",
    "url": "https://www.wsj.com/tech/oracle-broadcom-and-spacex-seek-blockbuster-debt-deals-to-pay-for-ai-chips-848e8032"
  },
  "ftSpaceX40B": {
    "label": "FT via The Times · Oct 2026",
    "url": "https://www.thetimes.com/business/technology/article/spacex-seeks-40bn-nvidia-ai-chips-q7325bxpf"
  },
  "anthropicFinancingFT": {
    "label": "FT · Oct 2026",
    "url": "https://www.tradersunion.com/news/financial-news/show/3672083/broadcom-ai-chip-financing-60bn/"
  },
  "anthropicFinancingReuters": {
    "label": "Reuters · Oct 2026",
    "url": "https://www.rdworldonline.com/broadcom-lines-up-60-billion-as-suppliers-finance-the-frontier-labs-compute/"
  },
  "amphenolAI": {
    "label": "Zacks · Oct 2, 2026",
    "url": null
  },
  "monolithicAI": {
    "label": "Reuters · Jul 2026",
    "url": null
  },
  "ttmiAI": {
    "label": "GlobeNewswire · Oct 12, 2026",
    "url": null
  },
  "teradyneAI": {
    "label": "Zacks · Sep 16, 2026",
    "url": null
  },
  "advantestAI": {
    "label": "The Inference · Oct 2026",
    "url": null
  },
  "entegrisAI": {
    "label": "TechTimes · Aug 4, 2026",
    "url": null
  },
  "ibidenAI": {
    "label": "BofA via 404K Research · 2026",
    "url": null
  },
  "fabrinetAI": {
    "label": "Motley Fool · Sep 18, 2026",
    "url": null
  },
  "corningAI": {
    "label": "Barron's · 2026",
    "url": null
  },
  "kioxiaAI": {
    "label": "Japan Stock Pulse · May 15, 2026",
    "url": null
  },
  "celesticaAI": {
    "label": "Bernstein · Jul 27, 2026",
    "url": null
  },
  "jabilAI": {
    "label": "Jabil Q3 FY2026 results · Jun 2026",
    "url": null
  },
  "eatonAI": {
    "label": "MarketBeat · Sep 17, 2026",
    "url": null
  },
  "schneiderAI": {
    "label": "Company results · Oct 16, 2026",
    "url": null
  },
  "modineAI": {
    "label": "MarketBeat · May 2026",
    "url": null
  },
  "corescientificAI": {
    "label": "CoinDesk · 2026",
    "url": null
  },
  "blueowlAI": {
    "label": "Data Center Frontier · Jul 2026",
    "url": null
  },
  "teconnectivityAI": {
    "label": "Zacks · Sep 2026",
    "url": null
  },
  "sanminaAI": {
    "label": "Sanmina Q2 FY2026 results · Apr 2026",
    "url": null
  },
  "gigabyteAI": {
    "label": "Gigabyte Q1 2026 results · 2026",
    "url": null
  },
  "shinetsuAI": {
    "label": "Shin-Etsu results · Jan 2026",
    "url": null
  },
  "unimicronAI": {
    "label": "Unimicron H1 2026 filings · Aug 2026",
    "url": null
  },
  "siemensenergyAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "deltaAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "traneAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "johnsoncontrolsAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "cumminsAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "caterpillarAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "comfortsystemsAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "emcorAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "quantaservicesAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "camecoAI": {
    "label": "Company results · 2026",
    "url": null
  },
  "brookfieldAI": {
    "label": "Company release · Nov 2025",
    "url": null
  },
  "blackrockAI": {
    "label": "Company announcement · Oct 2025",
    "url": null
  },
  "kkrAI": {
    "label": "Company announcements · 2026",
    "url": null
  },
  "ironmountainAI": {
    "label": "Company filings · 2026",
    "url": null
  },
  "gdsAI": {
    "label": "GDS Q2 2026 results · Aug 13, 2026",
    "url": null
  },
  "vnetAI": {
    "label": "VNET Q2 2026 results · 2026",
    "url": null
  },
  "galaxydigitalAI": {
    "label": "Company 8-K · Aug 5, 2026",
    "url": null
  },
  "terawulfAI": {
    "label": "Company filings · Oct 15, 2026",
    "url": null
  },
  "hut8AI": {
    "label": "HUT Q2 2026 results · Aug 4, 2026",
    "url": null
  },
  "generacAI": {
    "label": "Company announcement · Sep 2026",
    "url": null
  },
  "lasertecAI": {
    "label": "Lasertec FY2026 results · Oct 2026",
    "url": null
  },
  "discoAI": {
    "label": "Disco results · Oct 22, 2026",
    "url": null
  },
  "aaoiAI": {
    "label": "Zacks · Oct 2026",
    "url": "https://www.zacks.com/stock/news/2988485/aaois-optical-networking-demand-rise-can-it-beat-lite-and-cohr"
  }
};

export const nodeById: Record<string, MapNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
