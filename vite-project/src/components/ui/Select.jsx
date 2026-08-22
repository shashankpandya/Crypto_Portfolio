import { forwardRef } from "react";

const Select = forwardRef(function Select({ className = "", children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`rounded-md bg-surface-raised border border-white/[0.08] px-sm py-xs text-white transition duration ease-premium focus-visible:outline-none focus:border-cobalt/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
