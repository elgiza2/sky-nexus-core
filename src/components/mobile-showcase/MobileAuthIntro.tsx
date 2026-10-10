/** Shared welcome/sign-in screen, matching the quiet Cue reference with Megsy's character. */
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import AppleSignInButton from "@/components/auth/AppleSignInButton";
import { useUserLang } from "@/lib/authI18n";

interface Props {
  onGoogle: () => void; onMicrosoft?: () => void; onEmail: () => void; onBack?: () => void; onTelegram?: () => void;
  expanded?: boolean; showPasswordField?: boolean; email?: string; setEmail?: (v: string) => void;
  password?: string; setPassword?: (v: string) => void; showPassword?: boolean; setShowPassword?: (v: boolean) => void;
  isSubmitting?: boolean; onSubmitEmail?: () => void; onSubmitPassword?: () => void; onForgotPassword?: () => void; error?: string | null;
}
export default function MobileAuthIntro(p: Props) {
  const ar = useUserLang() === "ar-eg";
  const label = (provider: string) => ar ? `متابعة باستخدام ${provider}` : `Continue with ${provider}`;
  return <main className="megsy-auth-screen" dir={ar ? "rtl" : "ltr"}>
    {p.expanded && <button type="button" className="megsy-auth-back" onClick={p.onBack} aria-label={ar ? "رجوع" : "Back"}><ArrowLeft size={20} /></button>}
    <div className="megsy-auth-brand"><div className="megsy-auth-lockup"><AgentOrb color="aurora" state="idle" size={86} /><h1>Megsy</h1></div></div>
    <section className="megsy-auth-actions">
      {p.error && <p role="alert" className="megsy-auth-error">{p.error}</p>}
      {!p.expanded ? <>
        <button className="megsy-auth-pill" onClick={p.onGoogle}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.54 12.28c0-.82-.08-1.62-.22-2.4H12v4.54h6.48c-.28 1.5-1.12 2.78-2.4 3.64l3.7 2.88c2.16-2 3.42-4.94 3.42-8.66z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.06 7.94-2.9l-3.7-2.88c-1.02.68-2.34 1.1-4.24 1.1-2.86 0-5.34-2.02-6.36-4.96L1.28 17.4C3.26 21.3 7.32 24 12 24z"/><path fill="#FBBC05" d="M5.64 14.42a7.1 7.1 0 010-4.84L1.28 6.2A11.98 11.98 0 000 12c0 1.94.46 3.78 1.28 5.4l4.36-2.98z"/><path fill="#EA4335" d="M12 5.04c1.94 0 3.66.67 5.02 1.98l3.72-3.72C18.42 1.19 15.44 0 12 0 7.32 0 3.26 2.7 1.28 6.62l4.36 3.38C6.66 7.06 9.14 5.04 12 5.04z"/></svg><span>{label("Google")}</span></button>
        {p.onMicrosoft && <button className="megsy-auth-pill" onClick={p.onMicrosoft}><svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg><span>{label("Microsoft")}</span></button>}
        <AppleSignInButton className="megsy-auth-pill" />
        <div className="megsy-auth-divider"><span>{ar ? "أو" : "or"}</span></div>
        <button className="megsy-auth-pill" onClick={p.onEmail}><Mail size={21} /><span>{ar ? "متابعة باستخدام البريد الإلكتروني" : "Continue with email"}</span></button>
      </> : <form className="megsy-auth-form" onSubmit={e => { e.preventDefault(); if (!p.isSubmitting) (p.showPasswordField ? p.onSubmitPassword : p.onSubmitEmail)?.(); }}>
        <h2>{ar ? (p.showPasswordField ? "أهلاً بيك تاني" : "ابدأ مع Megsy") : (p.showPasswordField ? "Welcome back" : "Get started with Megsy")}</h2>
        <input className="megsy-auth-input" type="email" autoComplete="email" placeholder={ar ? "البريد الإلكتروني" : "Email address"} value={p.email ?? ""} onChange={e => p.setEmail?.(e.target.value)} disabled={p.showPasswordField} autoFocus dir="ltr" />
        {p.showPasswordField && <div className="megsy-auth-password"><input className="megsy-auth-input" type={p.showPassword ? "text" : "password"} autoComplete="current-password" placeholder={ar ? "كلمة المرور" : "Password"} value={p.password ?? ""} onChange={e => p.setPassword?.(e.target.value)} autoFocus dir="ltr" /><button type="button" onClick={() => p.setShowPassword?.(!p.showPassword)} aria-label={ar ? "إظهار كلمة المرور" : "Show password"}>{p.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>}
        {p.showPasswordField && <button type="button" className="megsy-auth-forgot" onClick={p.onForgotPassword}>{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</button>}
        <button type="submit" className="megsy-auth-pill megsy-auth-primary" disabled={p.isSubmitting || !(p.showPasswordField ? p.password?.trim() : p.email?.trim())}>{p.isSubmitting ? (ar ? "لحظة…" : "Please wait…") : ar ? (p.showPasswordField ? "تسجيل الدخول" : "متابعة") : (p.showPasswordField ? "Sign in" : "Continue")}</button>
      </form>}
      <footer className="megsy-auth-legal"><a href="/terms">{ar ? "شروط الخدمة" : "Terms of service"}</a><a href="/privacy">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a></footer>
    </section>
  </main>;
}
