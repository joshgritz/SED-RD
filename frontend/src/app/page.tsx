"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                                       */
/* ══════════════════════════════════════════════════════════════════════════════════ */

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`max-w-7xl mx-auto px-6 lg:px-8 ${className}`}>{children}</div>;
}

function Glow({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`absolute pointer-events-none ${className}`} style={style} aria-hidden />;
}

/* ══════════════════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                          */
/* ══════════════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [masOpen, setMasOpen] = useState(false);
  const obs = useRef<IntersectionObserver | null>(null);
  const masRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (masRef.current && !masRef.current.contains(e.target as Node)) setMasOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    obs.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("revealed"); obs.current?.unobserve(e.target); } }),
      { threshold: 0.06, rootMargin: "0px 0px -80px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.current?.observe(el));
    return () => obs.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ════════════════ NAVBAR ════════════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ${scrolled ? "bg-[#f5f7fa]/70 backdrop-blur-2xl border-b border-[#0a1128]/[0.04]" : ""}`}>
        <Container className="flex items-center justify-between h-[72px]">
          <a href="#" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f7df5] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-[#4f7df5]/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-[15px] tracking-tight">SISTEPARD</span>
          </a>

          <div className="hidden md:flex items-center gap-3">
            {/* Dropdown "Más" */}
            <div className="relative" ref={masRef}>
              <button
                onClick={() => setMasOpen(!masOpen)}
                className="text-[13px] font-semibold text-[#0a1128] px-4 py-2.5 rounded-xl border border-[rgba(0,30,80,0.12)] hover:bg-[#e9ecf3]/[0.6] hover:border-[#4f7df5]/30 transition-all duration-300 inline-flex items-center gap-2"
              >
                Más
                <svg className={`w-3 h-3 transition-transform duration-200 ${masOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>

              {masOpen && (
                <div className="absolute right-0 top-full mt-2 w-[280px] p-2 rounded-2xl bg-white border border-[rgba(0,30,80,0.10)] shadow-2xl shadow-[#0a1128]/10 z-50">
                  <a href="legisladores.html" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#e9ecf3]/[0.6] transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f7df5] to-[#a78bfa] flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#0a1128]">Representantes</h4>
                      <p className="text-[11px] text-[#4a5568]">Estructura de liderazgo y candidaturas</p>
                    </div>
                  </a>
                  <a href="geografia.html" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#e9ecf3]/[0.6] transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003087] to-[#4f7df5] flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#0a1128]">Geografía</h4>
                      <p className="text-[11px] text-[#4a5568]">Municipios y estructura territorial</p>
                    </div>
                  </a>
                </div>
              )}
            </div>

            <a href="index.html" className="text-[13px] font-medium text-[#4a5568] hover:text-[#0a1128] px-4 py-2.5 rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-all duration-300">Iniciar Sesión</a>
            <a href="index.html" className="text-[13px] font-semibold text-white bg-gradient-to-r from-[#4f7df5] to-[#a78bfa] px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#4f7df5]/25 transition-all duration-300">Registrarse</a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
            </svg>
          </button>
        </Container>

        {mobileOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-[#0a1128]/[0.04]">
            <Container className="py-4 space-y-1">
              <a href="legisladores.html" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-[#4a5568] hover:text-[#0a1128] rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-all">Representantes</a>
              <a href="geografia.html" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-[#4a5568] hover:text-[#0a1128] rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-all">Geografía</a>
              <a href="#sobre-el-creador" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-[#4a5568] hover:text-[#0a1128] rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-all">Sobre el Creador</a>
              <div className="pt-3 border-t border-[#0a1128]/[0.04] space-y-2">
                <a href="index.html" className="block text-center text-sm text-[#4a5568] hover:text-[#0a1128] px-4 py-3 rounded-lg hover:bg-[#e9ecf3]/[0.6] transition-all">Iniciar Sesión</a>
                <a href="index.html" className="block text-center text-sm font-semibold text-white bg-gradient-to-r from-[#4f7df5] to-[#a78bfa] px-5 py-3 rounded-xl transition-all">Registrarse</a>
              </div>
            </Container>
          </div>
        )}
      </nav>

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Light base with Dominican blue accent */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 70% 50% at 75% 50%, rgba(0,48,135,0.06) 0%, transparent 65%),
            radial-gradient(ellipse 50% 60% at 20% 30%, rgba(200,16,46,0.03) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 60% 80%, rgba(79,125,245,0.04) 0%, transparent 50%)
          `
        }} />

        {/* Animated orbs — DR blue */}
        <Glow className="top-1/3 right-1/4 w-[600px] h-[600px] bg-[#003087]/[0.04] rounded-full blur-[150px]" style={{ animation: "mesh-drift 20s ease-in-out infinite" } as React.CSSProperties} />
        <Glow className="bottom-1/4 left-1/6 w-[400px] h-[400px] bg-[#C8102E]/[0.02] rounded-full blur-[120px]" style={{ animation: "mesh-drift 25s ease-in-out infinite reverse" } as React.CSSProperties} />

        {/* Geometric pattern — subtle crosshatch */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(0,30,80,0.08) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(0,30,80,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }} />

        <Container className="relative z-10 py-36 lg:py-44">
          <div className="grid lg:grid-cols-[1fr_400px] gap-16 lg:gap-20 items-center">
            {/* Left — Text */}
            <div>
              <div className="reveal">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#003087]/[0.12] border border-[#003087]/20 mb-10">
                  <span className="w-2 h-2 rounded-full bg-[#003087] animate-pulse" />
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#4f7df5]">Gestión Electoral Digital</span>
                </div>
              </div>

              <h1 className="reveal text-[3.5rem] sm:text-[4.5rem] lg:text-[5.2rem] font-bold leading-[0.93] tracking-[-0.03em]">
                <span className="block text-[#0a1128]">La plataforma</span>
                <span className="block text-[#0a1128]">que tu partido</span>
                <span className="block text-[#4f7df5]">
                  necesita
                </span>
              </h1>

              <p className="reveal rd1 mt-8 text-lg text-[#4a5568] max-w-[440px] leading-[1.7]">
                Gestión electoral interna con trazabilidad completa, seguridad de nivel empresarial y herramientas diseñadas para el terreno político dominicano.
              </p>

              <div className="reveal rd2 mt-10 flex flex-wrap items-center gap-4">
                <a href="index.html" className="group inline-flex items-center gap-3 bg-[#003087] hover:bg-[#0040b0] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-[13px] shadow-lg shadow-[#003087]/20 hover:shadow-[#003087]/40">
                  <span>Solicitar Demo</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </a>
                <a href="#como-funciona" className="group inline-flex items-center gap-2.5 text-[#4a5568] font-medium px-7 py-4 rounded-xl border border-[rgba(0,20,60,0.12)] hover:border-[#003087]/30 hover:text-[#0a1128] hover:bg-[#003087]/[0.05] transition-all duration-300 text-[13px]">
                  Conocer Más
                  <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
                </a>
              </div>

            </div>

            {/* Right — Shield Visual */}
            <div className="reveal rd2 hidden lg:flex justify-center items-center">
              <div className="relative w-[340px] h-[340px]">
                {/* Soft rotating rings */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 340 340">
                  <circle cx="170" cy="170" r="155" fill="none" stroke="#4f7df5" strokeWidth="0.5" strokeDasharray="6 10" style={{ animation: "ring-spin 60s linear infinite" }} />
                  <circle cx="170" cy="170" r="125" fill="none" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="4 14" style={{ animation: "ring-spin 45s linear infinite reverse" }} />
                </svg>

                {/* Cyber attack particles — flying toward shield */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 340">
                  {/* Particle 1 — from top-left */}
                  <circle cx="0" cy="0" r="2.5" fill="#C8102E" opacity="0.8">
                    <animate attributeName="cx" values="0;155" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="0;155" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.8;0;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="1.5" fill="#C8102E" opacity="0.5">
                    <animate attributeName="cx" values="0;160" dur="2.3s" repeatCount="indefinite" begin="0.7s" />
                    <animate attributeName="cy" values="10;150" dur="2.3s" repeatCount="indefinite" begin="0.7s" />
                    <animate attributeName="opacity" values="0.5;0.5;0;0" dur="2.3s" repeatCount="indefinite" begin="0.7s" />
                  </circle>
                  {/* Particle 2 — from top-right */}
                  <circle cx="340" cy="0" r="2" fill="#f5a623" opacity="0.7">
                    <animate attributeName="cx" values="340;185" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
                    <animate attributeName="cy" values="0;155" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
                    <animate attributeName="opacity" values="0.7;0.7;0;0" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
                  </circle>
                  <circle cx="340" cy="20" r="1.5" fill="#C8102E" opacity="0.6">
                    <animate attributeName="cx" values="340;180" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
                    <animate attributeName="cy" values="20;160" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
                    <animate attributeName="opacity" values="0.6;0.6;0;0" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
                  </circle>
                  {/* Particle 3 — from bottom-left */}
                  <circle cx="0" cy="340" r="2" fill="#f5a623" opacity="0.7">
                    <animate attributeName="cx" values="0;155" dur="2.1s" repeatCount="indefinite" begin="0.5s" />
                    <animate attributeName="cy" values="340;185" dur="2.1s" repeatCount="indefinite" begin="0.5s" />
                    <animate attributeName="opacity" values="0.7;0.7;0;0" dur="2.1s" repeatCount="indefinite" begin="0.5s" />
                  </circle>
                  {/* Particle 4 — from bottom-right */}
                  <circle cx="340" cy="340" r="2.5" fill="#C8102E" opacity="0.8">
                    <animate attributeName="cx" values="340;185" dur="1.9s" repeatCount="indefinite" begin="0.8s" />
                    <animate attributeName="cy" values="340;185" dur="1.9s" repeatCount="indefinite" begin="0.8s" />
                    <animate attributeName="opacity" values="0.8;0.8;0;0" dur="1.9s" repeatCount="indefinite" begin="0.8s" />
                  </circle>
                  {/* Particle 5 — from left */}
                  <circle cx="0" cy="170" r="1.5" fill="#C8102E" opacity="0.6">
                    <animate attributeName="cx" values="0;145" dur="1.7s" repeatCount="indefinite" begin="1.5s" />
                    <animate attributeName="opacity" values="0.6;0.6;0;0" dur="1.7s" repeatCount="indefinite" begin="1.5s" />
                  </circle>
                  {/* Particle 6 — from right */}
                  <circle cx="340" cy="170" r="2" fill="#f5a623" opacity="0.5">
                    <animate attributeName="cx" values="340;195" dur="2.2s" repeatCount="indefinite" begin="1.8s" />
                    <animate attributeName="opacity" values="0.5;0.5;0;0" dur="2.2s" repeatCount="indefinite" begin="1.8s" />
                  </circle>
                  {/* Impact flash — top-left */}
                  <circle cx="155" cy="155" r="0" fill="#C8102E" opacity="0">
                    <animate attributeName="r" values="0;15;0" dur="0.3s" repeatCount="indefinite" begin="1.95s" />
                    <animate attributeName="opacity" values="0;0.4;0" dur="0.3s" repeatCount="indefinite" begin="1.95s" />
                  </circle>
                  {/* Impact flash — top-right */}
                  <circle cx="185" cy="155" r="0" fill="#f5a623" opacity="0">
                    <animate attributeName="r" values="0;12;0" dur="0.3s" repeatCount="indefinite" begin="2.05s" />
                    <animate attributeName="opacity" values="0;0.3;0" dur="0.3s" repeatCount="indefinite" begin="2.05s" />
                  </circle>
                  {/* Impact flash — bottom */}
                  <circle cx="170" cy="185" r="0" fill="#C8102E" opacity="0">
                    <animate attributeName="r" values="0;14;0" dur="0.3s" repeatCount="indefinite" begin="2.6s" />
                    <animate attributeName="opacity" values="0;0.35;0" dur="0.3s" repeatCount="indefinite" begin="2.6s" />
                  </circle>
                </svg>

                {/* Shield — absorbs attacks, glows on impact */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Shield glow ring — flashes on impact */}
                    <div className="absolute -inset-6 rounded-full" style={{
                      background: "radial-gradient(circle, rgba(79,125,245,0.12) 0%, transparent 70%)",
                      animation: "shield-pulse 3s ease-in-out infinite"
                    }} />
                    {/* Shield body */}
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#4f7df5]/15 to-[#a78bfa]/10 flex items-center justify-center relative" style={{ animation: "shield-impact 3s ease-in-out infinite" }}>
                      <svg className="w-14 h-14 text-[#4f7df5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute top-8 -right-4 px-3 py-1.5 rounded-lg bg-white border border-[#003087]/15 text-[10px] text-[#003087] font-medium shadow-sm" style={{ animation: "float-slow 5s ease-in-out infinite 0.5s" }}>
                  🔐 JWT Auth
                </div>
                <div className="absolute bottom-12 -left-6 px-3 py-1.5 rounded-lg bg-white border border-[#4f7df5]/15 text-[10px] text-[#4f7df5] font-medium shadow-sm" style={{ animation: "float-slow 5s ease-in-out infinite 1s" }}>
                  🛡️ RLS
                </div>
                <div className="absolute top-1/2 -right-8 px-3 py-1.5 rounded-lg bg-white border border-[#4a5568]/15 text-[10px] text-[#4a5568] font-medium shadow-sm" style={{ animation: "float-slow 5s ease-in-out infinite 1.5s" }}>
                  ⚡ AES-256
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#e9ecf3] to-transparent" />

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 reveal rd4 z-10">
          <span className="text-[10px] text-[#4a5568]/40 uppercase tracking-[0.2em]">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-[#0a1128]/[0.08] flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-[#4f7df5]/40" style={{ animation: "float-slow 2s ease-in-out infinite" }} />
          </div>
        </div>
      </section>

      {/* ════════════════ SEGURIDAD — BENTO GRID ════════════════ */}
      <section id="seguridad" className="py-32 lg:py-40 relative">
        <Container>
          <div className="reveal mb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4f7df5]/10 border border-[#4f7df5]/20 mb-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4f7df5]">Seguridad y Confianza</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] max-w-4xl mx-auto leading-[1.1]">
              Diseñado para la{" "}
              <span className="bg-gradient-to-r from-[#4f7df5] to-[#a78bfa] bg-clip-text text-transparent">seriedad electoral</span>
            </h2>
            <p className="text-[#4a5568] mt-6 text-lg max-w-2xl mx-auto leading-relaxed">
              Cada componente del sistema está construido con los mismos estándares que usan las instituciones financieras y gubernamentales.
            </p>
          </div>

          {/* Bento Grid — 2 cols, first card spans 2 rows */}
          <div className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(200px,auto)]">
            {/* Big card — spans 2 rows */}
            <div className="group sm:row-span-2 p-8 rounded-3xl bg-gradient-to-br from-[#4f7df5]/[0.08] to-[#a78bfa]/[0.04] border border-[#4f7df5]/20 hover:border-[#4f7df5]/40 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4f7df5]/[0.06] rounded-full blur-[60px]" />
              <div className="w-12 h-12 rounded-2xl bg-[#4f7df5]/10 flex items-center justify-center mb-6 group-hover:bg-[#4f7df5]/20 transition-colors">
                <svg className="w-6 h-6 text-[#4f7df5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="font-bold text-xl mb-3">Row Level Security</h3>
              <p className="text-[#4a5568] leading-relaxed">Cada usuario solo ve los datos que le corresponden. Sin acceso cruzado entre zonas. Aislamiento total a nivel de base de datos Supabase.</p>
              <div className="mt-8 flex items-center gap-2 text-xs text-[#4f7df5] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4f7df5]" />
                Protección por política RLS
              </div>
            </div>

            {/* Normal cards */}
            <div className="group p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[#4f7df5]/30 transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/10 flex items-center justify-center mb-5 group-hover:bg-[#a78bfa]/20 transition-colors">
                <svg className="w-5 h-5 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
              </div>
              <h3 className="font-bold text-sm mb-2">Autenticación JWT</h3>
              <p className="text-[#4a5568] text-sm leading-relaxed">Sesiones firmadas con tokens de corta vida. Requiere cédula + PIN personal.</p>
            </div>

            <div className="group p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[rgba(0,30,80,0.20)] transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#e9ecf3]/[0.6] flex items-center justify-center mb-5 group-hover:bg-[#e9ecf3]/[0.8] transition-colors">
                <svg className="w-5 h-5 text-[#4a5568]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              </div>
              <h3 className="font-bold text-sm mb-2">Auditoría Completa</h3>
              <p className="text-[#4a5568] text-sm leading-relaxed">Cada acción queda registrada con fecha, usuario y tipo. Trazabilidad total.</p>
            </div>

            <div className="group sm:col-span-2 p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[rgba(0,30,80,0.20)] transition-all duration-500 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#f5a623]/20 transition-colors">
                  <svg className="w-5 h-5 text-[#f5a623]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Datos Cifrados</h3>
                  <p className="text-[#4a5568] text-sm leading-relaxed">Información sensible protegida en tránsito y en reposo. Cumplimiento con estándares internacionales de seguridad.</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ════════════════ CÓMO FUNCIONA — STEPS ════════════════ */}
      <section id="como-funciona" className="py-32 lg:py-40 relative">
        {/* Subtle gradient divider */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#4f7df5]/20 to-transparent" />

        <Container>
          <div className="reveal mb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4f7df5]/10 border border-[#4f7df5]/20 mb-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4f7df5]">Cómo Funciona</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em]">
              Tres pasos para modernizar
            </h2>
            <p className="text-[#4a5568] mt-5 text-lg max-w-2xl mx-auto leading-relaxed">
              Desde la inscripción de militantes hasta la generación de actas. Un solo sistema para todo el proceso electoral.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Registra tu Estructura", desc: "Candidatos, dirigentes, delegados y coordinadores se registran con su cédula. El sistema valida y organiza automáticamente por zona y municipio." },
              { num: "02", title: "Gestiona el Proceso", desc: "Planifica elecciones internas, genera actas electrónicas con código QR de verificación, y gestiona las mesas de votación en tiempo real." },
              { num: "03", title: "Verifica y Audita", desc: "Cada acta tiene un código QR único. Cualquier persona puede verificar la autenticidad del documento. Auditoría completa." },
            ].map((s, i) => (
              <div key={s.num} className="reveal group relative p-8 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[#4f7df5]/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#4f7df5]/[0.04] rounded-full blur-[40px] group-hover:bg-[#4f7df5]/[0.08] transition-colors duration-500" />
                <div className="text-6xl font-black text-[#0a1128]/[0.03] absolute top-4 right-6 select-none">{s.num}</div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#4f7df5]/10 flex items-center justify-center mb-6 group-hover:bg-[#4f7df5]/20 transition-colors">
                    <span className="text-[#4f7df5] font-bold text-sm">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-xl mb-3">{s.title}</h3>
                  <p className="text-[#4a5568] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ════════════════ PRODUCTO — ALTERNATING ════════════════ */}
      <section id="producto" className="py-32 lg:py-40 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#a78bfa]/20 to-transparent" />

        <Container>
          <div className="reveal mb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 mb-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#a78bfa]">El Sistema</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em]">
              Herramientas reales para
              <br />
              <span className="bg-gradient-to-r from-[#a78bfa] to-[#4f7df5] bg-clip-text text-transparent">trabajo real</span>
            </h2>
            <p className="text-[#4a5568] mt-5 text-lg max-w-2xl mx-auto leading-relaxed">
              No es una promesa — es un sistema funcionando. Estas son las herramientas que ya están disponibles.
            </p>
          </div>

          {/* Bento Grid — varied sizes */}
          <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large feature card — spans 2 rows */}
            <div className="group md:row-span-2 p-8 rounded-3xl bg-gradient-to-br from-[#a78bfa]/[0.08] to-[#4f7df5]/[0.04] border border-[#a78bfa]/20 hover:border-[#a78bfa]/40 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#a78bfa]/[0.06] rounded-full blur-[60px]" />
              <div className="w-12 h-12 rounded-2xl bg-[#a78bfa]/10 flex items-center justify-center mb-6 group-hover:bg-[#a78bfa]/20 transition-colors">
                <svg className="w-6 h-6 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <h3 className="font-bold text-xl mb-3">Actas Electrónicas</h3>
              <p className="text-[#4a5568] leading-relaxed">Generación automática de actas con código QR de verificación. Sin papel, sin errores, con trazabilidad completa.</p>
              <div className="mt-8 flex items-center gap-2 text-xs text-[#a78bfa] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                Código QR único por acta
              </div>
            </div>

            {/* Normal cards */}
            <div className="group p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[#4f7df5]/30 transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#4f7df5]/10 flex items-center justify-center mb-5 group-hover:bg-[#4f7df5]/20 transition-colors">
                <svg className="w-5 h-5 text-[#4f7df5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </div>
              <h3 className="font-bold text-sm mb-2">Portal de Dirigentes</h3>
              <p className="text-[#4a5568] text-sm leading-relaxed">Gestión completa de la estructura del partido. Perfil, zona y herramientas de comunicación.</p>
            </div>

            <div className="group p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[rgba(0,30,80,0.20)] transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 flex items-center justify-center mb-5 group-hover:bg-[#f5a623]/20 transition-colors">
                <svg className="w-5 h-5 text-[#f5a623]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </div>
              <h3 className="font-bold text-sm mb-2">Gestión Zonal</h3>
              <p className="text-[#4a5568] text-sm leading-relaxed">Organización por municipios y zonas políticas. Asignación automática de delegados.</p>
            </div>

            {/* Wide card — spans 2 cols */}
            <div className="group md:col-span-2 p-7 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[rgba(0,30,80,0.20)] transition-all duration-500 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-xl bg-[#4f7df5]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4f7df5]/20 transition-colors">
                  <svg className="w-5 h-5 text-[#4f7df5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Dashboard en Tiempo Real</h3>
                  <p className="text-[#4a5568] text-sm leading-relaxed">Monitoreo de mesas, votos contados y resultados parciales al instante. Actualización automática cada 30 segundos.</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ════════════════ HISTORIA — EDITORIAL ════════════════ */}
      <section className="py-32 lg:py-40 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#0a1128]/10 to-transparent" />

        <Container>
          <div className="reveal max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start">
              <div className="lg:sticky lg:top-32">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e9ecf3]/[0.6] border border-[rgba(0,30,80,0.10)] mb-6">
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4a5568]">Nuestra Historia</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Cómo Nació SISTEPARD</h2>
              </div>

              <div className="space-y-8">
                <p className="reveal text-lg text-[#4a5568] leading-[1.8] italic border-l-2 border-[#4f7df5]/30 pl-6">
                  Nadie me lo pidió. No había presupuesto, ni equipo, ni certeza de que fuera a funcionar. Solo la experiencia de estar en el terreno como dirigente de zona y ver, de cerca, todo lo que faltaba.
                </p>
                <p className="reveal text-lg text-[#4a5568] leading-[1.8] italic border-l-2 border-[#a78bfa]/30 pl-6">
                  La idea llegó antes que las herramientas para construirla. Durante mucho tiempo existió solo en mi cabeza, dando vueltas, hasta que decidí que tenía que dejar de ser una idea y convertirse en algo real. Aprendí lo que hizo falta aprender. Encontré tiempo donde no lo había. Seguí cuando lo lógico hubiera sido parar.
                </p>
                <p className="reveal text-lg text-[#4a5568] leading-[1.8] italic border-l-2 border-[#f5a623]/30 pl-6">
                  SISTEPARD no nació en un laboratorio ni en una oficina central. Nació donde nace el trabajo político de verdad: en la base. Lo construyó alguien que conoce ese trabajo porque lo vivió primero, y que decidió que la militancia también merece herramientas hechas con la misma seriedad con la que se hacen las cosas importantes.
                </p>

                <div className="reveal flex items-center gap-4 pt-8 border-t border-[rgba(0,30,80,0.10)]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4f7df5] to-[#a78bfa] flex items-center justify-center text-[#0a1128] font-bold text-lg shadow-lg shadow-[#4f7df5]/20">GV</div>
                  <div>
                    <div className="font-bold text-base">Gritzewsky Ventura</div>
                    <div className="text-[#4a5568] text-sm">Fundador, SISTEPARD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ════════════════ MISIÓN / VISIÓN / VALORES ════════════════ */}
      <section className="py-32 lg:py-40 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#f5a623]/20 to-transparent" />

        <Container>
          <div className="reveal mb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f5a623]/10 border border-[#f5a623]/20 mb-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#f5a623]">Nuestro Propósito</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em]">
              Misión, Visión y Valores
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "🎯", title: "Misión", desc: "Ofrecer a los partidos políticos dominicanos una plataforma digital segura para gestionar su democracia interna — desde el padrón de militantes hasta el acta final, con trazabilidad completa en cada paso." },
              { emoji: "🔭", title: "Visión", desc: "Convertirse en el sistema de referencia para la gestión electoral interna de los partidos políticos en República Dominicana." },
              { emoji: "💎", title: "Valores", list: ["Transparencia", "Seguridad", "Democracia Interna", "Trazabilidad", "Accesibilidad"] },
            ].map((m, i) => (
              <div key={m.title} className="reveal group p-8 rounded-3xl bg-white border border-[rgba(0,30,80,0.10)] hover:border-[rgba(0,30,80,0.20)] transition-all duration-500 hover:-translate-y-1" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-6">{m.emoji}</div>
                <h3 className="font-bold text-xl mb-4">{m.title}</h3>
                {m.desc && <p className="text-[#4a5568] text-sm leading-relaxed">{m.desc}</p>}
                {m.list && (
                  <ul className="space-y-3">
                    {m.list.map((v) => (
                      <li key={v} className="flex items-center gap-3 text-sm text-[#4a5568]">
                        <svg className="w-4 h-4 text-[#4f7df5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        {v}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ════════════════ SOBRE EL CREADOR ════════════════ */}
      <section id="creador" className="py-32 lg:py-40 relative">
        {/* Mesh gradient */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 50%, rgba(79,125,245,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 30% 70%, rgba(167,139,250,0.06) 0%, transparent 50%)
          `
        }} />

        <Container className="relative z-10">
          <div className="reveal max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e9ecf3]/[0.6] border border-[rgba(0,30,80,0.10)] mb-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4a5568]">Sobre el Creador</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.02em]">Gritzewsky Ventura</h2>

            <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-white/80 backdrop-blur-xl border border-[rgba(0,30,80,0.10)]">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#4f7df5] to-[#a78bfa] flex items-center justify-center text-[#0a1128] font-bold text-3xl border-4 border-white shadow-2xl shadow-[#4f7df5]/20">GV</div>
              <h3 className="font-bold text-xl mb-1">Fundador y Creador de SISTEPARD</h3>
              <p className="text-[#4a5568] text-sm leading-relaxed mt-4 mb-8 max-w-lg mx-auto">
                Dirigente político con experiencia real en el terreno electoral dominicano. SISTEPARD nació de esa vivencia: la de ver lo que falta y decidir construirlo. Sigo trabajando en la base mientras desarrollo herramientas que dignifiquen el trabajo político.
              </p>
              <div className="flex justify-center gap-3">
                <a href="https://www.linkedin.com/in/josh-gritz-ventura" target="_blank" className="w-11 h-11 rounded-xl bg-[#e9ecf3]/[0.6] hover:bg-[#0A66C2] flex items-center justify-center transition-all duration-300 text-[#4a5568] hover:text-[#0a1128] hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://www.instagram.com/joshgritzvent/" target="_blank" className="w-11 h-11 rounded-xl bg-[#e9ecf3]/[0.6] hover:bg-gradient-to-br hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] flex items-center justify-center transition-all duration-300 text-[#4a5568] hover:text-[#0a1128] hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://linktr.ee/joshgritzventura" target="_blank" className="w-11 h-11 rounded-xl bg-[#e9ecf3]/[0.6] hover:bg-[#39E09B] flex items-center justify-center transition-all duration-300 text-[#4a5568] hover:text-[#0a1128] hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.18 1.897-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.229.169.334.016.099.036.324.02.498z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ════════════════ CTA FINAL ════════════════ */}
      <section className="py-32 lg:py-40 relative">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,125,245,0.08) 0%, transparent 60%)
          `
        }} />

        <Container className="relative z-10">
          <div className="reveal text-center max-w-2xl mx-auto">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] mb-6">
              ¿Listo para modernizar{" "}
              <span className="bg-gradient-to-r from-[#4f7df5] to-[#a78bfa] bg-clip-text text-transparent">tu partido?</span>
            </h2>
            <p className="text-[#4a5568] text-lg mb-10 leading-relaxed">
              Solicita una demostración sin compromiso y descubre cómo SISTEPARD puede transformar la gestión electoral de tu organización.
            </p>
            <a href="index.html" className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#4f7df5] to-[#a78bfa] text-white font-semibold px-10 py-4 rounded-2xl hover:shadow-2xl hover:shadow-[#4f7df5]/25 transition-all duration-500 text-sm">
              <span>Solicitar Demo</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </a>
          </div>
        </Container>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="bg-[#0a1128] text-white">
        <Container>
          {/* Main footer */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pt-16 pb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f7df5] to-[#a78bfa] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="font-bold text-[15px] tracking-tight">SISTEPARD</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed max-w-[280px]">
                Sistema Electoral Digital para partidos políticos dominicanos. Gestión electoral segura y moderna.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-5">Producto</h4>
              <ul className="space-y-3">
                {[{ l: "Portal de Dirigentes", h: "#producto" }, { l: "Actas Electrónicas", h: "#producto" }, { l: "Gestión Zonal", h: "#producto" }, { l: "Dashboard en Tiempo Real", h: "#producto" }].map((a) => (
                  <li key={a.l}><a href={a.h} className="text-sm text-white/40 hover:text-white transition-colors duration-300">{a.l}</a></li>
                ))}
              </ul>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-5">Plataforma</h4>
              <ul className="space-y-3">
                {[{ l: "Seguridad", h: "#seguridad" }, { l: "Cómo Funciona", h: "#como-funciona" }, { l: "Sobre el Creador", h: "#creador" }, { l: "Solicitar Demo", h: "index.html" }].map((a) => (
                  <li key={a.l}><a href={a.h} className="text-sm text-white/40 hover:text-white transition-colors duration-300">{a.l}</a></li>
                ))}
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-5">Contacto</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:info@sistepard.com" className="text-sm text-white/40 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    info@sistepard.com
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    Solicitar Información
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">&copy; 2026 SISTEPARD. Todos los derechos reservados.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Política de Privacidad</a>
              <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Política de Cookies</a>
              <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Términos</a>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
