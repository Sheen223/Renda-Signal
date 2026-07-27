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
          <p>Send a public, funded request to anyone online. They earn for giving it attention. Your completion reward stays protected until the work is done.</p>
          <div className="hero-actions"><Link className="cta lime" href="/explore">Explore the network <span>↗</span></Link><a className="text-link" href="#how">See how it works ↓</a></div>
          <div className="trust-row"><span>POLYGON USDT</span><span>NIMIQ PAY</span><span>PUBLIC PROOF</span></div>
        </div>
        <div className="hero-visual"><img src="/hero-signal.png" alt="Renda Signal connects a funded request to a recipient" /></div>
      </section>

      <section className="statement"><span>01 / WHY SIGNAL</span><h2>Cold messages cost nothing.<br />That is why nobody trusts them.</h2><p>Renda Signal lets you put value behind a request before asking for somebody’s time.</p></section>

      <section className="how-grid" id="how">
        <article><span>01</span><div className="step-icon">@</div><h3>Choose who you need</h3><p>Target one verified social account and publish your request where they already spend time.</p></article>
        <article><span>02</span><div className="step-icon">◇</div><h3>Fund the signal</h3><p>Lock Polygon USDT in a two-stage escrow through your Nimiq Pay wallet.</p></article>
        <article><span>03</span><div className="step-icon">✓</div><h3>Settle with proof</h3><p>Accept, deliver and release. If there is disagreement, funds remain protected for arbitration.</p></article>
      </section>

      <section className="mechanism">
        <div><span className="lime-kicker">ONE REQUEST · TWO PAYMENTS</span><h2>Attention now.<br /><em>Completion later.</em></h2></div>
        <div className="split-card"><div><small>PAID ON ACCEPTANCE</small><strong>1.00 <b>USDT</b></strong><p>The recipient is paid for intentionally opening and accepting your request.</p></div><div><small>HELD FOR DELIVERY</small><strong>9.00 <b>USDT</b></strong><p>The rest remains locked until approval, mutual settlement or arbitration.</p></div></div>
      </section>

      <section className="final-cta"><h2>Reach the person<br />who can move it forward.</h2><Link className="cta lime" href="/explore">Send your first signal <span>→</span></Link></section>
      <footer><span>RENDA SIGNAL</span><span>Built as a Nimiq Pay Mini App · Polygon USDT</span></footer>
    </main>
  );
}
