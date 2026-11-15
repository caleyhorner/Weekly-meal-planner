/** Small square picture for recipe lists: cover photo, else the first imported photo, else a letter tile. */
export function RecipeThumb({
  imageKey,
  title,
  size = 64,
}: {
  imageKey: string | null;
  title: string;
  size?: 40 | 64;
}) {
  const box = size === 40 ? "h-10 w-10 rounded-lg text-base" : "h-16 w-16 rounded-xl text-2xl";
  if (imageKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private images served by our own route
      <img
        src={`/api/images/${imageKey}?w=${size === 40 ? 96 : 160}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`${box} shrink-0 bg-surface-2 object-cover`}
      />
    );
  }
  return (
    <span aria-hidden className={`${box} flex shrink-0 items-center justify-center bg-surface-2 font-extrabold text-muted`}>
      {title.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
