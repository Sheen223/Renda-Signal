import Link from "next/link";

export function SiteHeader({ light = false }: { light?: boolean }) {
  return <header className={`site-header ${light ? "light" : ""}`}><Link className="logo" href="/"><span>R</span><strong>RENDA SIGNAL</strong></Link><nav><Link href="/">About</Link><Link href="/explore">Explore</Link></nav><Link className="header-button" href="/explore">Open app <span>↗</span></Link></header>;
}
