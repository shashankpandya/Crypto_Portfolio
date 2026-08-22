export default function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-sm rounded-lg border border-white/[0.06] bg-surface px-lg py-xl text-center ${className}`}
    >
      {icon && (
        <div aria-hidden="true" className="text-3xl text-muted">
          {icon}
        </div>
      )}
      {title && <p className="text-lg font-medium text-white">{title}</p>}
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-xs">{action}</div>}
    </div>
  );
}
