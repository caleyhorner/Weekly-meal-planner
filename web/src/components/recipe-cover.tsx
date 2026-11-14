/** A recipe photo, or a plain "no photo" tile. Used by the cover picker on the edit form. */
export function RecipeCover({ imageKey, className = "" }: { imageKey: string | null; className?: string }) {
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
  return (
    <div className={`flex h-full w-full items-center justify-center bg-surface-2 text-sm font-bold text-muted ${className}`}>
      No photo
    </div>
  );
}
