import React, { useMemo } from "react";
import { prefersReducedMotion } from "../../utils/tokens";

/**
 * LedgerTicker — the app's signature element. A persistent, scrolling
 * monospace strip of live prices styled after an exchange ticker tape /
 * block-explorer feed, reinforcing the "ledger" identity everywhere, not
 * just on the landing page. Renders nothing until real coin data exists —
 * never fabricates numbers.
 */
const LedgerTicker = ({ coins }) => {
  const entries = useMemo(() => (coins || []).slice(0, 14), [coins]);
  const reduced = prefersReducedMotion();

  if (entries.length === 0) return null;

  const renderEntries = (keyPrefix) =>
    entries.map((coin) => {
      const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;
      return (
        <span key={`${keyPrefix}-${coin.id}`} className="inline-flex items-center gap-2 px-5 py-1.5 whitespace-nowrap">
          <span className="text-[10px] font-mono font-medium text-slate-500 uppercase">{coin.symbol}</span>
          <span className="text-[10px] font-mono font-semibold text-slate-300">
            ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "—"}
          </span>
          <span className={`text-[10px] font-mono font-semibold ${isPositive ? "text-positive" : "text-negative"}`}>
            {isPositive ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
          </span>
          <span className="text-slate-700" aria-hidden="true">·</span>
        </span>
      );
    });

  return (
    <div
      className="sticky top-14 z-40 w-full h-8 border-b border-white/5 bg-surface/80 backdrop-blur-md overflow-hidden flex items-center"
      role="marquee"
      aria-label="Live market ticker"
    >
      {reduced ? (
        <div className="flex overflow-x-auto no-scrollbar">{renderEntries("static")}</div>
      ) : (
        <div className="flex animate-ticker">
          {renderEntries("a")}
          {renderEntries("b")}
        </div>
      )}
    </div>
  );
};

export default LedgerTicker;
