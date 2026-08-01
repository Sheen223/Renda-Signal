import Link from "next/link";
import { SiteHeader } from "./components/site-header";

export default function LandingPage() {
  return (
    <main className="site dark-site">
      <SiteHeader />
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="lime-kicker"><i /> THE OPEN ATTENTION NETWORK</span>
          <h1>Make your<br />message <em>matter.</em></h1>
          <p>Send a public request to anyone on X and fund it with real NIM through Nimiq Pay. They earn for giving it attention and completing the work.</p>
          <div className="hero-actions"><Link className="cta lime" href="/explore">Explore the network <span>↗</span></Link><a className="text-link" href="#how">See how it works ↓</a></div>
          <div className="trust-row"><span>NIMIQ PAY</span><span>REAL NIM</span><span>PUBLIC PROOF</span></div>
        </div>
        <div className="hero-visual"><img src="/hero-signal.png" alt="Renda Signal connects a funded request to a recipient" /></div>
      </section>

      <section className="statement"><span>01 / WHY SIGNAL</span><h2>Cold messages cost nothing.<br />That is why nobody trusts them.</h2><p>Renda Signal lets you put value behind a request before asking for somebody’s time.</p></section>

      <section className="how-grid" id="how">
        <article><span>01</span><div className="step-icon">@</div><h3>Choose who you need</h3><p>Target one verified social account and publish your request where they already spend time.</p></article>
        <article><span>02</span><div className="step-icon">◇</div><h3>Fund with NIM</h3><p>Confirm a native NIM payment inside Nimiq Pay. The blockchain transaction becomes the funding receipt.</p></article>
        <article><span>03</span><div className="step-icon">✓</div><h3>Complete and get paid</h3><p>The verified recipient accepts, submits proof and receives NIM after approval. Disputes share one review room.</p></article>
      </section>

      <section className="mechanism">
        <div><span className="lime-kicker">NATIVE NIM · NIMIQ PAY</span><h2>Attention now.<br /><em>Completion later.</em></h2></div>
        <div className="split-card"><div><small>ATTENTION REWARD</small><strong>10 <b>NIM</b></strong><p>The recipient earns for intentionally accepting the funded request.</p></div><div><small>DELIVERY REWARD</small><strong>190 <b>NIM</b></strong><p>The remainder is released after the employer approves the completed work.</p></div></div>
      </section>

      <section className="final-cta"><h2>Reach the person<br />who can move it forward.</h2><Link className="cta lime" href="/explore">Send your first signal <span>→</span></Link></section>
      <footer><span>RENDA SIGNAL</span><span>Built with Nimiq Pay · Native NIM payments</span></footer>
    </main>
  );
}
