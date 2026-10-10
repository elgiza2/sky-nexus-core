import { m as motion, useReducedMotion } from 'framer-motion';
import { AgentOrb } from '@/components/agent/AgentOrb';

/** The actual chat character, with a pricing-only animated flight costume. */
export default function FlyingMegsy() {
  const reduced = useReducedMotion();
  return (
    <motion.div className="sky-flight" role="img" aria-label="Megsy flying with a superhero cape"
      initial={reduced ? false : { y: 250, scale: .7 }} animate={{ y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { delay: .35, duration: 1.3, ease: [.16, 1, .3, 1] }}>
      <div className="sky-flight-hover" aria-hidden="true">
        <svg className="sky-cape" viewBox="0 0 140 140"><path className="sky-cape-main" d="M44 22 Q70 12 96 22 L130 119 Q110 103 95 130 Q72 107 53 134 Q32 112 9 122 Z" /><path className="sky-cape-fold" d="M47 27 Q50 77 53 134 M92 26 Q85 77 95 130" /></svg>
        <span className="sky-flight-arm sky-flight-arm-left"><i /></span>
        <span className="sky-flight-arm sky-flight-arm-right"><i /></span>
        <AgentOrb size={76} state="idle" color="aurora" className="sky-flight-orb" />
        <span className="sky-cape-clasp" />
      </div>
      <div className="sky-air" aria-hidden="true"><i /><i /><i /><i /><i /><svg viewBox="0 0 160 70"><path d="M5 38 Q28 10 51 32 M52 60 Q78 28 104 51 M110 26 Q133 2 155 26" /></svg></div>
    </motion.div>
  );
}