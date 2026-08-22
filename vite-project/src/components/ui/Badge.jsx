const VARIANTS = {
  neutral: "bg-white/[0.06] text-white border-white/[0.08]",
  positive: "bg-positive/10 text-positive border-positive/20",
  negative: "bg-negative/10 text-negative border-negative/20",
  cobalt: "bg-cobalt/10 text-cobalt border-cobalt/20",
};

export default function Badge({ variant = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-xs py-0.5 text-xs font-medium ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
