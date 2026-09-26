import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/whitestarlogo.png";
import ukImg from "../../assets/images/uk.webp";
import qatarImg from "../../assets/images/qatar.jpg";
import mascatImg from "../../assets/images/mascat.webp";
import uaeImg from "../../assets/images/uae.webp";
import bahrainImg from "../../assets/images/bahrain.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import madinaImg from "../../assets/images/madina.webp";
import makkahImg from "../../assets/images/makkah.webp";
import hero1 from "../../assets/images/hero1.webp";
import hero2 from "../../assets/images/hero2.webp";
import hero3 from "../../assets/images/hero3.webp";

// ─── Slide backgrounds ────────────────────────────────────────────────────────
const slides = [
  {
    img: makkahImg,
    heading: "Journey to the",
    highlight: "Holy Land",
    sub: "White Star Travel & Tours",
  },
  {
    img: madinaImg,
    heading: "Visit the City of",
    highlight: "Madinah",
    sub: "Exclusive Umrah & Hajj Packages from Pakistan",
  },
  {
    img: hero1,
    heading: "Fly with",
    highlight: "Trusted Agents",
    sub: "Group Flights · UAE · KSA · Qatar · Bahrain · Muscat · UK",
  },
  {
    img: hero2,
    heading: "Your",
    highlight: "Sacred Journey",
    sub: "Affordable Group Seats — Booked in Minutes",
  },
  {
    img: hero3,
    heading: "Explore the",
    highlight: "World",
    sub: "Premium Travel Packages Tailored for You",
  },
];

// ─── Tour group cards ──────────────────────────────────────────────────────────
const heroGroups = [
  { label: "All Groups", image: madinaImg, tag: "Every Route" },
  { label: "UAE Groups", image: uaeImg, tag: "United Arab Emirates" },
  { label: "KSA Groups", image: jeddahImg, tag: "Saudi Arabia" },
  { label: "Bahrain Groups", image: bahrainImg, tag: "Bahrain" },
  { label: "Muscat Groups", image: mascatImg, tag: "Oman" },
  { label: "Qatar Groups", image: qatarImg, tag: "Qatar" },
  { label: "UK Groups", image: ukImg, tag: "United Kingdom" },
  { label: "Umrah Packages", image: makkahImg, tag: "Makkah & Madinah" },
];

// ─── Nav links (shown for logged-out users) ───────────────────────────────────
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Groups", href: "/all-groups" },
  { label: "Umrah", href: "/all-groups?group_type=UMRAH GROUP" },
  { label: "Contact", href: "#contact" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HeroSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [current, setCurrent] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const timerRef = useRef(null);

  // Auth check
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("frontend_token"));
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setCurrent(i);
    timerRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      5000,
    );
  };

  return (
    <>
      <style>{`
        @keyframes heroKen { from { transform: scale(1.08); } to { transform: scale(1); } }
        @keyframes heroFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .hero-fade { animation: heroFade 0.7s ease both; }
      `}</style>

      {/* ══════════ HEADER (logged-out only) ══════════ */}
      {!isLoggedIn && (
        <header
          className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-white border-b border-gray-100"
              : "bg-transparent border-b border-white/10"
          }`}
        >
          <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="shrink-0 flex items-center gap-3">
              <img
                style={{ height: "42px" }}
                aria-label="White Star Travel & Tours"
                src={logo}
                alt="White Star Travel & Tours"
                className="w-auto object-contain"
              />
              <span
                className={`hidden sm:block text-[11px] font-bold uppercase tracking-[0.25em] leading-tight ${
                  scrolled ? "text-[#0B2C56]" : "text-white"
                }`}
              >
                White Star
                <br />
                Travel &amp; Tours
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-10">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className={`relative text-[13px] font-bold uppercase tracking-[0.15em] transition-colors duration-200 group ${
                    scrolled ? "text-[#0B2C56]" : "text-white"
                  }`}
                >
                  {l.label}
                  <span className="absolute -bottom-1.5 left-0 w-0 h-px bg-[#F3B43F] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/auth/login"
                className={`text-[13px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  scrolled
                    ? "text-[#0B2C56] hover:text-[#E95432]"
                    : "text-white hover:text-[#F3B43F]"
                }`}
              >
                Login
              </Link>
              <Link
                to="/auth/register"
                className="text-[13px] font-bold uppercase tracking-[0.15em] px-6 py-3 bg-[#E95432] text-white hover:bg-[#0B2C56] transition-all duration-300"
              >
                Register
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setNavOpen((v) => !v)}
              className={`md:hidden flex flex-col gap-1.5 p-2 ${
                scrolled ? "text-[#0B2C56]" : "text-white"
              }`}
              aria-label="Toggle menu"
            >
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${navOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${navOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${navOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </button>
          </div>

          {/* Mobile menu drawer */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 bg-white ${
              navOpen ? "max-h-96 shadow-xl" : "max-h-0"
            }`}
          >
            <div className="px-6 py-6 flex flex-col gap-5">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  onClick={() => setNavOpen(false)}
                  className="text-[#0B2C56] font-bold uppercase tracking-[0.15em] text-sm pb-3 border-b border-gray-100"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-1">
                <Link
                  to="/auth/login"
                  onClick={() => setNavOpen(false)}
                  className="flex-1 text-center text-xs font-bold uppercase tracking-[0.15em] py-3 border border-[#0B2C56] text-[#0B2C56]"
                >
                  Login
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setNavOpen(false)}
                  className="flex-1 text-center text-xs font-bold uppercase tracking-[0.15em] py-3 bg-[#E95432] text-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#05162E]">
        {/* ── Slideshow backgrounds ── */}
        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={s.img}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  animation: i === current ? "heroKen 6s ease-out both" : "none",
                }}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-linear-to-t from-[#05162E] via-[#05162E]/55 to-[#05162E]/10" />
          <div className="absolute inset-0 bg-linear-to-r from-[#05162E]/80 via-transparent to-transparent" />
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex-1 flex items-center max-w-7xl mx-auto w-full px-5 md:px-10 pt-24">
          <div key={current} className="hero-fade max-w-2xl">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-10 h-px bg-[#F3B43F]" />
              <span className="text-[#F3B43F] text-[11px] font-bold uppercase tracking-[0.35em]">
                Trusted Travel Partner
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-black text-white leading-[0.98] tracking-tight">
              <span className="block">{slides[current].heading}</span>
              <span className="block text-[#F3B43F]">
                {slides[current].highlight}
              </span>
            </h1>

            <p className="mt-6 text-white/70 text-base md:text-lg font-medium max-w-lg leading-relaxed">
              {slides[current].sub}
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap items-center gap-8">
              <Link
                to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
                className="inline-flex items-center gap-3 bg-[#E95432] hover:bg-white hover:text-[#0B2C56] text-white font-bold text-[13px] uppercase tracking-[0.15em] px-8 py-4 transition-all duration-300"
              >
                <span>Book a Ticket</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
              <Link
                to="/all-groups"
                className="text-white font-bold text-[13px] uppercase tracking-[0.15em] border-b border-white/40 pb-1 hover:border-[#F3B43F] hover:text-[#F3B43F] transition-all duration-300"
              >
                View All Groups
              </Link>
            </div>
          </div>
        </div>

        {/* ── Slide index + progress ── */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-5 md:px-10 pb-6">
          <div className="flex items-center gap-4">
            <span className="text-white font-black text-sm tabular-nums">
              {String(current + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="flex-1 h-px bg-white/25 relative overflow-hidden"
                >
                  {i === current && (
                    <span className="absolute inset-0 bg-[#F3B43F] origin-left animate-[heroFade_5s_linear_both]" />
                  )}
                  {i < current && <span className="absolute inset-0 bg-[#F3B43F]" />}
                </button>
              ))}
            </div>
            <span className="text-white/50 font-bold text-sm tabular-nums">
              {String(slides.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* ── Stat legend bar ── */}
        <div className="relative z-10 border-t border-white/10 bg-white/[0.03] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-5 md:px-10 grid grid-cols-3 divide-x divide-white/10">
            {[
              { num: "10,000+", label: "Happy Travellers" },
              { num: "50+", label: "Group Destinations" },
              { num: "14+", label: "Years Experience" },
            ].map((s) => (
              <div key={s.label} className="py-5 px-4 sm:px-8 text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-black text-white">
                  {s.num}
                </p>
                <p className="text-white/50 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ GROUP CARDS STRIP ══════════ */}
      <section className="relative bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-px bg-[#E95432]" />
                <span className="text-[#E95432] text-[11px] font-bold uppercase tracking-[0.35em]">
                  Our Packages
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#0B2C56] tracking-tight">
                Explore Group Travel
              </h2>
            </div>
            <p className="text-gray-500 text-sm md:text-base max-w-sm">
              Choose your destination and let us handle the rest — affordable,
              reliable, fully managed group flights.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
            {heroGroups.map((group, idx) => (
              <Link
                key={group.label}
                to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
                className="group"
              >
                <div className="relative h-56 sm:h-64 overflow-hidden bg-gray-100">
                  <span className="absolute top-3 left-3 z-10 text-white/80 font-black text-xs tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <img
                    src={group.image}
                    alt={group.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-[#05162E]/10 group-hover:bg-[#05162E]/0 transition-colors duration-500" />
                  <div className="absolute inset-0 border border-transparent group-hover:border-[#F3B43F] transition-colors duration-300" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    {group.tag}
                  </p>
                  <h3 className="mt-1 text-base font-black text-[#0B2C56] flex items-center justify-between">
                    {group.label}
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-[#E95432] group-hover:translate-x-1 transition-all duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </h3>
                  <span className="block mt-2 h-px w-0 bg-[#F3B43F] transition-all duration-300 group-hover:w-full" />
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom CTA if not logged in */}
          {!isLoggedIn && (
            <div className="mt-16 pt-12 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm mb-5">
                Create a free account to browse and book group travel packages
              </p>
              <Link
                to="/auth/register"
                className="inline-flex items-center gap-3 bg-[#0B2C56] hover:bg-[#E95432] text-white font-bold text-[13px] uppercase tracking-[0.15em] px-9 py-4 transition-all duration-300"
              >
                Register for Free
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
