import React, { useState } from "react";
import {
  Plane,
  Hotel,
  Camera,
  Mountain,
  Umbrella,
  MapPin,
  Star,
  Heart,
  Clock,
  Users,
  Globe,
} from "lucide-react";
import { featuredTravelImages } from "../../theme/brandImages";

export default function DestinationsSection() {
  const [activeTab, setActiveTab] = useState("all");

  const destinations = featuredTravelImages.map((item, index) => ({
    ...item,
    id: item.title,
    price: "Live fares",
    rating: [4.9, 4.8, 4.7, 4.9, 4.8, 4.7, 4.8, 4.6][index] || 4.8,
    reviews: [420, 390, 260, 310, 180, 175, 160, 210][index] || 150,
    duration: ["14-28 Days", "14-28 Days", "One Way", "3-7 Days"][index % 4],
    groupSize: "Group seats",
    tags: [item.tag, item.location, "Agent rates"],
  }));

  const categories = [
    {
      id: "all",
      label: "All Destinations",
      icon: <Globe className="w-4 h-4" />,
    },
    { id: "umrah", label: "Umrah", icon: <Umbrella className="w-4 h-4" /> },
    {
      id: "gulf",
      label: "Gulf",
      icon: <Mountain className="w-4 h-4" />,
    },
    { id: "ksa", label: "KSA", icon: <Star className="w-4 h-4" /> },
    { id: "world", label: "World", icon: <Camera className="w-4 h-4" /> },
  ];

  const filteredDestinations =
    activeTab === "all"
      ? destinations
      : destinations.filter((d) => d.category === activeTab);

  return (
    <section className="relative py-24 md:py-32 bg-white overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#E95432]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0B2C56]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0B2C56]/5 border border-[#0B2C56]/10 mb-4">
            <span className="w-1.5 h-1.5 bg-[#E95432] rounded-full"></span>
            <span className="text-[10px] font-bold text-[#0B2C56] uppercase tracking-[0.2em]">
              Top Picks
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#0B2C56] leading-[1.1] mb-4">
            Popular
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#E95432] to-[#F3B43F]">
              Destinations
            </span>
          </h2>

          <p className="text-gray-600 text-base md:text-lg">
            Browse real routes and destination imagery from the White Star
            travel network.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                activeTab === cat.id
                  ? "bg-[#0B2C56] text-white shadow-lg shadow-[#0B2C56]/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>

                {/* Rating Badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-800">
                    {dest.rating}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({dest.reviews})
                  </span>
                </div>

                {/* Wishlist Button */}
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-[#E95432] hover:text-white transition-all duration-300">
                  <Heart className="w-4 h-4" />
                </button>

                {/* Tags */}
                <div className="absolute bottom-4 left-4 flex gap-1.5">
                  {dest.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium rounded-full uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-[#0B2C56] group-hover:text-[#E95432] transition-colors">
                      {dest.title}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {dest.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Service Cards */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Plane className="w-5 h-5" />, label: "Flight Booking" },
            { icon: <Hotel className="w-5 h-5" />, label: "Hotel Stays" },
            { icon: <Clock className="w-5 h-5" />, label: "Fast Updates" },
            { icon: <Users className="w-5 h-5" />, label: "Group Seats" },
          ].map((service, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#E95432]/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="p-2.5 bg-linear-to-br from-[#0B2C56]/10 to-[#E95432]/10 rounded-xl text-[#0B2C56] group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-[#0B2C56]">
                {service.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
