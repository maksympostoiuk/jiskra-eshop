import { cn } from "@/lib/cn";

/** Four-point "spark" glyph used in the wordmark and the favicon. */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 0c.9 6.2 5.8 11.1 12 12-6.2.9-11.1 5.8-12 12-.9-6.2-5.8-11.1-12-12C6.2 11.1 11.1 6.2 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Text wordmark: lowercase serif "jiskra" with an amber spark. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-start font-display text-[1.7rem] leading-none font-semibold tracking-tight",
        inverted ? "text-white" : "text-ink",
        className,
      )}
    >
      jiskra
      <SparkIcon className="ml-0.5 -mt-1 size-[0.55em] text-spark" />
    </span>
  );
}
