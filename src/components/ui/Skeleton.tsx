interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

function SkeletonBlock({ width, height, className = "" }: Omit<SkeletonProps, "lines">) {
  return (
    <div
      className={["animate-shimmer rounded-[var(--radius-sm)]", className].join(" ")}
      style={{
        width: width !== undefined ? width : "100%",
        height: height !== undefined ? height : "1em",
      }}
      aria-hidden="true"
    />
  );
}

export function Skeleton({ width, height, className = "", lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading…">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock
            key={i}
            height={height ?? "1.1em"}
            /* Last line is shorter to mimic real text */
            width={i === lines - 1 ? "66%" : "100%"}
            className={className}
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading…">
      <SkeletonBlock width={width} height={height} className={className} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
