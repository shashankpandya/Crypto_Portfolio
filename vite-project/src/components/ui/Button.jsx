const VARIANTS = {
  primary:
    "bg-signal text-ink font-semibold shadow-[0_4px_16px_0_rgba(34,217,138,0.25)] hover:opacity-95 hover:shadow-[0_6px_20px_0_rgba(34,217,138,0.4)] hover:-translate-y-px active:translate-y-0",
  secondary:
    "bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.06] hover:border-white/[0.15] hover:-translate-y-px",
};

export default function Button({
  variant = "primary",
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-md py-xs font-medium transition duration ease-premium focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
