import { forwardRef } from "react";

const Input = forwardRef(function Input(
  { error, className = "", id, "aria-describedby": ariaDescribedBy, ...props },
  ref
) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-xs">
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined}
        className={`rounded-md bg-surface-raised border ${
          error ? "border-negative" : "border-white/[0.08]"
        } px-sm py-xs text-white transition duration ease-premium focus-visible:outline-none focus:border-cobalt/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
