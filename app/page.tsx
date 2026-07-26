"use client";

import { FormEvent, useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  description: string;
  category: string;
  reward: number;
  slots: number;
  filled: number;
  due: string;
  creator: string;
  creatorAddress: string;
  proof: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  verified: boolean;
  accent: string;
};

const starterTasks: Task[] = [
  {
    id: 1,
    title: "Test our Mini App on Android",
    description:
      "Complete the onboarding flow, make a tiny test payment, and send us a screen recording with your honest feedback.",
    category: "App testing",
    reward: 850,
    slots: 12,
    filled: 7,
    due: "2 days",
    creator: "Nimble Studio",
    creatorAddress: "NQ18…7KQ2",
    proof: "Screen recording + 3 feedback notes",
    difficulty: "Easy",
    verified: true,
    accent: "lime",
  },
  {
    id: 2,
    title: "Translate 24 product strings to French",
    description:
      "Help us make our merchant checkout feel native for French speakers. Context and glossary are provided.",
    category: "Translation",
    reward: 2400,
    slots: 3,
    filled: 1,
    due: "4 days",
    creator: "Blue Cart",
    creatorAddress: "NQ72…C90P",
    proof: "Completed translation sheet",
    difficulty: "Medium",
    verified: true,
    accent: "violet",
  },
  {
    id: 3,
    title: "Create a 30-second product walkthrough",
    description:
      "Record a clear vertical video showing how to create and pay a NIM invoice. Voiceover or captions required.",
    category: "Content",
    reward: 5000,
    slots: 5,
    filled: 4,
    due: "18 hours",
    creator: "NimPay",
    creatorAddress: "NQ04…L8WY",
    proof: "Public video link",
    difficulty: "Advanced",
    verified: true,
    accent: "orange",
  },
  {
    id: 4,
    title: "Find three confusing moments in our checkout",
    description:
      "Think aloud while trying our checkout for the first time. We want friction, not compliments.",
    category: "User research",
    reward: 1200,
    slots: 20,
    filled: 8,
    due: "6 days",
    creator: "PayLocal",
    creatorAddress: "NQ55…2DFA",
    proof: "Written notes or a voice recording",
    difficulty: "Easy",
    verified: false,
    accent: "blue",
  },
];

const categories = ["All tasks", "App testing", "Content", "Translation", "User research", "Design"];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [view, setView] = useState<"discover" | "work" | "create">("discover");
  const [role, setRole] = useState<"tasker" | "creator">("tasker");
  const [category, setCategory] = useState("All tasks");
  const [query, setQuery] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState(starterTasks);
  const [joined, setJoined] = useState<number[]>([]);
  const [notice, setNotice] = useState("");

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const inCategory = category === "All tasks" || task.category === category;
      const inSearch = !normalized || `${task.title} ${task.creator} ${task.category}`.toLowerCase().includes(normalized);
      return inCategory && inSearch;
    });
  }, [category, query, tasks]);

  async function connectWallet() {
    setWalletBusy(true);
    setNotice("");
    try {
      const { init } = await import("@nimiq/mini-app-sdk");
      const nimiq = await init();
      const accounts = await nimiq.listAccounts();
      if (!accounts[0]) throw new Error("No account shared");
      setWallet(accounts[0]);
    } catch {
      setWallet("NQ42 PREV IEW0 0000 0000 0000 0000 0000 0000");
      setNotice("Preview wallet connected. Open inside Nimiq Pay for a real account.");
    } finally {
      setWalletBusy(false);
    }
  }

  function reserveTask(task: Task) {
    if (!wallet) {
      setNotice("Connect your Nimiq Pay wallet before reserving a task.");
      return;
    }
    if (!joined.includes(task.id)) setJoined((items) => [...items, task.id]);
    setSelectedTask(null);
    setView("work");
    setNotice("Task reserved. Your slot is held for 24 hours while you get started.");
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const task: Task = {
      id: Date.now(),
      title,
      description: String(form.get("description") || ""),
      category: String(form.get("category") || "App testing"),
      reward: Number(form.get("reward") || 500),
      slots: Number(form.get("slots") || 1),
      filled: 0,
      due: String(form.get("deadline") || "7 days"),
      creator: "You",
      creatorAddress: wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Wallet required",
      proof: String(form.get("proof") || "Work link or written evidence"),
      difficulty: "Easy",
      verified: false,
      accent: "lime",
    };
    setTasks((items) => [task, ...items]);
    setView("discover");
    setRole("tasker");
    setNotice("Draft task published in preview mode. Funding escrow is the next step.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("discover")} aria-label="Nimiq Quest home">
          <span className="brand-mark">Q</span>
          <span>Nimiq Quest</span>
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}>Discover</button>
          <button className={view === "work" ? "active" : ""} onClick={() => setView("work")}>My work</button>
          <button className={view === "create" ? "active" : ""} onClick={() => setView("create")}>Create a task</button>
        </nav>

        <button className={`wallet-button ${wallet ? "connected" : ""}`} onClick={connectWallet} disabled={walletBusy}>
          <span className="status-dot" />
          {walletBusy ? "Connecting…" : wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect wallet"}
        </button>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message">×</button>
        </div>
      )}

      {view === "discover" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><i /> Work moves at internet speed</span>
              <h1>Small tasks.<br /><em>Real</em> NIM.</h1>
              <p>Discover useful work from builders across the Nimiq ecosystem. Complete it, prove it, get paid.</p>
              <div className="hero-actions">
                <button className="primary-action" onClick={() => document.getElementById("task-grid")?.scrollIntoView({ behavior: "smooth" })}>Find a task <span>↘</span></button>
                <button className="text-action" onClick={() => { setRole("creator"); setView("create"); }}>Post work <span>→</span></button>
              </div>
            </div>

            <div className="hero-board" aria-label="Live marketplace statistics">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="coin coin-main">N</div>
              <div className="float-card card-top"><small>PAID THIS WEEK</small><strong>184,250 <span>NIM</span></strong></div>
              <div className="float-card card-bottom"><span className="avatar-stack"><b>A</b><b>M</b><b>K</b></span><strong>438 taskers</strong><small>ready to work</small></div>
              <span className="spark spark-one">✦</span><span className="spark spark-two">✦</span>
            </div>
          </section>

          <section className="market-section" id="task-grid">
            <div className="section-heading">
              <div><span className="kicker">OPEN MARKETPLACE</span><h2>Work worth doing</h2></div>
              <div className="role-switch" aria-label="Choose marketplace role">
                <button className={role === "tasker" ? "selected" : ""} onClick={() => setRole("tasker")}>I’m a tasker</button>
                <button className={role === "creator" ? "selected" : ""} onClick={() => { setRole("creator"); setView("create"); }}>I create tasks</button>
              </div>
            </div>

            <div className="filters">
              <div className="category-row">
                {categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label>
            </div>

            <div className="task-grid">
              {filteredTasks.map((task) => (
                <article className="task-card" key={task.id} onClick={() => setSelectedTask(task)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setSelectedTask(task)}>
                  <div className="task-card-top">
                    <span className={`category-icon ${task.accent}`}>{task.category.slice(0, 1)}</span>
                    <span className="difficulty">{task.difficulty}</span>
                  </div>
                  <span className="category-label">{task.category}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className="creator-row"><span className="creator-avatar">{task.creator.slice(0, 1)}</span><span>{task.creator}</span>{task.verified && <span className="verified" title="Verified creator">✓</span>}</div>
                  <div className="task-meta"><span>◷ {task.due}</span><span>{task.slots - task.filled} spots left</span></div>
                  <div className="reward-row"><div><small>REWARD</small><strong>{compactNumber(task.reward)} <span>NIM</span></strong></div><button aria-label={`View ${task.title}`}>↗</button></div>
                </article>
              ))}
            </div>
          </section>

          <section className="how-section">
            <span className="kicker">HOW IT WORKS</span>
            <h2>From skill to payment<br />in three clear steps.</h2>
            <div className="steps">
              <article><span>01</span><i>⌕</i><h3>Find your fit</h3><p>Browse clear, fixed-scope tasks from verified ecosystem builders.</p></article>
              <article><span>02</span><i>↗</i><h3>Do the work</h3><p>Reserve a slot, follow the brief, and submit the requested evidence.</p></article>
              <article><span>03</span><i>✓</i><h3>Get paid in NIM</h3><p>Approved work is paid directly to the wallet you control.</p></article>
            </div>
          </section>
        </>
      )}

      {view === "work" && (
        <section className="workspace-page">
          <span className="kicker">TASKER WORKSPACE</span><h1>Your work</h1><p className="page-lede">Everything you reserved, submitted, and earned.</p>
          <div className="stat-row"><div><small>IN PROGRESS</small><strong>{joined.length}</strong></div><div><small>AWAITING REVIEW</small><strong>0</strong></div><div><small>TOTAL EARNED</small><strong>0 <span>NIM</span></strong></div></div>
          {joined.length ? <div className="work-list">{tasks.filter((task) => joined.includes(task.id)).map((task) => <article key={task.id}><span className={`category-icon ${task.accent}`}>{task.category[0]}</span><div><small>{task.category}</small><h3>{task.title}</h3><p>Reserved · submit before {task.due}</p></div><div className="work-reward"><strong>{compactNumber(task.reward)} NIM</strong><button onClick={() => setSelectedTask(task)}>Open task</button></div></article>)}</div> : <div className="empty-state"><span>↘</span><h2>No reserved tasks yet</h2><p>Find a task that matches your skills and claim a spot.</p><button className="primary-action" onClick={() => setView("discover")}>Browse tasks</button></div>}
        </section>
      )}

      {view === "create" && (
        <section className="create-page">
          <div className="create-intro"><span className="kicker">CREATOR STUDIO</span><h1>Turn a clear brief<br />into <em>finished work.</em></h1><p>Set the scope, fund the reward, and review real contributions from the Nimiq community.</p><div className="funding-note"><span>◎</span><div><strong>Rewards stay accountable</strong><p>Your task budget is shown before publishing. On-chain funding comes next.</p></div></div></div>
          <form className="task-form" onSubmit={createTask}>
            <div className="form-heading"><span>NEW TASK</span><strong>01 / 03</strong></div>
            <label>Task title<input name="title" required placeholder="e.g. Test our checkout on Android" maxLength={80} /></label>
            <label>What needs to be done?<textarea name="description" required placeholder="Describe the outcome, important steps, and what a good submission looks like." rows={5} /></label>
            <div className="field-pair"><label>Category<select name="category"><option>App testing</option><option>Content</option><option>Translation</option><option>User research</option><option>Design</option></select></label><label>Deadline<select name="deadline"><option>24 hours</option><option>3 days</option><option>7 days</option><option>14 days</option></select></label></div>
            <label>Required evidence<input name="proof" required placeholder="e.g. Screen recording + three feedback notes" /></label>
            <div className="field-pair"><label>Reward per tasker<div className="amount-input"><input name="reward" type="number" min="1" defaultValue="500" /><span>NIM</span></div></label><label>Available slots<input name="slots" type="number" min="1" max="100" defaultValue="5" /></label></div>
            <div className="form-total"><span>Maximum task budget</span><strong>2,500 NIM</strong></div>
            <button className="primary-action submit-task" type="submit">Review & publish <span>→</span></button>
          </form>
        </section>
      )}

      <footer><div className="brand"><span className="brand-mark">Q</span><span>Nimiq Quest</span></div><p>Useful work, paid openly.</p><span>Built for Nimiq Pay</span></footer>

      <nav className="mobile-nav"><button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}><span>⌕</span>Discover</button><button className={view === "work" ? "active" : ""} onClick={() => setView("work")}><span>◫</span>My work</button><button className={view === "create" ? "active" : ""} onClick={() => setView("create")}><span>＋</span>Create</button></nav>

      {selectedTask && (
        <div className="dialog-backdrop" onMouseDown={() => setSelectedTask(null)}>
          <section className="task-dialog" role="dialog" aria-modal="true" aria-label={selectedTask.title} onMouseDown={(event) => event.stopPropagation()}>
            <button className="dialog-close" onClick={() => setSelectedTask(null)} aria-label="Close task">×</button>
            <span className={`category-icon ${selectedTask.accent}`}>{selectedTask.category[0]}</span><span className="category-label">{selectedTask.category}</span>
            <h2>{selectedTask.title}</h2><p>{selectedTask.description}</p>
            <div className="brief-grid"><div><small>REWARD</small><strong>{compactNumber(selectedTask.reward)} NIM</strong></div><div><small>DEADLINE</small><strong>{selectedTask.due}</strong></div><div><small>OPEN SPOTS</small><strong>{selectedTask.slots - selectedTask.filled}</strong></div><div><small>PROOF</small><strong>{selectedTask.proof}</strong></div></div>
            <div className="creator-panel"><span className="creator-avatar">{selectedTask.creator[0]}</span><div><small>CREATED BY</small><strong>{selectedTask.creator} {selectedTask.verified && "✓"}</strong><span>{selectedTask.creatorAddress}</span></div></div>
            <button className="primary-action dialog-action" onClick={() => reserveTask(selectedTask)}>{joined.includes(selectedTask.id) ? "Already reserved" : "Reserve this task"}<span>→</span></button>
            <small className="fine-print">Reserving holds one slot for 24 hours. No wallet transaction is made yet.</small>
          </section>
        </div>
      )}
    </main>
  );
}
