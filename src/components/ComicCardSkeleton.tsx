export default function ComicCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-[#12121a] border border-white/[0.04]">
      <div className="aspect-[3/4.2] skeleton" />
      <div className="p-2.5 space-y-2">
        <div className="h-3.5 skeleton w-3/4 rounded" />
        <div className="h-2.5 skeleton w-1/2 rounded" />
      </div>
    </div>
  );
}

export function UpdateCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[#12121a] border border-white/[0.04]">
      <div className="shrink-0 w-[60px] h-[80px] rounded-md skeleton" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 skeleton w-3/4 rounded" />
        <div className="h-2.5 skeleton w-16 rounded" />
        <div className="h-6 skeleton w-24 rounded mt-2" />
      </div>
    </div>
  );
}

export function RecommendCardSkeleton() {
  return (
    <div className="shrink-0 w-[140px] sm:w-[160px] rounded-lg overflow-hidden">
      <div className="aspect-[3/4] skeleton rounded-lg" />
    </div>
  );
}
