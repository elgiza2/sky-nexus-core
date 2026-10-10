import { useState } from 'react';
import { m as motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Menu, Plus, Minus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MegsyStar from '@/components/branding/MegsyStar';
import { useUserLang, translateExactText } from '@/lib/authI18n';
import { useUserPlan } from '@/hooks/useUserPlan';
import { getDisplayPrice, type PlanCardConfig, type PlanTier } from '@/data/pricingData';
import CreditPacks from '@/components/billing/CreditPacks';
import mascot from '@/assets/pricing-megsy-mascot.png';

type Props = {
  plans: PlanCardConfig[];
  faqs: { q: string; a: string }[];
  isYearly: boolean;
  setIsYearly: (value: boolean) => void;
  loadingTier: PlanTier | null;
  currentPlan: string | null;
  onSubscribe: (tier: PlanTier) => void;
  onMenuClick?: () => void;
};

export default function AnimatedPricing({ plans, faqs, isYearly, setIsYearly, loadingTier, currentPlan, onSubscribe, onMenuClick }: Props) {
  const navigate = useNavigate();
  const lang = useUserLang();
  const isAr = lang.toLowerCase().startsWith('ar');
  const reduced = useReducedMotion();
  const { plan } = useUserPlan();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pro = plans.find(p => p.tier === 'pro');
  if (!pro) return null;
  const activePlan = currentPlan || plan;
  const subscribed = ['pro', 'max', 'elite', 'business'].includes(activePlan || '');
  const price = getDisplayPrice(pro, isYearly);
  const text = (en: string, ar: string) => isAr ? ar : en;
  const rows = [
    { label: text('Chat with Megsy', 'الدردشة مع Megsy'), free: true },
    { label: text('Switch between agents', 'التبديل بين الوكلاء'), free: false },
    { label: text('Image generation', 'إنشاء الصور'), free: false },
    { label: text('Video generation', 'إنشاء الفيديو'), free: false },
    { label: text('Monthly credits', 'الرصيد الشهري'), free: false, value: '1,000' },
    { label: text('Priority support', 'أولوية الدعم'), free: false },
  ];
  const appear = (delay: number) => reduced ? { duration: 0 } : { delay, type: 'spring' as const, stiffness: 220, damping: 22 };
  return (
    <div className="pricing-sky" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="pricing-sky-top">
        <nav className="pricing-sky-nav">
          <Button variant="ghost" size="icon" className="sky-icon" aria-label={text('Back', 'رجوع')} onClick={() => navigate(-1)}><ArrowLeft /></Button>
          <span className="sky-brand"><MegsyStar className="h-5 w-5" />Megsy</span>
          <Button variant="ghost" size="icon" className="sky-icon" aria-label={text('Open menu', 'فتح القائمة')} onClick={onMenuClick} hidden={!onMenuClick}><Menu /></Button>
        </nav>
        <motion.div className="sky-title" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={appear(.15)}>
          <span className="sky-ribbon">{text('MEGSY PRO', 'MEGSY PRO')}</span>
          <h1>{text('More possibilities.\nOne Megsy Pro.', 'إمكانيات أكتر مع Megsy Pro.')}</h1>
          <p>{text('Your agent. Your ideas. A little more super.', 'وكيلك وأفكارك، بإمكانيات أقوى.')}</p>
        </motion.div>
        <motion.div className="sky-clouds" initial={reduced ? false : { y: 100 }} animate={{ y: 0 }} transition={appear(.5)} aria-hidden="true" />
        <motion.img src={mascot} alt={text('Megsy star mascot', 'شخصية Megsy')} width={160} height={160} className="sky-mascot" initial={reduced ? false : { y: 180, rotate: -12, scale: .7 }} animate={{ y: 0, rotate: 0, scale: 1 }} transition={appear(.7)} />
      </section>
      <main className="sky-main">
        <motion.div className="sky-billing" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={appear(1)} aria-label={text('Billing interval', 'مدة الاشتراك')}>
          {[false, true].map(yearly => <Button variant="ghost" key={String(yearly)} aria-pressed={isYearly === yearly} onClick={() => setIsYearly(yearly)}>{yearly ? text('Yearly · 4 months free', 'سنوي · ٤ شهور مجانًا') : text('Monthly', 'شهري')}</Button>)}
        </motion.div>
        <table className="sky-compare" aria-label={text('Free and Pro comparison', 'مقارنة المجاني وPro')}>
          <thead><tr><th scope="col">{text('Your benefits', 'المزايا')}</th><th scope="col">{text('FREE', 'مجاني')}</th><th scope="col">MEGSY PRO</th></tr></thead>
          <tbody>{rows.map((row, i) => <motion.tr key={row.label} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={appear(1.2 + i * .14)}>
            <th scope="row">{row.label}</th>
            <td>{row.free ? <motion.span className="sky-check sky-check-free" initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={appear(1.5)}><Check aria-label={text('Included', 'متاح')} strokeWidth={3} /></motion.span> : <span className="sky-unavailable" aria-label={text('Not included', 'غير متاح')}>—</span>}</td>
            <td>{row.value ? <motion.span initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={appear(2 + i * .16)}>{row.value}</motion.span> : <motion.span className="sky-check" initial={reduced ? false : { scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={reduced ? { duration: 0 } : { delay: 2 + i * .16, type: 'spring', stiffness: 430, damping: 12 }}><Check aria-label={text('Included', 'متاح')} strokeWidth={3} /></motion.span>}</td>
          </motion.tr>)}</tbody>
        </table>
        <motion.div className="sky-purchase" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={appear(2.4)}>
          <div className="sky-price"><AnimatePresence mode="wait" initial={false}><motion.span key={price.price} dir="ltr" initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: reduced ? 0 : .15 }}>${price.price}</motion.span></AnimatePresence><small>{isYearly ? text('/ year', '/ سنة') : text('/ first month', '/ الشهر الأول')}</small></div>
          <Button variant="ghost" className="sky-cta" disabled={loadingTier !== null} onClick={() => subscribed ? navigate('/settings?tab=billing') : onSubscribe('pro')}>{loadingTier ? <Loader2 className="animate-spin" /> : subscribed ? text('MANAGE SUBSCRIPTION', 'إدارة الاشتراك') : text('GET MEGSY PRO', 'اشترك في MEGSY PRO')}</Button>
          <p className="sky-fine">{isYearly ? text(`$${pro.yearlyPrice} billed yearly. Cancel anytime.`, `$${pro.yearlyPrice} سنويًا. تقدر تلغي في أي وقت.`) : text(`$${price.price} for your first month, then $${pro.monthlyPrice}/month. Cancel anytime.`, `$${price.price} للشهر الأول، ثم $${pro.monthlyPrice} شهريًا. تقدر تلغي في أي وقت.`)}</p>
          <p className="sky-fine">{text('Media depends on provider availability. Tax calculated at checkout.', 'الصور والفيديو حسب إتاحة المزوّد. الضريبة بتتحسب عند الدفع.')}</p>
          <Button variant="ghost" className="sky-free-link" onClick={() => navigate('/chat')}>{text('Continue with free chat', 'كمّل بالدردشة المجانية')}</Button>
        </motion.div>
      </main>
      <section className="sky-details" id="pricing-faq">
        <CreditPacks isPro={subscribed} />
        <h2>{text('Questions?', 'عندك أسئلة؟')}</h2>
        {faqs.map((faq, i) => <div className="sky-faq" key={faq.q}><Button variant="ghost" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{translateExactText(faq.q, lang)}{openFaq === i ? <Minus /> : <Plus />}</Button><AnimatePresence initial={false}>{openFaq === i && <motion.div initial={{ height: reduced ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }} className="overflow-hidden"><p>{translateExactText(faq.a, lang)}</p></motion.div>}</AnimatePresence></div>)}
        <footer className="sky-footer"><a href="mailto:support@megsyai.com">{text('Support', 'الدعم')}</a><span>Megsy AI</span></footer>
      </section>
    </div>
  );
}