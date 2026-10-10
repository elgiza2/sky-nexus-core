/** Live card face for the checkout card step: the brand mark follows the number
 *  being typed, and the number and holder name are printed on the card itself. */

export type CardBrand = "visa" | "mastercard" | "meeza" | null;

export function detectCardBrand(value: string): CardBrand {
  const n = value.replace(/\D/g, "");
  if (!n) return null;
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^62/.test(n)) return "meeza";
  return null;
}

export function BrandMark({ brand, className = "" }: { brand: CardBrand; className?: string }) {
  switch (brand) {
    case "visa":
      return <span className={`payment-visa ${className}`}>VISA</span>;
    case "mastercard":
      return (
        <svg viewBox="0 0 32 20" className={`h-[26px] w-[42px] ${className}`} aria-hidden="true">
          <circle cx="11" cy="10" r="9" className="payment-red" />
          <circle cx="21" cy="10" r="9" className="payment-yellow" />
          <path d="M16 2.5a9 9 0 0 1 0 15 9 9 0 0 1 0-15z" className="payment-orange" />
        </svg>
      );
    case "meeza":
      return (
        <svg viewBox="0 0 24 24" className={`h-[22px] w-[22px] ${className}`} aria-hidden="true">
          <path className="payment-green" d="M12 2 3 7v10l9 5 9-5V7z" />
          <path className="payment-white" d="M8 14.5V9.8l4 3 4-3v4.7" />
        </svg>
      );
    default:
      return (
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border border-foreground/15 ${className}`}
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
        </span>
      );
  }
}

function pad(digits: string, length: number) {
  return digits.length >= length ? digits.slice(0, length) : digits + "•".repeat(length - digits.length);
}

export function CardPreview({
  number,
  name,
  month,
  year,
  fallbackBrand,
}: {
  number: string;
  name: string;
  month: string;
  year: string;
  fallbackBrand: CardBrand;
}) {
  const digits = number.replace(/\D/g, "");
  const brand = detectCardBrand(digits) ?? fallbackBrand;
  const groups = pad(digits, 16).match(/.{1,4}/g) ?? [];
  const holder = name.trim();

  return (
    <div className="card-face glass-appear p-6" dir="ltr">
      <div className="flex items-start justify-between">
        <span className="card-chip" aria-hidden="true" />
        <BrandMark brand={brand} />
      </div>
      <p
        className="mt-9 flex items-center justify-between font-medium tabular-nums tracking-[0.06em] text-foreground"
        aria-label="رقم البطاقة"
      >
        {groups.map((group, index) => (
          <span key={index} className={index === 0 ? "me-3" : index === groups.length - 1 ? "ms-3" : "mx-3"}>
            {group}
          </span>
        ))}
      </p>
      <div className="mt-7 flex items-end justify-between gap-4">
        <span className={`min-w-0 flex-1 truncate text-[13px] font-medium uppercase tracking-[0.08em] ${holder ? "text-foreground" : "text-muted-foreground"}`}>
          {holder || "اسمك على البطاقة"}
        </span>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-muted-foreground" dir="ltr">
          {month || "MM"}
          <span className="mx-1">/</span>
          {year || "YY"}
        </span>
      </div>
    </div>
  );
}
