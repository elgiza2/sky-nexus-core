import { useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheckoutSlide({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const distance = useRef(0);
  const [offset, setOffset] = useState(0);
  const reset = () => { start.current = null; distance.current = 0; setOffset(0); };
  return (
    <div ref={track} className="checkout-slide" dir="ltr">
      <span className="checkout-slide-label" dir="rtl">{busy ? "جارِ المعالجة…" : "اسحب للمتابعة"}</span>
      <span className="checkout-slide-arrows" aria-hidden="true"><ChevronLeft /><ChevronLeft /><ChevronLeft /></span>
      <Button variant="ghost" disabled={busy} className="checkout-slide-thumb" aria-label="متابعة" title="متابعة" style={{ transform: `translateX(${offset}px)` }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onConfirm(); } }}
        onPointerDown={(event) => { if (busy) return; start.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (start.current === null || !track.current) return; const max = Math.max(0, track.current.clientWidth - 64); const next = Math.min(0, Math.max(-max, event.clientX - start.current)); distance.current = next; setOffset(next); }}
        onPointerUp={() => { const max = Math.max(0, (track.current?.clientWidth ?? 64) - 64); const confirmed = max > 0 && -distance.current >= max * .85; reset(); if (confirmed) onConfirm(); }}
        onPointerCancel={reset}>
        {busy ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
      </Button>
    </div>
  );
}