export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 bg-sunk rounded-sm" />
      <div className="h-4 w-96 max-w-full bg-sunk rounded-sm" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-sunk rounded-sm" />)}</div>
    </div>
  );
}
