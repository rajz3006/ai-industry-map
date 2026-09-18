const risks = [
  { no: "01 / FOUNDRY", title: "Taiwan is the fulcrum", body: "TSMC holds 73% of foundry and is widely cited at more than 90% of advanced logic. Nvidia alone is reported at about 22% of TSMC revenue." },
  { no: "02 / LITHOGRAPHY", title: "There is only one EUV supplier", body: "ASML controls EUV and an estimated 94% of lithography. Standard EUV tools cost roughly $200M and were nearly sold out through 2027." },
  { no: "03 / MEMORY", title: "Three firms gate HBM", body: "SK Hynix is projected at about half of 2026 HBM; Samsung and Micron supply most of the remainder. Qualification does not guarantee volume leadership." },
  { no: "04 / POWER", title: "Chips can arrive before watts", body: "Nuclear restarts and new generation take years. Microsoft's 835MW Three Mile Island PPA targets 2028; Meta's nuclear package reaches up to 6.6GW by 2035." },
  { no: "05 / LEVERAGE", title: "Backlogs fund the buildout", body: "Nebius funds 60% of growth with customer prepayments. CoreWeave entered public markets with $7B+ of private debt and heavy customer concentration." },
  { no: "06 / CIRCULARITY", title: "Suppliers capitalize buyers", body: "Nvidia's investments in Nebius and CoreWeave—and contemplated lab investments—blur customer demand and vendor financing." },
  { no: "07 / CASH FLOW", title: "Capex consumes the cushion", body: "UBS estimated hyperscalers were directing nearly all free cash flow to investment. A rate shock or demand wobble can hit every layer at once." },
  { no: "08 / MISSING MIDDLES", title: "The hidden layers can still stop the stack", body: "Taiwan ODMs, advanced packaging, test, optical modules and rack cooling are less visible than GPUs—but each can throttle deployment." },
];

export default function Fragility() {
  return (
    <div className="risk-grid">
      {risks.map((r) => (
        <article className="risk-card" key={r.no}>
          <span className="risk-no">{r.no}</span>
          <h3>{r.title}</h3>
          <p>{r.body}</p>
        </article>
      ))}
    </div>
  );
}
