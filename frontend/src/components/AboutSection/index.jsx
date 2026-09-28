import React from "react";
import { ChevronRight, MapPin, CheckCircle, Star } from "lucide-react";
import { brandImages } from "../../theme/brandImages";

const highlights = [
  "Premium travel experiences worldwide",
  "Certified & experienced tour guides",
  "Best price guaranteed for all packages",
  "24/7 customer support assistance",
];

const stats = [
  { number: "12K+", label: "Happy Travelers" },
  { number: "45+", label: "Countries Visited" },
  { number: "98%", label: "Satisfaction Rate" },
  { number: "15+", label: "Awards Won" },
];

export default function AboutSection() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-white via-[#F5F8FC] to-white py-24 md:py-32">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-40 top-20 h-112 w-md rounded-full bg-[#10A7D8]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#E95432]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20">
          {/* ── LEFT: Arch image composition ── */}
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-5/6 w-full max-w-lg">
              {/* Offset gold outline */}
              <div className="absolute -left-4 -top-4 h-[92%] w-[80%] rounded-t-full rounded-b-3xl border-2 border-[#F3B43F]/60" />

              {/* Main arch image (height set inline: global `img { height: auto }` beats h-full) */}
              <div className="absolute left-0 top-0 h-[92%] w-[80%] overflow-hidden rounded-t-full rounded-b-3xl shadow-2xl shadow-[#0B2C56]/25">
                <img
                  src={brandImages.makkah}
                  alt="Pilgrims near Makkah for White Star Travel & Tours"
                  style={{ height: "100%" }}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#05162E]/50 via-transparent to-transparent" />
              </div>

              {/* Secondary image */}
              <div className="absolute bottom-0 right-0 h-[42%] w-[46%] overflow-hidden rounded-3xl border-[6px] border-white shadow-2xl shadow-[#0B2C56]/25">
                <img
                  src={brandImages.madina}
                  alt="Madinah travel experience"
                  style={{ height: "100%" }}
                  className="w-full object-cover"
                />
              </div>

              {/* Experience badge */}
              <div className="absolute right-0 top-16 md:right-2">
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-linear-to-br from-[#E95432] to-[#F3B43F] text-white shadow-2xl shadow-[#E95432]/30 ring-4 ring-white">
                  <span className="text-4xl font-black leading-none">15</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest">
                    Years
                  </span>
                  <span className="text-[7px] font-bold uppercase tracking-widest text-white/80">
                    Of Excellence
                  </span>
                </div>
              </div>

              {/* Rating card */}
              <div className="absolute bottom-8 left-3 rounded-2xl border border-white/60 bg-white/95 p-3 shadow-2xl shadow-[#0B2C56]/15 backdrop-blur-xl md:p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-[#0B2C56] to-[#1069A8] text-xs font-bold text-white">
                      A
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-[#E95432] to-[#F3B43F] text-xs font-bold text-white">
                      S
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-[#22c55e] to-[#16a34a] text-xs font-bold text-white">
                      M
                    </div>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-sm font-bold text-[#0B2C56]">
                      4.9
                      <Star
                        size={14}
                        className="fill-[#F3B43F] text-[#F3B43F]"
                      />
                    </p>
                    <p className="text-xs text-[#607086]">1,200+ Reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content ── */}
          <div className="order-1 lg:order-2">
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0B2C56]/10 bg-white px-4 py-2 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E95432]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#0B2C56]">
                About Us
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl font-black leading-[1.08] tracking-tight text-[#0B2C56] md:text-5xl lg:text-6xl">
              Best
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#E95432] to-[#F3B43F]">
                Travel Partner
              </span>
            </h2>

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px w-10 bg-[#E95432]" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#607086]">
                Company Since 2008
              </p>
            </div>

            <p className="mt-6 text-base leading-relaxed text-[#607086] md:text-lg">
              White Star Travel & Tours combines real-time group inventory,
              Umrah package planning, airline coordination, and agent support
              into one dependable travel experience.
            </p>

            {/* Highlights */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="group flex items-start gap-3 rounded-2xl border border-[#D9E4EF] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E95432]/40 hover:shadow-lg hover:shadow-[#0B2C56]/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E95432]/10 text-[#E95432] transition-colors duration-300 group-hover:bg-[#E95432] group-hover:text-white">
                    <CheckCircle className="h-5 w-5" />
                  </span>
                  <span className="pt-1.5 text-sm font-semibold leading-snug text-[#0B2C56]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats band */}
            <div className="relative mt-8 grid grid-cols-2 gap-y-6 overflow-hidden rounded-3xl bg-linear-to-br from-[#0B2C56] to-[#05162E] p-6 md:grid-cols-4 md:divide-x md:divide-white/10">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F3B43F]/15 blur-2xl" />
              {stats.map((stat) => {
                const [, value, suffix] = stat.number.match(/^(\d+)(.*)$/);
                return (
                  <div key={stat.label} className="relative text-center">
                    <div className="text-2xl font-black text-white md:text-3xl">
                      {value}
                      <span className="text-[#F3B43F]">{suffix}</span>
                    </div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/55 md:text-[10px]">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3 md:gap-4">
              <button className="group flex items-center gap-2 rounded-full bg-[#E95432] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#E95432]/30 hover:bg-[#0B2C56] hover:shadow-[#0B2C56]/30 md:px-10">
                Find Tours
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button className="flex items-center gap-2 rounded-full border-2 border-[#0B2C56]/15 bg-white px-6 py-3.5 text-sm font-bold text-[#0B2C56] hover:border-[#E95432] hover:text-[#E95432] md:px-8">
                <MapPin className="h-4 w-4" />
                Find Your Best Destination
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
