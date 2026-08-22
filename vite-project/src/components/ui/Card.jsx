export default function Card({ interactive = false, className = "", children, ...props }) {
  const base =
    "rounded-lg border border-white/[0.06] bg-gradient-to-b from-surface to-base shadow-[0_4px_24px_0_rgba(0,0,0,0.4)] transition duration ease-premium";
  const hover = interactive
    ? "hover:-translate-y-px hover:border-white/[0.12] hover:shadow-[0_12px_32px_0_rgba(255,56,92,0.02),0_4px_24px_0_rgba(0,0,0,0.45)]"
    : "hover:border-white/[0.12]";

  return (
    <div className={`${base} ${hover} ${className}`} {...props}>
      {children}
    </div>
  );
}
