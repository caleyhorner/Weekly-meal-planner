// Shown instantly while the next screen loads, so taps never feel ignored.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse" role="status" aria-label="Loading">
      <div className="mt-3 h-9 w-48 rounded-xl bg-surface-2" />
      <div className="mt-2 h-5 w-32 rounded-lg bg-surface-2" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
    </div>
  );
}
