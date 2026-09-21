const loops = [
  {
    path: "AMAZON → ANTHROPIC → AWS",
    title: "Investor and landlord",
    body: "Amazon can invest up to $33B in Anthropic. Anthropic, in turn, commits more than $100B to AWS over ten years and up to 5GW on Trainium.",
    val: "$33B ↻ $100B+",
    note: "Reported commitments; milestone conditions apply.",
  },
  {
    path: "AMAZON → OPENAI → AWS",
    title: "Capital becomes cloud spend",
    body: "Amazon reportedly put $50B into OpenAI's financing alongside a separate $100B cloud arrangement.",
    val: "$50B ↻ $100B",
    note: "Deal structures are distinct; not presented as cash in / cash out equivalence.",
  },
  {
    path: "NVIDIA → CUSTOMERS → NVIDIA",
    title: "The supplier finances demand",
    body: "Nvidia finalized $30B into OpenAI, made a single ~$2B warrant investment in Nebius, and bought another $2B of CoreWeave stock in January 2026.",
    val: "$34B",
    note: "Anthropic IPO-anchor talks remain unfinalized and are excluded.",
  },
  {
    path: "MICROSOFT + META → NEBIUS → NVIDIA",
    title: "Prepayment-driven expansion",
    body: "Nebius says customer prepayments fund 60% of growth. Microsoft and Meta contracts support more than $40B of committed backlog against $530M of 2025 revenue.",
    val: "60%",
    note: "2026 capex guidance rose to $20–25B; customer concentration remains central.",
  },
  {
    path: "OPENAI → ORACLE → STARGATE",
    title: "Ambition meets financing",
    body: "Stargate began as a $500B four-year plan. The widely reported $300B OpenAI–Oracle cloud arrangement originated in reporting before Oracle later disclosed a $30B-a-year contract.",
    val: "$500B plan",
    note: "The reported $1.4T→$600B pledge cut remains unconfirmed and is excluded.",
  },
  {
    path: "HYPERSCALERS → LABS → CLOUD",
    title: "One balance sheet, two stories",
    body: "Investment marks can support lab valuations while the same labs' contracts support cloud backlogs. If model revenue misses, both assets can weaken together.",
    val: "~$770B",
    note: "UBS estimate of combined hyperscaler capex in 2026.",
  },
];

export default function MoneyLoops() {
  return (
    <div>
      <div className="loops-head">
        <div>
          <h2>Where the money circles back</h2>
          <p>
            Investment flows from suppliers and clouds into the labs — and lab spending flows back as cloud
            and chip revenue. Each loop names the reported commitments behind it.
          </p>
        </div>
        <span className="asof-tag">Reported commitments · September 2026</span>
      </div>
      <div className="loop-grid">
        {loops.map((l) => (
          <article className="loop" key={l.path}>
            <div className="loop-path">{l.path}</div>
            <h3>{l.title}</h3>
            <p>{l.body}</p>
            <span className="loop-val">{l.val}</span>
            <small>{l.note}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
