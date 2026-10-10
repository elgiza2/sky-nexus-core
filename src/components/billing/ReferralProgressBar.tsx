/** @doc Referral earnings — verified invites and the credits they earned (20 each). */
import { useUserLang } from "@/lib/authI18n";

export const CREDITS_PER_REFERRAL = 20;

export default function ReferralProgressBar({
  referrals,
  className = "",
}: {
  referrals: number;
  className?: string;
}) {
  const lang = useUserLang();
  const isAr = String(lang).startsWith("ar");
  const earned = referrals * CREDITS_PER_REFERRAL;
  return (
    <section className={`grid grid-cols-2 gap-3 ${className}`}>
      <div className="rounded-[18px] border border-border bg-background px-5 py-4">
        <p className="text-[12.5px] text-muted-foreground">{isAr ? "الإحالات" : "Referrals"}</p>
        <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground" dir="ltr">{referrals}</p>
      </div>
      <div className="rounded-[18px] border border-border bg-background px-5 py-4">
        <p className="text-[12.5px] text-muted-foreground">{isAr ? "الكريدت اللي كسبته" : "Credits earned"}</p>
        <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground" dir="ltr">+{earned}</p>
      </div>
      <p className="col-span-2 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
        {isAr
          ? "بيتحسب الصاحب بعد أول استخدام حقيقي ليه (صورة أو فيديو أو مهمة)."
          : "A friend counts after their first real use (an image, a video or an agent task)."}
      </p>
    </section>
  );
}
