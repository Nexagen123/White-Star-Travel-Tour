import React from "react";
import logo from "../../assets/images/whitestarlogo.png";
import footerbg from "../../assets/images/uk.webp";
import { CiLogin } from "react-icons/ci";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaArrowRight,
  FaFacebookF,
  FaInstagram,
} from "react-icons/fa";
import { IoMail, IoLocationSharp } from "react-icons/io5";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { theme } from "../../theme/theme"; // Utilizing centralized theme configuration

// Updated with the primary number from image_e22900.jpg
const WHATSAPP_URL = "https://wa.me/+923337736611";

export default function Footer({ user }) {
  return (
    <>
      {/* --- TOP CTA: ACTION ZONE --- */}
      {!user?._id && (
        <div
          className="w-full relative overflow-hidden"
          style={{ backgroundColor: theme?.colors?.primaryDark || "#112b4e" }}
        >
          <div className="max-w-7xl mx-auto py-16 px-6 flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
            <div className="text-center lg:text-left text-white max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-md text-[10px] font-bold uppercase tracking-widest border border-white/10">
                <Globe size={12} className="text-orange-400" /> Start Your
                Adventure
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                Your Global Journey <br />
                Starts Right Here.
              </h2>
              <p className="text-white/70 text-sm font-medium max-w-md leading-relaxed">
                Join 5,000+ travelers today. Sign up for exclusive deals, sacred
                Umrah packages, and luxury global tours.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0">
              <Link
                to="/auth/register"
                className="px-8 py-4 text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: theme?.colors?.accent || "#E95432" }}
              >
                <span>Signup Now</span>
                <FaArrowRight size={12} />
              </Link>
              <Link
                to="/auth/login"
                className="px-8 py-4 bg-white text-black rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:bg-neutral-50 flex items-center justify-center gap-2 border border-neutral-200 shadow-sm"
              >
                <span>Login</span>
                <CiLogin size={16} className="font-bold" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN FOOTER --- */}
      <footer className="relative bg-[#0b1a33] text-white overflow-hidden">
        {/* Clean, fixed background texture alignment */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none mix-blend-luminosity bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${footerbg})` }}
        />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Column 1: Brand Info & Socials */}
            <div className="space-y-6">
              <div className="p-2.5 bg-white inline-block rounded-xl">
                <img
                  src={logo}
                  alt="White Star Travel & Tours logo"
                  className="w-28"
                />
              </div>
              <p className="text-gray-400 leading-relaxed text-xs font-medium">
                <span className="text-white font-semibold">
                  White Star Travel & Tours
                </span>{" "}
                makes your travel dreams more beautiful and enjoyable with
                premium, seamless experiences.
              </p>
              {/* Clean layout for Social Platforms */}
              <div className="flex gap-3 pt-2">
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <FaFacebookF size={12} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-pink-600 transition-colors"
                  aria-label="Instagram"
                >
                  <FaInstagram size={12} />
                </a>
                <a
                  href={WHATSAPP_URL}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-green-600 transition-colors"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp size={12} />
                </a>
              </div>
            </div>

            {/* Column 2: Navigation */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white/90">
                Quick Links
              </h3>
              <ul className="space-y-3.5">
                {["Home", "About Us", "Our Packages", "Contact Support"].map(
                  (item) => (
                    <li key={item}>
                      <button className="text-gray-400 hover:text-white transition-colors text-xs font-medium flex items-center gap-2 group">
                        <ChevronTinyRight />
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          {item}
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Column 3: Services */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white/90">
                Top Packages
              </h3>
              <ul className="space-y-3.5 text-xs font-medium text-gray-400">
                {[
                  "Premium Umrah Groups",
                  "UAE Business Tours",
                  "KSA Family Groups",
                  "Visa Consultancy",
                ].map((item) => (
                  <li
                    key={item}
                    className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <span className="w-1 h-1 bg-neutral-600 rounded-full" />{" "}
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact Context Updated from image_e22900.jpg */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white/90">
                Get In Touch
              </h3>
              <div className="space-y-4">
                <a
                  href="https://wa.me/+923337736611"
                  className="group flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <FaWhatsapp size={13} />
                  </div>
                  <span className="text-xs font-medium">0333-7736611</span>
                </a>

                <a
                  href="tel:+923447736611"
                  className="group flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <FaPhoneAlt size={12} />
                  </div>
                  <span className="text-xs font-medium">0344-7736611</span>
                </a>

                <a
                  href="mailto:waqaremakkah@gmail.com"
                  className="group flex items-center gap-3 text-gray-400 hover:text-white transition-colors min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <IoMail size={13} />
                  </div>
                  <span className="text-xs font-medium truncate">
                    waqaremakkah@gmail.com
                  </span>
                </a>

                {/* Branch Address 1 */}
                <div className="flex items-start gap-3 text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <IoLocationSharp size={14} />
                  </div>
                  <span className="text-xs font-medium leading-relaxed">
                    Opposite General Bus Stand, Faisalabad Road, Sumundri.
                  </span>
                </div>

                {/* Branch Address 2 */}
                <div className="flex items-start gap-3 text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <IoLocationSharp size={14} />
                  </div>
                  <span className="text-xs font-medium leading-relaxed">
                    Office # 130, Ground floor, City Mall Chen One Road
                    Faisalabad.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --- BOTTOM BAR --- */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <span>&copy; {dayjs().year()} White Star Travel & Tours</span>
              <span className="hidden sm:block w-1 h-1 bg-neutral-700 rounded-full" />
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>

            <p className="tracking-wide font-medium text-neutral-500 normal-case">
              Developed by{" "}
              <a
                href="https://nexagensolution.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                Nexagen Solution
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function ChevronTinyRight() {
  return (
    <svg
      width="5"
      height="8"
      viewBox="0 0 6 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 9L5 5L1 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
