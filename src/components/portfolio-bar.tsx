import Link from "next/link";
import { ArrowLeft, Workflow } from "lucide-react";

const PORTFOLIO_URL = "https://portfolio-hub-flax.vercel.app";

export function PortfolioBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-[#39ff14]/20 bg-[#050805]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href={PORTFOLIO_URL}
          className="inline-flex items-center gap-2 text-sm text-[#39ff14]/60 transition hover:text-[#39ff14] focus-visible:ring-2 focus-visible:ring-[#39ff14]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Portfolio
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#39ff14]">
          <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
          FlowForge · Automation
        </span>
      </div>
    </div>
  );
}
