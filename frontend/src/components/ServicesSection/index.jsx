import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Plane,
  Moon,
  Shield,
  Bed,
  Map,
  Users,
  Star,
  Clock,
  Sparkles,
} from "lucide-react";

// Keeping your image imports
import service1 from "../../assets/images/service1.webp";
import service2 from "../../assets/images/service2.webp";
import service3 from "../../assets/images/service3.webp";
import service4 from "../../assets/images/service4.webp";
import service5 from "../../assets/images/service5.webp";
import service6 from "../../assets/images/service6.webp";

const services = [
  {
    id: 1,
    title: "Air Tickets",
    icon: <Plane size={20} />,
    description:
      "Global flight bookings with premium lounge access and priority boarding.",
    image: service1,
    tag: "Flight",
    price: "From $299",
    rating: 4.9,
  },
  {
    id: 2,
    title: "Umrah Packages",
    icon: <Moon size={20} />,
    description:
      "Spiritual journeys crafted with luxury stays and private transportation.",
    image: service2,
    tag: "Spiritual",
    price: "From $1,499",
    rating: 4.8,
  },
  {
    id: 3,
    title: "Visa Services",
    icon: <Shield size={20} />,
    description:
      "Fast-track processing with 98% approval rate for all destinations.",
    image: service3,
    tag: "Expertise",
    price: "From $99",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Hotel Packages",
    icon: <Bed size={20} />,
    description:
      "Handpicked 5-star hotels at exclusive rates with complimentary upgrades.",
    image: service4,
    tag: "Comfort",
    price: "From $199/night",
    rating: 4.9,
  },
  {
    id: 5,
    title: "Travel Consultancy",
    icon: <Map size={20} />,
    description:
      "Expert itineraries designed for your budget with 24/7 support.",
    image: service5,
    tag: "Planning",
    price: "From $149",
    rating: 4.6,
  },
  {
    id: 6,
    title: "Meet & Assist",
    icon: <Users size={20} />,
    description:
      "Seamless airport VIP transfers with personal concierge for families.",
    image: service6,
    tag: "VIP",
    price: "From $89",
    rating: 4.9,
  },
];

const stats = [
  { num: "50k+", label: "Tickets Sold" },
  { num: "12k+", label: "Happy Clients" },
  { num: "98%", label: "Satisfaction" },
];

// Distance between two card starts (card width + flex gap), read from the DOM
const getStep = (el) => {
  const card = el?.firstElementChild;
  if (!card) return 0;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  return card.offsetWidth + gap;
};

export default function ServicesSection() {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(services.length - 1);

  // Sync active dot + number of reachable positions with the real scroll state
  const measure = useCallback(() => {
    const el = scrollRef.current;
    const step = getStep(el);
    if (!el || !step) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const max = Math.max(0, Math.round(maxScroll / step));
    const atEnd = el.scrollLeft >= maxScroll - 4;
    setMaxIndex(max);
    setActiveIndex(atEnd ? max : Math.min(max, Math.round(el.scrollLeft / step)));
  }, []);

  const go = useCallback((direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (direction > 0 && el.scrollLeft >= maxScroll - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction < 0 && el.scrollLeft <= 4) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: direction * getStep(el), behavior: "smooth" });
    }
  }, []);

  const goToIndex = (index) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * getStep(el), behavior: "smooth" });
  };

  // Auto-scroll
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => go(1), 4000);
    return () => clearInterval(interval);
  }, [isPaused, go]);

  // Re-measure on mount + resize
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <section className="relative overflow-hidden bg-[#05162E] py-20 md:py-28 font-sans">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-40 right-0 h-112 w-md rounded-full bg-[#10A7D8]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#F3B43F]/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-stretch gap-10 px-5 md:px-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
        {/* ── LEFT: Promo card ── */}
        <aside className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-linear-to-br from-[#F3B43F] via-[#F59E3B] to-[#E95432] p-8 text-[#05162E] shadow-2xl shadow-[#E95432]/20 md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full border-40 border-white/10" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#05162E]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em]">
              <Sparkles size={14} />
              Exclusive Rates
            </span>

            <p className="mt-10 text-lg font-bold">Up To</p>
            <p className="text-[7rem] font-black leading-[0.9] tracking-tighter md:text-[8.5rem]">
              50<span className="align-top text-5xl md:text-6xl">%</span>
            </p>
            <p className="mt-1 text-3xl font-light tracking-[0.35em]">OFF</p>

            <p className="mt-6 max-w-xs text-sm font-medium leading-relaxed text-[#05162E]/75">
              Book now and unlock premium experiences at unbeatable prices.
              Limited time offer.
            </p>
          </div>

          <div className="relative mt-12 flex justify-between gap-3 border-t border-[#05162E]/15 pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black">{s.num}</p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-[#05162E]/65">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* ── RIGHT: Carousel ── */}
        <div
          className="flex min-w-0 flex-col justify-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Header */}
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-[#F3B43F]" />
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F3B43F]">
                  Our Offerings
                </p>
              </div>
              <h3 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Incredible{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F3B43F] to-[#FA7252]">
                  Last-Minute
                </span>{" "}
                Offers
              </h3>
            </div>

            <div className="hidden shrink-0 gap-3 sm:flex">
              <button
                onClick={() => go(-1)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white hover:border-[#F3B43F] hover:bg-[#F3B43F] hover:text-[#05162E]"
                aria-label="Previous offers"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#05162E] hover:bg-[#F3B43F]"
                aria-label="Next offers"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* Cards */}
          <div
            ref={scrollRef}
            onScroll={measure}
            className="-mt-3 -mr-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pt-3 pr-5 pb-8 md:-mr-10 md:pr-10 xl:-mr-[calc((100vw-80rem)/2+2.5rem)] xl:pr-[calc((100vw-80rem)/2+2.5rem)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {services.map((service) => (
              <article
                key={service.id}
                className="group flex w-70 shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-black/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl sm:w-75"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  {/* height set inline: global `img { height: auto }` beats h-full */}
                  <img
                    loading="lazy"
                    src={service.image}
                    alt={service.title}
                    style={{ height: "100%" }}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#05162E]/60 via-transparent to-transparent" />

                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#05162E] shadow-lg">
                      <Star size={12} className="fill-[#F3B43F] text-[#F3B43F]" />
                      {service.rating}
                    </span>
                    <span className="rounded-full border border-white/25 bg-[#05162E]/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      {service.tag}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="relative flex flex-1 flex-col p-6 pt-8">
                  <span className="absolute -top-6 right-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2C56] text-[#F3B43F] shadow-lg ring-4 ring-white transition-colors duration-300 group-hover:bg-[#E95432] group-hover:text-white">
                    {service.icon}
                  </span>

                  <h4 className="text-xl font-bold tracking-tight text-[#0B2C56]">
                    {service.title}
                  </h4>
                  <p className="mt-2 min-h-11 line-clamp-2 text-sm leading-relaxed text-[#607086]">
                    {service.description}
                  </p>

                  <div className="mt-4 mb-5 flex items-center gap-2 text-xs text-[#607086]">
                    <Clock size={14} className="text-[#E95432]" />
                    Limited time offer • Book now
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-[#D9E4EF] pt-5">
                    <p className="text-lg font-black text-[#0B2C56]">
                      {service.price}
                    </p>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9E4EF] text-[#0B2C56] transition-all duration-300 group-hover:border-[#E95432] group-hover:bg-[#E95432] group-hover:text-white">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Progress dots + counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Array.from({ length: maxIndex + 1 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  aria-label={`Go to offers ${index + 1}`}
                  className={`h-2 rounded-full ${
                    index === activeIndex
                      ? "w-8 bg-[#F3B43F]"
                      : "w-2 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-bold tabular-nums text-white/50">
              <span className="text-white">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>{" "}
              / {String(maxIndex + 1).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
