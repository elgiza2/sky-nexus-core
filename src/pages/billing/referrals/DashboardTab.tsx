/** @doc Referral overview — invite copy, artwork and live progress toward Pro. */
import { useUserLang, translateExactText } from "@/lib/authI18n";
import heroImage from "@/assets/megsy-referral-hero.jpg";
import ReferralProgressBar from "@/components/billing/ReferralProgressBar";
import ReferralTasksList from "@/components/billing/ReferralTasksList";
import { useReferrals } from "@/pages/billing/ReferralsPage";

export default function DashboardTab() {
  const lang = useUserLang();
  const copy = (text: string) => translateExactText(text, lang);
  const { milestone } = useReferrals();

  const isAr = lang === "ar-eg" || String(lang).startsWith("ar");

  return (
    <div className="flex h-full flex-col" data-stagger>
      <header className="pt-1 text-center">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[42px]">
          {isAr ? "ادعُ أصحابك واكسب 20 كريدت عن كل واحد" : "Invite friends, earn 20 credits each"}
        </h1>
        <p className="mx-auto mt-3 max-w-[460px] text-[14.5px] leading-relaxed text-muted-foreground">
          {isAr
            ? "كل صاحب يسجل برابطك ويستخدم Megsy لأول مرة يضيفلك 20 كريدت. وكمان كل مهمة تخلصها تديك 10 كريدت."
            : "Every friend who joins with your link and makes their first real use adds 20 credits to your balance. Each task below adds 10 more."}
        </p>
      </header>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border">
        <img
          src={heroImage}
          alt={copy("Megsy Pro invitation artwork")}
          width={1280}
          height={960}
          className="block w-full"
        />
      </div>

      <ReferralProgressBar
        className="mt-5"
        referrals={milestone.referrals}
      />

      <ReferralTasksList className="mt-7" />
    </div>
  );
}
