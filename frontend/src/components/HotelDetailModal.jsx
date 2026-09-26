import React, { useEffect, useState } from "react";
import { X, MapPin, ImageIcon, Video } from "lucide-react";
import axiosInstance from "../api/axios";

export default function HotelDetailModal({ hotelId, isOpen, onClose }) {
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (!hotelId) {
      setHotel(null);
      setError("Hotel ID is missing.");
      return;
    }

    let canceled = false;
    setLoading(true);
    setError("");
    setHotel(null);

    axiosInstance
      .get(`/hotels/${hotelId}`)
      .then((res) => {
        if (canceled) return;
        if (res.data?.success) {
          setHotel(res.data.data || null);
        } else {
          setError(res.data?.message || "Hotel not found.");
        }
      })
      .catch((err) => {
        if (canceled) return;
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load hotel.",
        );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [hotelId, isOpen]);

  if (!isOpen) return null;

  const numericRating = hotel?.rating || 0;
  const hasImages = hotel?.images?.length > 0;
  const hasVideos = hotel?.videos?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <X size={20} />
        </button>

        <div className="h-full overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-500">
              Loading hotel details...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : hotel ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {hotel.hotelName || "Hotel Details"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {hotel.city ? `${hotel.city}` : "City not available"}
                    {hotel.distance ? ` • ${hotel.distance}m from Haram` : ""}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  <MapPin size={14} />
                  <span>{numericRating.toFixed(1)} / 5 Rating</span>
                </div>
              </div>

              {hotel.mapUrl && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">
                    Map link
                  </div>
                  <a
                    href={hotel.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700"
                  >
                    <MapPin size={16} />
                    Open on map
                  </a>
                </div>
              )}

              <div className="grid gap-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Images
                      </h3>
                      <p className="text-xs text-slate-500">Gallery</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {hasImages ? hotel.images.length : 0} items
                    </div>
                  </div>
                  {hasImages ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {hotel.images.map((src, index) => (
                        <img
                          key={`hotel-image-${index}`}
                          src={src}
                          alt={`${hotel.hotelName || "Hotel"} image ${index + 1}`}
                          className="h-44 w-full rounded-3xl object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
                      No hotel images available.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Videos
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hotel property previews
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {hasVideos ? hotel.videos.length : 0} items
                    </div>
                  </div>
                  {hasVideos ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {hotel.videos.map((src, index) => (
                        <div
                          key={`hotel-video-${index}`}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-black"
                        >
                          <video
                            controls
                            className="h-56 w-full object-cover bg-black"
                          >
                            <source src={src} />
                            Your browser does not support the HTML video tag.
                          </video>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
                      No hotel videos available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-slate-500">
              Select a hotel to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
