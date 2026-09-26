import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import emirates from "../../assets/images/airlines/emirates.svg";
import omanair from "../../assets/images/airlines/omanair.png";
import airsial from "../../assets/images/airlines/airsial.png";
import flyjinnah from "../../assets/images/airlines/flyjinnah.png";
import thai from "../../assets/images/airlines/thai.svg";
import qatarairways from "../../assets/images/airlines/qatarairways.svg";
import etihad from "../../assets/images/airlines/etihad.svg";
import gulfair from "../../assets/images/airlines/gulfair.svg";
import turkish from "../../assets/images/airlines/turkish.svg";
import pia from "../../assets/images/airlines/pia.svg";
import airarabia from "../../assets/images/airlines/airarabia.svg";
import flydubai from "../../assets/images/airlines/flydubai.svg";
import kuwaitairways from "../../assets/images/airlines/kuwaitairways.svg";
import britishairways from "../../assets/images/airlines/britishairways.svg";

const partners = [
  { name: "Emirates", logo: emirates },
  { name: "Oman Air", logo: omanair },
  { name: "AirSial", logo: airsial },
  { name: "Fly Jinnah", logo: flyjinnah },
  { name: "Thai Airways", logo: thai },
  { name: "Qatar Airways", logo: qatarairways },
  { name: "Etihad Airways", logo: etihad },
  { name: "Gulf Air", logo: gulfair },
  { name: "Turkish Airlines", logo: turkish },
  { name: "Pakistan International Airlines", logo: pia },
  { name: "Air Arabia", logo: airarabia },
  { name: "flydubai", logo: flydubai },
  { name: "Kuwait Airways", logo: kuwaitairways },
  { name: "British Airways", logo: britishairways },
];

export default function PartnersSection() {
  const scrollRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  // Auto-scroll the strip continuously, looping back to the start once the
  // end is reached; pauses while the user is hovering or manually scrolling.
  useEffect(() => {
    if (isHovering) return;

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 180, behavior: "smooth" });
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <section className="relative bg-white py-16 md:py-20 border-t border-gray-100">
      <div className="max-w-10xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-[#0B2C56]">
            Our Partners
          </p>
          <span className="mt-3 inline-block w-14 h-1 rounded-full bg-linear-to-r from-[#E95432] to-[#F3B43F]" />
        </div>

        <div className="relative flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll partners left"
            className="hidden sm:flex shrink-0 items-center justify-center w-20 h-20 hover:text-[#0B2C56] hover:border-[#0B2C56]/40 transition-colors"
          >
            <ChevronLeft size={38} />
          </button>

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="flex-1 flex items-center gap-6 md:gap-10 overflow-x-auto scroll-smooth px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {partners.map((partner) => (
              <div
                key={partner.name}
                title={partner.name}
                className="shrink-0 flex items-center justify-center h-14 md:h-16 w-28 md:w-32"
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll partners right"
            className="hidden sm:flex shrink-0 items-center justify-center w-20 h-20 hover:text-[#0B2C56] hover:border-[#0B2C56]/40 transition-colors"
          >
            <ChevronRight size={38} />
          </button>
        </div>
      </div>
    </section>
  );
}
