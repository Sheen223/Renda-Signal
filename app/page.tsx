"use client";

import { FormEvent, useMemo, useState } from "react";

type SignalStatus = "funded" | "accepted" | "submitted" | "paid" | "disputed";
type Signal = {
  id: string;
  sender: string;
  target: string;
  title: string;
  brief: string;
  amount: number;
  attentionFee: number;
  due: string;
  status: SignalStatus;
  proof?: string;
};

const sampleSignals: Signal[] = [
  { id: "SIG-1042", sender: "@somiari", target: "@david", title: "Review my Nimiq onboarding", brief: "Try the mobile onboarding and share three specific improvements in an X reply.", amount: 10, attentionFee: 1, due: "29 Jul, 18:00", status: "funded" },
  { id: "SIG-1038", sender: "@nimstudio", target: "@david", title: "Give us a developer reality check", brief: "Read our SDK quickstart and tell us the first point where the instructions become unclear.", amount: 6, attentionFee: 1, due: "30 Jul, 12:00", status: "accepted" },
  { id: "SIG-1029", sender: "@bluecart", target: "@david", title: "Comment on our merchant flow", brief: "Record a short screen review covering checkout clarity and payment confidence.", amount: 15, attentionFee: 2, due: "28 Jul, 21:00", status: "submitted", proof: "x.com/david/status/19042" },
];

const statusCopy: Record<SignalStatus, string> = { funded: "Waiting for you", accepted: "In progress", submitted: "Under review", paid: "Paid", disputed: "In arbitration" };

function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }

export default function Home() {
  const [screen, setScreen] = useState<"inbox" | "sent" | "create">("inbox");
  const [signals, setSignals] = useState(sampleSignals);
  const [selectedId, setSelectedId] = useState("SIG-1042");
  const [xUser, setXUser] = useState("@david");
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState("");
  const [proof, setProof] = useState("");

  const selected = useMemo(() => signals.find((item) => item.id === selectedId) ?? signals[0], [selectedId, signals]);
  const inbox = signals.filter((item) => item.target === xUser);
  const sent = signals.filter((item) => item.sender === xUser);

  async function connectWallet() {
    try {
      const provider = (window as unknown as { ethereum?: { request(args: { method: string }): Promise<string[]> } }).ethereum;
      if (!provider) throw new Error("preview");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts[0]) throw new Error("No account selected");
      setWallet(accounts[0]);
      setNotice("Polygon wallet connected through Nimiq Pay.");
    } catch {
      setWallet("0x7A91b639Bca892F739d6149E30c92E722f2A184c");
      setNotice("Preview wallet connected. Open inside Nimiq Pay for your real Polygon account.");
    }
  }

  function updateStatus(status: SignalStatus, extra: Partial<Signal> = {}) {
    setSignals((items) => items.map((item) => item.id === selected.id ? { ...item, status, ...extra } : item));
  }

  function acceptSignal() {
    if (!wallet) { setNotice("Connect the wallet that should receive this USDT first."); return; }
    updateStatus("accepted");
    setNotice(`Accepted. ${selected.attentionFee.toFixed(2)} USDT attention fee is ready for confirmation.`);
  }

  function submitEvidence(event: FormEvent) {
    event.preventDefault();
    if (!proof.trim()) { setNotice("Add a public reply or delivery link."); return; }
    updateStatus("submitted", { proof: proof.trim() });
    setProof("");
    setNotice("Evidence submitted and timestamped for review.");
  }

  function createSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = String(form.get("target") || "").trim();
    const title = String(form.get("title") || "").trim();
    if (!target || !title) return;
    const amount = Number(form.get("amount") || 10);
    const item: Signal = {
      id: `SIG-${Math.floor(1100 + Math.random() * 800)}`,
      sender: xUser,
      target: target.startsWith("@") ? target : `@${target}`,
      title,
      brief: String(form.get("brief") || ""),
      amount,
      attentionFee: Number(form.get("attentionFee") || 1),
      due: String(form.get("due") || "31 Jul, 18:00"),
      status: "funded",
    };
    setSignals((items) => [item, ...items]);
    setSelectedId(item.id);
    setScreen("sent");
    setNotice("Signal drafted. Fund it in Nimiq Pay, then publish the prepared X mention.");
    event.currentTarget.reset();
  }

  return (
    <main className="signal-app">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("inbox")}><span className="brand-glyph">R</span><span>Renda <b>Signal</b></span></button>
        <nav aria-label="Main navigation">
          <button className={screen === "inbox" ? "active" : ""} onClick={() => setScreen("inbox")}>For me <i>{inbox.length}</i></button>
          <button className={screen === "sent" ? "active" : ""} onClick={() => setScreen("sent")}>Sent</button>
          <button className={screen === "create" ? "active" : ""} onClick={() => setScreen("create")}>New signal</button>
        </nav>
        <div className="identity-actions">
          <button className="x-account" onClick={() => setXUser(xUser ? "@david" : "@david")}><span>𝕏</span>{xUser}</button>
          <button className="wallet" onClick={connectWallet}>{wallet ? shortAddress(wallet) : "Connect wallet"}</button>
        </div>
      </header>

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {screen !== "create" && (
        <section className="workspace">
          <aside className="request-list">
            <div className="list-heading">
              <span className="eyebrow">{screen === "inbox" ? "DIRECTED AT YOU" : "CREATED BY YOU"}</span>
              <h1>{screen === "inbox" ? "Your attention has value." : "Signals you sent."}</h1>
              <p>{screen === "inbox" ? "Funded requests from people who want a moment of your time." : "Track acceptance, delivery and settlement in one place."}</p>
            </div>
            <div className="list-items">
              {(screen === "inbox" ? inbox : sent).length === 0 && <div className="empty"><strong>No signals here yet.</strong><button onClick={() => setScreen("create")}>Create the first one →</button></div>}
              {(screen === "inbox" ? inbox : sent).map((item) => (
                <button key={item.id} className={`request-row ${selected.id === item.id ? "selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                  <span className={`state-dot ${item.status}`} />
                  <span className="row-copy"><small>{screen === "inbox" ? item.sender : item.target}</small><strong>{item.title}</strong><em>{statusCopy[item.status]} · {item.due}</em></span>
                  <span className="row-amount"><strong>${item.amount}</strong><small>USDT</small></span>
                </button>
              ))}
            </div>
          </aside>

          <article className="request-detail">
            <div className="detail-top"><span>{selected.id}</span><span className={`status-pill ${selected.status}`}>{statusCopy[selected.status]}</span></div>
            <div className="people-line"><span className="avatar">{selected.sender[1]?.toUpperCase()}</span><div><small>FROM</small><strong>{selected.sender}</strong></div><span className="arrow">→</span><span className="avatar target">{selected.target[1]?.toUpperCase()}</span><div><small>FOR</small><strong>{selected.target}</strong></div></div>
            <h2>{selected.title}</h2>
            <p className="brief">{selected.brief}</p>
            <div className="money-card">
              <div><small>TOTAL FUNDED</small><strong>{selected.amount.toFixed(2)} <span>USDT</span></strong></div>
              <div><small>PAID ON ACCEPT</small><strong>{selected.attentionFee.toFixed(2)} <span>USDT</span></strong></div>
              <div><small>PAID ON DELIVERY</small><strong>{(selected.amount - selected.attentionFee).toFixed(2)} <span>USDT</span></strong></div>
            </div>
            <div className="terms"><div><small>DELIVER BY</small><strong>{selected.due}</strong></div><div><small>CONVERSATION</small><strong>Public X reply</strong></div><div><small>ARBITRATION</small><strong>Renda panel</strong></div></div>

            {selected.status === "funded" && <div className="action-panel"><h3>This request is funded.</h3><p>Accepting permanently links your connected Polygon wallet to this request.</p><div><button className="secondary" onClick={() => setNotice("Request declined. No funds moved.")}>Decline</button><button className="primary" onClick={acceptSignal}>Accept & earn ${selected.attentionFee}</button></div></div>}
            {selected.status === "accepted" && <form className="delivery-form" onSubmit={submitEvidence}><h3>Submit the work</h3><p>Reply on X, then attach the public URL. Screenshots can be added as supporting evidence.</p><label>Public reply or delivery URL<input value={proof} onChange={(event) => setProof(event.target.value)} placeholder="https://x.com/yourname/status/…" /></label><label className="upload-box"><input type="file" accept="image/*" /><span>＋</span><strong>Add screenshots</strong><small>PNG or JPG · evidence only</small></label><button className="primary" type="submit">Submit evidence</button></form>}
            {selected.status === "submitted" && <div className="action-panel review"><h3>Evidence submitted</h3><a href={`https://${selected.proof}`} target="_blank" rel="noreferrer">{selected.proof} ↗</a><p>The sender can approve payment, request a revision, or open arbitration.</p><div><button className="secondary" onClick={() => { updateStatus("disputed"); setNotice("Arbitration opened. Funds remain locked."); }}>Open dispute</button><button className="primary" onClick={() => { updateStatus("paid"); setNotice("Release approved. The completion reward is ready for Polygon confirmation."); }}>Approve & release</button></div></div>}
            {selected.status === "paid" && <div className="paid-panel"><span>✓</span><div><small>SETTLED ON POLYGON</small><h3>{selected.amount.toFixed(2)} USDT paid to {selected.target}</h3><p>Identity, evidence and settlement remain publicly verifiable.</p></div></div>}
            {selected.status === "disputed" && <div className="action-panel dispute"><h3>Funds are frozen for arbitration</h3><p>The arbitrator can refund the sender, release to the recipient, or split the remaining balance.</p><button className="secondary" onClick={() => setNotice("A mutual settlement proposal was created. The other party must sign it.")}>Propose mutual settlement</button></div>}
          </article>
        </section>
      )}

      {screen === "create" && (
        <section className="create-screen">
          <div className="create-copy"><span className="eyebrow">MAKE YOUR MESSAGE MATTER</span><h1>Send a<br /><em>Signal.</em></h1><p>Make a public, funded request to anyone on X. They earn for accepting your message and completing the agreed work.</p><ol><li><span>1</span>Target one verified X account</li><li><span>2</span>Lock Polygon USDT in escrow</li><li><span>3</span>Share the funded request publicly</li></ol></div>
          <form className="signal-form" onSubmit={createSignal}>
            <div className="form-head"><span>NEW TARGETED REQUEST</span><b>Polygon · USDT</b></div>
            <label>Who do you want to reach?<div className="x-input"><span>𝕏</span><input name="target" placeholder="@username" required /></div></label>
            <label>What do you need?<input name="title" placeholder="Review my Nimiq onboarding" required maxLength={80} /></label>
            <label>Clear terms<textarea name="brief" placeholder="Describe the exact deliverable and what counts as complete…" required rows={4} /></label>
            <div className="two-fields"><label>Total reward<div className="money-input"><input name="amount" type="number" min="1" step="0.1" defaultValue="10" /><span>USDT</span></div></label><label>Attention fee<div className="money-input"><input name="attentionFee" type="number" min="0" step="0.1" defaultValue="1" /><span>USDT</span></div></label></div>
            <label>Completion deadline<input name="due" type="datetime-local" required /></label>
            <div className="escrow-note"><span>⌾</span><div><strong>Protected by two-stage escrow</strong><p>The attention fee is released on acceptance. The remaining reward stays locked until approval, mutual settlement or arbitration.</p></div></div>
            <button className="primary fund-button" type="submit">Review & fund request <span>→</span></button>
          </form>
        </section>
      )}
    </main>
  );
}
