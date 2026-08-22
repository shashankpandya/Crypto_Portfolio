export default function Skeleton({ className = "", ...props }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse rounded-md bg-white/[0.06] ${className}`}
      {...props}
    />
  );
}
