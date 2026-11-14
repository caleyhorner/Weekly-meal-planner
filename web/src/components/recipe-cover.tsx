import { cardColours } from "@/lib/format";

/** Food photo if there is one, otherwise a coloured card with the recipe's initial. */
export function RecipeCover({
  title,
  imageKey,
  className = "",
  large = false,
}: {
  title: string;
  imageKey: string | null;
  className?: string;
  large?: boolean;
}) {
  if (imageKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private images served via our own route
      <img
        src={`/api/images/${imageKey}`}
        alt=""
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  const { fg, bg } = cardColours(title);
  const initial = title.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden
      className={`flex h-full w-full items-center justify-center font-serif font-semibold ${
        large ? "text-8xl" : "text-5xl"
      } ${className}`}
      style={{ background: bg, color: fg }}
    >
      {initial}
    </div>
  );
}
