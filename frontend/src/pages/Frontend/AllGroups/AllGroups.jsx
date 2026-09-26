import React, { useContext, useEffect, useState } from "react";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Ticket, Menu, X, ArrowRight } from "lucide-react";
import { FaSuitcase, FaSearch, FaPlaneDeparture } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { groupTypes } from "../../../data/groupTypes";
// NOTE: adjust this relative path to wherever cities.json actually lives in this
// project (it should be the SAME cities.json used in ApiGroups.tsx).
import citiesData from "./cities.json";

const TYPE_TO_CATEGORY = {
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "muscat",
  "UMRAH GROUPS": "umrah",
  "UK ONE WAY GROUP": "uk",
};

// Airline name standardization mapping
const AIRLINE_NAME_MAPPING = {
  // Air Sial variations
  airsial: "Air Sial",
  "air sial": "Air Sial",
  "airsial lhe-dxb": "Air Sial",
  "airsial isb-dxb": "Air Sial",
  "airsial lhe-dmm": "Air Sial",
  "airsial lhe-ruh": "Air Sial",

  // Air Arabia variations
  "air arabia": "Air Arabia",
  airarabia: "Air Arabia",
  "air arabia pew-shj": "Air Arabia",
  "air arabia lyp-shj": "Air Arabia",

  // Fly Jinnah variations
  "fly jinnah": "Fly Jinnah",
  flyjinnah: "Fly Jinnah",
  "fly jinnah lhe-dxb": "Fly Jinnah",
  "fly jinnah isb-shj": "Fly Jinnah",
  "fly jinnah lhe-dmm": "Fly Jinnah",
  "fly jinnah isb-dmm": "Fly Jinnah",

  // FlyDubai variations
  flydubai: "FlyDubai",
  "fly dubai": "FlyDubai",
  "flydubai lyp-ruh": "FlyDubai",

  // flyadeal variations
  flyadeal: "flyadeal",
  "fly adeal": "flyadeal",
  "flyadeal skt-ruh": "flyadeal",
  "flyadeal pew-ruh": "flyadeal",
  "flyadeal isb-ruh": "flyadeal",
  "flyadeal lhe-ruh": "flyadeal",

  // Saudi Airline variations
  "saudi airline": "Saudi Airline",
  saudiairline: "Saudi Airline",
  "saudi airline pew-ruh": "Saudi Airline",
  "saudi airline isb-ruh": "Saudi Airline",
  "saudi airline lhe-ruh": "Saudi Airline",
  "saudi airline umrah mux": "Saudi Airline",

  // Flynas variations
  flynas: "Flynas",
  "fly nas": "Flynas",
  "fly nas lhe-ruh": "Flynas",

  // Salam Air variations
  "salam air": "Salam Air",
  salamair: "Salam Air",
  "salam air mux-mct-jed": "Salam Air",
  "salam air lhe-mct-jed": "Salam Air",
  "salam air pew-mct-jed": "Salam Air",
  "salam air isb-mct-jed": "Salam Air",
};

/**
 * Standardizes airline names to a consistent format
 * @param {string} airlineName - The raw airline name from the API
 * @returns {string} - Standardized airline name or original if no mapping found
 */
const standardizeAirlineName = (airlineName) => {
  if (!airlineName || typeof airlineName !== "string") {
    return "Unknown Airline";
  }

  const normalizedInput = airlineName.trim().toLowerCase();

  // Check if we have a direct mapping
  if (AIRLINE_NAME_MAPPING[normalizedInput]) {
    return AIRLINE_NAME_MAPPING[normalizedInput];
  }

  // Try to find partial matches (in case of extra numbers or formatting)
  for (const [key, value] of Object.entries(AIRLINE_NAME_MAPPING)) {
    if (
      normalizedInput.includes(key) ||
      key.includes(normalizedInput.split(" ")[0])
    ) {
      return value;
    }
  }

  // Extract potential airline name from numbered entries (e.g., "01. airsial lhe-dxb")
  const numberedPattern = /^\d+\.\s*(.+)$/i;
  const match = normalizedInput.match(numberedPattern);
  if (match) {
    const extractedName = match[1].split(" ")[0]; // Take the first word after the number
    if (AIRLINE_NAME_MAPPING[extractedName]) {
      return AIRLINE_NAME_MAPPING[extractedName];
    }
  }

  // If no mapping found, return the original capitalized properly
  return airlineName.charAt(0).toUpperCase() + airlineName.slice(1);
};

// ─── City / Sector Name → IATA Standardization (ported from ApiGroups.tsx) ──────────

const cityLookupMap = new Map();

// Build the map with multiple keys for flexible matching
citiesData.forEach((city) => {
  // Check if city or city.name is null/undefined before processing
  if (!city || !city.name || typeof city.name !== "string" || !city.iata)
    return;

  // Store by IATA code (upper)
  cityLookupMap.set(city.iata.toUpperCase(), city);

  // Store by full name uppercase
  cityLookupMap.set(city.name.toUpperCase(), city);

  // Store by name without "International Airport / Intl / Airport" suffix (uppercase)
  const shortName = city.name
    .replace(
      /\s*(International\s*Airport|International|Intl\.?|Airport)\s*/gi,
      "",
    )
    .trim()
    .toUpperCase();
  if (shortName && shortName !== city.name.toUpperCase()) {
    // Only set if this short name doesn't already map to a different (larger/preferred) airport
    if (!cityLookupMap.has(shortName)) {
      cityLookupMap.set(shortName, city);
    }
  }
});

// ─── Helper to get IATA code from a city name or IATA code ──────────────────────────
const getCityIATAFromData = (cityName) => {
  if (!cityName) return null;

  // Clean the input
  let cleanName = cityName.trim().toUpperCase();

  // Remove any existing IATA code in parentheses (e.g., "MULTAN (MUX)" -> "MULTAN")
  cleanName = cleanName.replace(/\s*\([A-Z]{3}\)\s*/, "").trim();

  // 1. If it's already a 3-letter IATA code, look it up directly
  if (/^[A-Z]{3}$/.test(cleanName)) {
    const data = cityLookupMap.get(cleanName);
    return data ? data.iata : cleanName; // return as-is if it looks like a valid IATA
  }

  // 2. Exact full name match (uppercase)
  if (cityLookupMap.has(cleanName)) {
    return cityLookupMap.get(cleanName).iata;
  }

  // 3. Strip "International Airport / Intl / Airport" and try again
  const stripped = cleanName
    .replace(
      /\s*(INTERNATIONAL\s*AIRPORT|INTERNATIONAL|INTL\.?|AIRPORT)\s*/gi,
      "",
    )
    .trim();
  if (stripped && stripped !== cleanName && cityLookupMap.has(stripped)) {
    return cityLookupMap.get(stripped).iata;
  }

  // 4. Name-without-spaces match
  const noSpaceName = cleanName.replace(/\s+/g, "");
  if (cityLookupMap.has(noSpaceName)) {
    return cityLookupMap.get(noSpaceName).iata;
  }

  // 5. No match — return null
  return null;
};

// ─── Common city name → IATA fallback (for APIs that send plain city names) ─────────
const CITY_NAME_TO_IATA = {
  // Pakistan
  ISLAMABAD: "ISB",
  RAWALPINDI: "ISB",
  KARACHI: "KHI",
  LAHORE: "LHE",
  PESHAWAR: "PEW",
  QUETTA: "UET",
  MULTAN: "MUX",
  FAISALABAD: "LYP",
  SIALKOT: "SKT",
  GWADAR: "GWD",
  TURBAT: "TUK",
  "DERA GHAZI KHAN": "DEA",
  SUKKUR: "SKZ",
  BAHAWALPUR: "BHV",
  "RAHIM YAR KHAN": "RYK",
  // Saudi Arabia
  JEDDAH: "JED",
  JEDDA: "JED",
  RIYADH: "RUH",
  MECCA: "HEA",
  MAKKAH: "HEA",
  MEDINA: "MED",
  MADINAH: "MED",
  DAMMAM: "DMM",
  ABHA: "AHB",
  TAIF: "TIF",
  TABUK: "TUU",
  HAIL: "HAS",
  YANBU: "YNB",
  NAJRAN: "EAM",
  JIZAN: "GIZ",
  // UAE
  DUBAI: "DXB",
  "ABU DHABI": "AUH",
  SHARJAH: "SHJ",
  // Oman
  MUSCAT: "MCT",
  SALALAH: "SLL",
  // Kuwait
  KUWAIT: "KWI",
  "KUWAIT CITY": "KWI",
  // Qatar
  DOHA: "DOH",
  // Bahrain
  BAHRAIN: "BAH",
  MANAMA: "BAH",
  // Other common
  ISTANBUL: "IST",
  "KUALA LUMPUR": "KUL",
  BANGKOK: "BKK",
  LONDON: "LHR",
  TORONTO: "YYZ",
};

// Enrich getCityIATAFromData with the plain-name fallback
const resolveCityToIATA = (cityName) => {
  if (!cityName) return null;
  // Strip trailing/leading punctuation and extra whitespace (e.g. "DAMMAM." → "DAMMAM")
  const cleaned = String(cityName)
    .trim()
    .replace(/[.\-,;:!?]+$/, "")
    .trim();
  if (!cleaned) return null;
  const iata = getCityIATAFromData(cleaned);
  if (iata) return iata;
  // Try plain city name map
  const upper = cleaned.toUpperCase();
  return CITY_NAME_TO_IATA[upper] || null;
};

// ─── Pull a 3-letter IATA code out of a string like "Lahore (LHE)" ──────────────────
const extractIATA = (str) => {
  if (!str) return "";
  const match = String(str).match(/\(([A-Z]{3})\)/);
  return match ? match[1] : String(str).trim();
};

// ─── Resolve any raw origin/destination/sector-part string to its IATA code,
// falling back to whatever was already extractable, then to the raw value ──────────
const toDisplayIATA = (raw) => {
  if (!raw) return "";
  return resolveCityToIATA(raw) || extractIATA(raw) || String(raw).trim();
};

// ─── Convert a sector string like "LAHORE-DAMMAM" to "LHE-DMM" ──────────────────────
const formatSectorToIATA = (sector) => {
  if (!sector) return sector;
  return sector
    .replace(/\.+$/, "") // strip trailing dots
    .split("-")
    .map((part) => {
      const clean = part.trim();
      return resolveCityToIATA(clean) || clean;
    })
    .join("-");
};

// ─── Split a sector string into individual origin→destination flight legs,
// each carrying its resolved IATA codes (used when a group has no `details`) ────────
const parseSectorIntoFlights = (sector) => {
  if (!sector) return [];

  const cities = sector.split("-").map((c) => c.trim().toUpperCase());
  if (cities.length < 2) return [];

  const flights = [];
  for (let i = 0; i < cities.length - 1; i++) {
    const origin = cities[i];
    const destination = cities[i + 1];
    const originIATA = resolveCityToIATA(origin) || origin;
    const destIATA = resolveCityToIATA(destination) || destination;
    flights.push({ origin, destination, originIATA, destIATA });
  }
  return flights;
};

const getCategoryFromGroup = (group = {}) => {
  const type = String(group?.type || "")
    .toUpperCase()
    .trim();

  return TYPE_TO_CATEGORY[type] || "";
};

// ─── Fixed "Type" filter buttons (only these — matches the site-wide filter
// bar). Each group's raw `type` field can arrive in different shapes
// depending on its source (admin/own groups use "XXX Groups", API feeds use
// "XXX ONE WAY GROUP"), so we normalize all known shapes down to one of the
// category keys below before matching against the selected button. ─────────
const TYPE_FILTER_BUTTONS = [
  { value: "all", label: "All Types" },
  { value: "uae", label: "UAE One Way" },
  { value: "ksa", label: "KSA One Way" },
  { value: "oman", label: "Oman One Way" },
  { value: "bahrain", label: "Bahrain One Way" },
  { value: "umrah", label: "Umrah" },
];

const EXACT_TYPE_TO_FILTER_CATEGORY = {
  // API / travel-network style
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "KSA ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "oman",
  "BAHRAIN ONE WAY GROUP": "bahrain",
  "QATAR ONE WAY GROUP": "qatar",
  "UK ONE WAY GROUP": "uk",
  "UMRAH GROUP": "umrah",
  "UMRAH GROUPS": "umrah",
  // Admin / own-group style
  "UAE GROUPS": "uae",
  "KSA GROUPS": "ksa",
  "BAHRAIN GROUPS": "bahrain",
  "MASCAT GROUPS": "oman",
  "MUSCAT GROUPS": "oman",
  "QATAR GROUPS": "qatar",
  "UK GROUPS": "uk",
};

// ─── Pakistan airport IATA codes (derived from cities.json's ISO country
// field) — used to detect Umrah-bound round trips below. ────────────────────
const PAKISTAN_IATA_CODES = new Set(
  citiesData
    .filter((c) => c && c.iso === "PK" && c.iata)
    .map((c) => c.iata.toUpperCase()),
);

// Umrah gateway airports — pilgrims fly into Jeddah or Madina (Makkah itself
// has no airport), so these are the destinations that mark an Umrah trip.
const UMRAH_DESTINATION_IATA = new Set(["JED", "MED"]);

// Matches raw type strings like "2 WAY GROUP" / "Two Way" / "Round Trip"
// coming from upstream feeds that don't have a dedicated Umrah type yet.
// Abid Air's listing seat count isn't reliable enough to gate visibility on
// (real availability is confirmed live at booking time), so its groups are
// never hidden for appearing to have zero seats.
const isAbidAirGroup = (group = {}) =>
  String(group?.source || group?.packageSource || "").toLowerCase() ===
  "abid-air";

const isTwoWayType = (rawType) =>
  /2\s*-?\s*WAY|TWO\s*-?\s*WAY|ROUND\s*-?\s*TRIP/i.test(rawType || "");

// Some providers (e.g. SkyPass) don't send a reliable "two way" type string
// at all — but a round-trip group's `sector` already spells out the return
// leg, e.g. "LHE-JED-JED-LHE" or "LHE-JED-LHE". Prefer that as the signal,
// and only fall back to the raw type text when the sector is just a plain
// two-city string. If such a group departs from Pakistan and its route
// includes Jeddah or Madina, treat it as an Umrah group for filtering.
const isTwoWayUmrahGroup = (group = {}) => {
  const sectorParts = formatSectorToIATA(
    String(group?.sector || "")
      .toUpperCase()
      .trim(),
  )
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);

  if (sectorParts.length < 2) return false;

  const origin = sectorParts[0];
  const lastStop = sectorParts[sectorParts.length - 1];

  // Round trip if the route comes back to its origin, or (for a plain
  // origin-destination sector with no visible return leg) the raw type
  // text explicitly says so.
  const isRoundTrip =
    sectorParts.length > 2 ? origin === lastStop : isTwoWayType(group?.type);

  if (!isRoundTrip) return false;

  const hasUmrahDestination = sectorParts.some((p) =>
    UMRAH_DESTINATION_IATA.has(p),
  );

  return PAKISTAN_IATA_CODES.has(origin) && hasUmrahDestination;
};

// Groups whose `type` doesn't match any of the fixed buttons above simply
// won't match a specific filter (they still show under "All Types").
const getTypeFilterCategory = (group = {}) => {
  const raw = String(group?.type || "")
    .toUpperCase()
    .trim();

  if (!raw) return null;

  // Round-trip ("2 WAY") groups from Pakistan to Jeddah/Madina belong in the
  // Umrah filter even when their raw type has no "UMRAH" wording.
  if (isTwoWayUmrahGroup(group)) return "umrah";

  if (EXACT_TYPE_TO_FILTER_CATEGORY[raw]) {
    return EXACT_TYPE_TO_FILTER_CATEGORY[raw];
  }

  if (raw.includes("UAE")) return "uae";
  if (raw.includes("BAHRAIN")) return "bahrain";
  if (raw.includes("QATAR")) return "qatar";
  if (raw.includes("OMAN") || raw.includes("MUSCAT") || raw.includes("MASCAT"))
    return "oman";
  if (raw.includes("UK") || raw.includes("UNITED KINGDOM")) return "uk";
  if (raw.includes("UMRAH")) return "umrah";
  if (raw.includes("KSA") || raw.includes("SAUDI") || raw === "ONE WAY GROUP")
    return "ksa";

  return null;
};

export default function AllGroupsPackages({
  headerType,
  header,
  searchParams,
  user,
}) {
  const navigate = useNavigate();
  const dashboardUI = useContext(DashboardUIContext);

  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  // Tracks which airline cards had their logo fail to load, so we can fall
  // back to a text label instead of another airline's hardcoded logo
  // (e.g. Salam Air's image was previously reused as a generic fallback,
  // which made flyadeal/other cards wrongly show the Salam Air logo).
  const [logoLoadErrors, setLogoLoadErrors] = useState({});

  const [dbMargin, setDbMargin] = useState(null);
  const [groupMargins, setGroupMargins] = useState({});
  const [bookedSeatsMap, setBookedSeatsMap] = useState({});
  const [groupBookedSeatsMap, setGroupBookedSeatsMap] = useState({});

  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    searchKeyword: "",
    departDate: null,
  });

  // Advanced Search is OFF by default. Previously there was an effect here
  // that force-set this back to `true` any time `dashboardUI` changed —
  // since that context value also changes on scroll, it was silently
  // re-opening Advanced Search right after the user manually closed it.
  // That effect has been removed; the toggle is now fully user-controlled.
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);

  // ── Type filter (dynamic buttons, mirrors ApiGroups.tsx behaviour) ──────
  const [selectedType, setSelectedType] = useState("all");

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    return value?.substring(0, 5) || "—";
  };

  const calculatePriceAfterMargin = (groupPrice, group = {}) => {
    if (user?.priceOnCall) return null;

    let priceAfterMargin = Number(groupPrice) || 0;
    const originalPrice = Number(groupPrice) || 0;

    const marginType = user?.marginType;
    const marginPercent = Number(user?.flightMarginPercent) || 0;
    const marginAmount = Number(user?.flightMarginAmount) || 0;

    if (marginType === "Percentage" && marginPercent > 0) {
      priceAfterMargin += (priceAfterMargin * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      priceAfterMargin += marginAmount;
    }

    if (priceAfterMargin === originalPrice) {
      const category = getCategoryFromGroup(group);
      const categoryKey = `group-category-${category}`;
      const categoryMargin = groupMargins?.[categoryKey]?.marginAmount;

      if (typeof categoryMargin === "number") {
        priceAfterMargin += categoryMargin;
      }
    }

    if (priceAfterMargin === originalPrice) {
      const indMargin = group?.individualMargin;

      if (indMargin !== null && indMargin !== undefined) {
        priceAfterMargin += Number(indMargin) || 0;
      }
    }

    if (priceAfterMargin === originalPrice && dbMargin) {
      if (dbMargin.type === "percent" && Number(dbMargin.value) > 0) {
        priceAfterMargin += (priceAfterMargin * Number(dbMargin.value)) / 100;
      } else if (dbMargin.type === "amount" && Number(dbMargin.value) > 0) {
        priceAfterMargin += Number(dbMargin.value);
      }
    }

    if (priceAfterMargin < 0) priceAfterMargin = 0;

    return Math.round(priceAfterMargin);
  };

  const getGroupId = (group = {}) => {
    return String(group.id || group._id || group.groupId || "");
  };

  const getAvailableSeats = (group = {}) => {
    const baseSeats = Number(group.available_no_of_pax) || 0;
    const bookedSeats = groupBookedSeatsMap[getGroupId(group)] || 0;

    return Math.max(0, baseSeats - bookedSeats);
  };

  const getBookedSeatsForApiGroup = (group = {}) => {
    const flight = group.details?.[0];

    if (!flight) return 0;

    const flightNo = flight.flight_no || flight.flightNo;
    const rawDate = flight.dep_date || flight.flight_date;

    if (!flightNo || !rawDate) return 0;

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) return 0;

    const dateKey = date.toISOString().split("T")[0];
    const key = `${normalizeFlightNoKey(flightNo)}_${dateKey}`;

    return bookedSeatsMap[key] || 0;
  };

  const getSeatCount = (group = {}) => {
    if (Array.isArray(group.seats)) return group.seats.length;
    if (Array.isArray(group.seat)) return group.seat.length;

    const baseSeats = Number(group.available_no_of_pax) || 0;

    if (group.isOwnGroup) {
      return getAvailableSeats(group);
    }

    const bookedSeats = getBookedSeatsForApiGroup(group);

    return Math.max(0, baseSeats - bookedSeats);
  };

  // ─── Identity of a "flight" for de-duplication purposes: same sector,
  // same airline (already the grouping key), same flight number(s) and same
  // date(s). Two listings that only differ in price are the SAME flight —
  // we only ever want to display the cheapest one that still has seats,
  // and automatically fall back to the next cheapest once that one sells out.
  const normalizeIdentityValue = (value) =>
    String(value || "")
      .toUpperCase()
      .trim();

  const normalizeFlightNoKey = (value) =>
    normalizeIdentityValue(value).replace(/[^A-Z0-9]/g, "");

  const normalizeDateKey = (value) => String(value || "").slice(0, 10);

  const normalizeTimeKey = (value) =>
    String(value || "")
      .slice(0, 5)
      .trim();

  const getComparablePrice = (group = {}) => {
    const priceAfterMargin = calculatePriceAfterMargin(group.price, group);
    return Number(priceAfterMargin ?? group.price) || 0;
  };

  const getFlightIdentityKey = (group = {}) => {
    const details = group.details || [];
    const sector = formatSectorToIATA(
      normalizeIdentityValue(group.sector || "Unknown"),
    );

    if (details.length > 0) {
      const legs = details
        .map((d) => {
          const origin = toDisplayIATA(d.origin || "");
          const destination = toDisplayIATA(d.destination || "");
          const legSector =
            origin || destination ? `${origin}-${destination}` : sector;
          const flightNo = normalizeFlightNoKey(
            d.flight_no || d.flightNo || group.flightNo,
          );
          const depDate = normalizeDateKey(
            d.dep_date || d.flight_date || group.dept_date,
          );
          return `${legSector}|${flightNo}|${depDate}`;
        })
        .join(">");

      return `${sector}||${legs}`;
    }

    return [
      sector,
      normalizeFlightNoKey(group.flightNo || group.flight_no),
      normalizeDateKey(group.dept_date || group.dep_date || group.flight_date),
    ].join("|");
  };

  // Given a list of groups that represent the same flight (per the identity
  // key above), keep only the cheapest one that currently has seats. If the
  // cheapest sells out, the next cheapest with seats takes its place.
  const pickCheapestAvailablePerFlight = (list) => {
    const byKey = new Map();

    list.forEach((group) => {
      const key = getFlightIdentityKey(group);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(group);
    });

    const result = [];

    byKey.forEach((candidates) => {
      const sortedByPrice = [...candidates].sort(
        (a, b) => getComparablePrice(a) - getComparablePrice(b),
      );
      const cheapestAvailable = sortedByPrice.find(
        (g) => isAbidAirGroup(g) || getSeatCount(g) > 0,
      );

      if (cheapestAvailable) result.push(cheapestAvailable);
    });

    return result;
  };

  const getDays = (group = {}) => {
    let days = Number(group.days) || 0;

    if (group.details && group.details.length > 1) {
      const firstRaw =
        group.details[0].dep_date || group.details[0].flight_date;
      const lastRaw =
        group.details[group.details.length - 1].dep_date ||
        group.details[group.details.length - 1].flight_date;

      if (firstRaw && lastRaw) {
        const firstDate = new Date(firstRaw);
        const lastDate = new Date(lastRaw);

        if (
          !Number.isNaN(firstDate.getTime()) &&
          !Number.isNaN(lastDate.getTime())
        ) {
          const diff = Math.round(
            (lastDate - firstDate) / (1000 * 60 * 60 * 24),
          );

          if (diff > 0) days = diff;
        }
      }
    }

    return days;
  };

  const getAirlineLogoUrl = (data) => {
    // Known airlines get a hardcoded logo FIRST — the upstream API (e.g.
    // SkyPass) sometimes sends a wrong/mismatched `logo_url` for these
    // (e.g. Riyadh Air tickets pointing at Salam Air's image), so we can't
    // trust `data.airlineLogo` for names we already know how to render.
    if (data.airline.includes("Air Sial")) {
      return "https://api.skypass.pk/uploads/airline_images/1702383533.png";
    }
    if (data.airline.includes("Riyadh")) {
      return "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Riyadh_Air_Logo.svg/3840px-Riyadh_Air_Logo.svg.png";
    }
    if (data.airline.includes("Salam Air")) {
      return "https://alhaidertravel.pk/storage/airlines/1721135342.png";
    }
    if (data.airline.includes("Fly Jinnah")) {
      return "https://api.skypass.pk/uploads/airline_images/1702383592.png";
    }
    if (data.airline.toLowerCase().includes("flyadeal")) {
      return "https://img.wway.io/pics/root/F3@png?exar=1&rs=fit:80:40";
    }

    if (data.airlineLogo) return data.airlineLogo;

    if (data.airlineCode) {
      return `https://img.wway.io/pics/root/${data.airlineCode}@png?exar=1&rs=fit:80:40`;
    }

    return null;
  };

  const applyFilters = (dataToFilter = allGroups) => {
    let filtered = [...dataToFilter];

    // Filter by the fixed "Type" buttons (normalized category of each
    // group's raw `type` field — see getTypeFilterCategory)
    if (selectedType !== "all") {
      filtered = filtered.filter(
        (g) => getTypeFilterCategory(g) === selectedType,
      );
    }

    if (filters.sectors.length > 0) {
      filtered = filtered.filter((g) =>
        filters.sectors.includes(
          formatSectorToIATA((g.sector || "").toUpperCase().trim()),
        ),
      );
    }

    if (filters.airlines.length > 0) {
      // Apply standardization to airline names during filtering
      filtered = filtered.filter((g) => {
        const standardizedAirlineName = g.airline?.airline_name
          ? standardizeAirlineName(g.airline.airline_name)
          : g.airline?.airline_name;
        return filters.airlines.includes(standardizedAirlineName);
      });
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();

      filtered = filtered.filter((g) => {
        // Standardize airline name for search comparison
        const standardizedAirlineName = g.airline?.airline_name
          ? standardizeAirlineName(g.airline.airline_name).toLowerCase()
          : g.airline?.airline_name?.toLowerCase();

        // Also let the search match against the IATA-formatted sector
        // (e.g. typing "dxb" should match a sector stored as "DUBAI-LAHORE")
        const iataSector = formatSectorToIATA(g.sector || "").toLowerCase();

        const matchesSector = g.sector?.toLowerCase().includes(keyword);
        const matchesIataSector = iataSector.includes(keyword);
        const matchesAirline = standardizedAirlineName?.includes(keyword);
        const matchesGroupName = g.groupName?.toLowerCase().includes(keyword);
        const matchesFlightNo = g.details?.some((flight) =>
          flight.flight_no?.toLowerCase().includes(keyword),
        );
        const matchesPnr = g.pnr?.toLowerCase().includes(keyword);

        return (
          matchesSector ||
          matchesIataSector ||
          matchesAirline ||
          matchesGroupName ||
          matchesFlightNo ||
          matchesPnr
        );
      });
    }

    if (filters.departDate) {
      const selectedDate =
        filters.departDate instanceof Date
          ? filters.departDate
          : new Date(filters.departDate);

      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      filtered = filtered.filter((g) => {
        if (!g.dept_date) return false;

        const [year, month, day] = String(g.dept_date)
          .slice(0, 10)
          .split("-")
          .map(Number);

        return (
          year === selectedYear &&
          month - 1 === selectedMonth &&
          day === selectedDay
        );
      });
    }

    setGroups(filtered);
  };

  const fetchBookedSeats = async () => {
    try {
      const res = await axiosInstance.get("/bookings/getBookedSeats");
      const byGroup = res.data?.data?.breakdown?.byGroup || [];
      const map = {};

      byGroup.forEach((group) => {
        if (!group.groupId) return;
        map[String(group.groupId)] = Number(group.totalSeats) || 0;
      });

      setGroupBookedSeatsMap(map);
    } catch (err) {
      console.error("Error fetching booked seats:", err);
      setGroupBookedSeatsMap({});
    }
  };

  const fetchBookingVoucher = async () => {
    try {
      const res = await axiosInstance.get("/bookings/");
      const map = {};

      const bookings = res.data?.data || [];

      bookings.forEach((booking) => {
        const passengersLength = booking.passengers?.length || 0;

        booking.flights?.forEach((flight) => {
          if (!flight.flightNo || !flight.depDate) return;

          const date = new Date(flight.depDate);

          if (Number.isNaN(date.getTime())) return;

          const key = `${normalizeFlightNoKey(flight.flightNo)}_${
            date.toISOString().split("T")[0]
          }`;

          if (booking.status !== "cancelled") {
            map[key] = (map[key] || 0) + passengersLength;
          }
        });
      });

      setBookedSeatsMap(map);
    } catch (err) {
      console.error("Error fetching booking voucher:", err);
      setBookedSeatsMap({});
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);

      const groupType = searchParams?.get("group_type") || "";

      const [unifiedRes, marginRes, groupMarginRes] = await Promise.allSettled([
        axiosInstance.get("/sector/getUnifiedGroups"),
        axiosInstance.get("/sector/getMargin"),
        axiosInstance.get("/group-margin/all"),
      ]);

      if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
        setDbMargin(marginRes.value.data.data);
      }

      if (
        groupMarginRes.status === "fulfilled" &&
        groupMarginRes.value.data?.success
      ) {
        setGroupMargins(groupMarginRes.value.data.data || {});
      }

      let fetchedGroups =
        unifiedRes.status === "fulfilled" && unifiedRes.value.data?.success
          ? unifiedRes.value.data.data || []
          : [];

      if (groupType) {
        const gtEntry = groupTypes.find((g) => g.value === groupType);

        if (groupType === "UMRAH GROUP") {
          const allData =
            unifiedRes.status === "fulfilled" && unifiedRes.value.data?.success
              ? unifiedRes.value.data.data || []
              : {};

          fetchedGroups = allData.filter((g) => g.type === "Umrah Groups");
        } else {
          fetchedGroups = fetchedGroups.filter(
            (g) => !(g.isOwnGroup && g.type === "Umrah Groups"),
          );

          fetchedGroups = fetchedGroups.filter((g) => {
            if (g.isOwnGroup) {
              if (!gtEntry?.ownGroupType) return true;
              return g.type === gtEntry.ownGroupType;
            }

            return g.type === groupType;
          });
        }
      }

      // Standardize airline names in the fetched groups
      const standardizedGroups = fetchedGroups.map((group) => ({
        ...group,
        airline: {
          ...group.airline,
          airline_name: group.airline?.airline_name
            ? standardizeAirlineName(group.airline.airline_name)
            : group.airline?.airline_name,
        },
      }));

      const uniqueAirlines = [
        ...new Set(
          standardizedGroups
            .map((g) => g.airline?.airline_name)
            .filter(Boolean),
        ),
      ];

      // Build the sectors filter list using the IATA-standardized form so the
      // sidebar checkboxes show "LHE-DXB" instead of "LAHORE-DUBAI" etc, and so
      // groups that arrive with differently-formatted (but equivalent) sector
      // strings collapse into the same filter entry.
      const uniqueSectors = [
        ...new Set(
          standardizedGroups
            .map((g) =>
              formatSectorToIATA((g.sector || "").toUpperCase().trim()),
            )
            .filter(Boolean),
        ),
      ];

      setAirlines(uniqueAirlines.sort());
      setSectors(uniqueSectors.sort());
      setAllGroups(standardizedGroups);
      applyFilters(standardizedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Failed to load groups");
      setAllGroups([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "sector") {
      setFilters((prev) => ({
        ...prev,
        sectors: prev.sectors.includes(value)
          ? prev.sectors.filter((s) => s !== value)
          : [...prev.sectors, value],
      }));
    } else if (filterType === "airline") {
      // Standardize the airline name when adding to filters
      const standardizedValue = standardizeAirlineName(value);
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(standardizedValue)
          ? prev.airlines.filter((a) => a !== standardizedValue)
          : [...prev.airlines, standardizedValue],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  const handleBookNow = (group) => {
    const skypassTicketId =
      group.source === "skypass"
        ? String(group.id || "")
            .replace(/^skypass_/, "")
            .split("_")[0]
        : null;
    // Abid Air's listing seat count isn't reliable — leave available_no_of_pax
    // as the backend sent it rather than overwriting it with our locally
    // computed (and, for Abid Air, unreliable) seat math.
    const seatOverride = isAbidAirGroup(group)
      ? {}
      : { available_no_of_pax: getSeatCount(group) };

    navigate("/dashboard/booking", {
      state: {
        groupData: {
          ...group,
          ...seatOverride,
          _skypassTicketId: skypassTicketId,
        },
      },
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
    fetchBookingVoucher();
    fetchBookedSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allGroups, selectedType]);

  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div
            className="h-11 mb-3 w-full"
            style={{
              background: theme.colors.backgroundDark,
              borderRadius: theme.borderRadius.sm,
            }}
          />
          {[1, 2].map((j) => (
            <div
              key={j}
              className="h-16 mb-2"
              style={{
                background: theme.colors.backgroundDark,
                borderRadius: theme.borderRadius.sm,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const sectorFirstSeen = {};

  const groupedData = groups.reduce((acc, group) => {
    // Normalize to IATA form so groups that arrive from different sources
    // with differently-formatted (but equivalent) sector strings — e.g.
    // "LAHORE-DUBAI" vs "LHE-DXB" — collapse into the same card instead of
    // rendering as separate tables for what is really the same route.
    const sector = formatSectorToIATA(
      (group.sector || "Unknown").toUpperCase().trim(),
    );
    const airlineName = group.airline?.airline_name || "";
    const key = `${sector}|||${airlineName}`;

    if (!(sector in sectorFirstSeen)) {
      sectorFirstSeen[sector] = Object.keys(sectorFirstSeen).length;
    }

    if (!acc[key]) {
      acc[key] = {
        airline: airlineName,
        airlineLogo: group.airline?.logo_url || null,
        airlineCode: group.airline?.short_name || null,
        sector,
        groups: [],
      };
    }

    acc[key].groups.push(group);

    return acc;
  }, {});

  const getMinDate = (card) => {
    const dates = card.groups
      .map((g) => g.dept_date)
      .filter(Boolean)
      .sort();

    return dates[0] || "9999-99-99";
  };

  const sortedGroupedEntries = Object.entries(groupedData).sort(
    ([, a], [, b]) => {
      const sectorOrderA = sectorFirstSeen[a.sector] ?? 999;
      const sectorOrderB = sectorFirstSeen[b.sector] ?? 999;

      if (sectorOrderA !== sectorOrderB) return sectorOrderA - sectorOrderB;

      if (a.airline !== b.airline) return a.airline.localeCompare(b.airline);

      return getMinDate(a).localeCompare(getMinDate(b));
    },
  );

  const visibleGroupedEntries = sortedGroupedEntries
    .map(([key, data]) => {
      const visibleGroups = pickCheapestAvailablePerFlight(data.groups);

      return [
        key,
        {
          ...data,
          groups: visibleGroups,
        },
      ];
    })
    .filter(([, data]) => data.groups.length > 0);

  /* ---------- Filter sidebar content ---------- */
  const FilterContent = () => (
    <>
      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: theme.colors.textPrimary, letterSpacing: "0.04em" }}
      >
        Airlines
      </h3>

      <div
        className="space-y-0.5 max-h-64 overflow-y-auto"
        style={{ paddingRight: theme.spacing.xs }}
      >
        {airlines.map((airline) => {
          const standardizedAirline = standardizeAirlineName(airline);
          return (
            <label
              key={airline}
              className="flex items-center gap-2.5 cursor-pointer transition-colors"
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.colors.backgroundDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={filters.airlines.includes(standardizedAirline)}
                onChange={() => handleFilterChange("airline", airline)}
                className="w-3.5 h-3.5"
                style={{
                  accentColor: theme.colors.intermediate,
                  borderRadius: theme.borderRadius.sm,
                }}
              />
              <span
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {standardizedAirline}
              </span>
            </label>
          );
        })}
      </div>

      <div
        className="my-5"
        style={{ height: "1px", background: theme.colors.border }}
      />

      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: theme.colors.textPrimary, letterSpacing: "0.04em" }}
      >
        Sectors
      </h3>

      <div
        className="space-y-0.5 max-h-64 overflow-y-auto"
        style={{ paddingRight: theme.spacing.xs }}
      >
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2.5 cursor-pointer transition-colors"
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.backgroundDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-3.5 h-3.5"
              style={{
                accentColor: theme.colors.intermediate,
                borderRadius: theme.borderRadius.sm,
              }}
            />
            <span
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {sector}
            </span>
          </label>
        ))}
      </div>
    </>
  );

  /* ---------- Sophisticated geometric route indicator ---------- */
  const SectorRoute = ({
    origin,
    destination,
    depTime,
    arvTime,
    isReturn = false,
  }) => {
    const accentColor = isReturn
      ? theme.colors.accent
      : theme.colors.intermediate;

    // Resolve whatever raw city/airport string came from the API into a clean
    // IATA code for display (e.g. "Lahore" / "LAHORE" / "Lahore (LHE)" -> "LHE").
    const displayOrigin = toDisplayIATA(origin);
    const displayDestination = toDisplayIATA(destination);

    return (
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full">
        <div className="text-right min-w-0">
          <div
            className="text-xs sm:text-sm font-bold whitespace-nowrap"
            style={{ color: theme.colors.textPrimary }}
          >
            {displayOrigin || "—"}
          </div>
          <div
            className="text-[10px] sm:text-xs whitespace-nowrap"
            style={{ color: theme.colors.textTertiary }}
          >
            {formatTime(depTime)}
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 min-w-5 sm:min-w-9 relative">
          <span
            className="shrink-0 rounded-full"
            style={{
              width: "5px",
              height: "5px",
              background: accentColor,
            }}
          />
          <span
            className="flex-1"
            style={{
              height: "1px",
              background: theme.colors.borderDark,
            }}
          />
          <ArrowRight
            size={12}
            strokeWidth={2.25}
            style={{ color: accentColor, flexShrink: 0 }}
          />
        </div>

        <div className="text-left min-w-0">
          <div
            className="text-xs sm:text-sm font-bold whitespace-nowrap"
            style={{ color: theme.colors.textPrimary }}
          >
            {displayDestination || "—"}
          </div>
          <div
            className="text-[10px] sm:text-xs whitespace-nowrap"
            style={{ color: theme.colors.textTertiary }}
          >
            {formatTime(arvTime)}
          </div>
        </div>
      </div>
    );
  };

  const LegCell = ({ children, index }) => {
    return (
      <div
        className="h-11 flex items-center"
        style={
          index > 0
            ? {
                borderTop: `1px solid ${theme.colors.border}`,
              }
            : undefined
        }
      >
        {children}
      </div>
    );
  };

  return (
    <>
      <TopBar title={"Group Tickets"} />

      <div
        className="w-full min-h-screen px-3 sm:px-4 lg:px-6"
        style={{ background: theme.colors.background }}
      >
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 py-2 ${
            headerType === "dashboard" ? "rounded-t-2xl" : ""
          }`}
        >
          <div className="w-full xl:w-auto">
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className="text-sm font-semibold mr-2"
                style={{ color: theme.colors.textSecondary }}
              >
                Type:
              </span>
              {TYPE_FILTER_BUTTONS.map(({ value, label }) => (
                <button
                  style={{
                    fontSize: "0.6rem",
                  }}
                  type="button"
                  key={value}
                  onClick={() => setSelectedType(value)}
                  className={`rounded-full border px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm font-medium transition ${
                    selectedType === value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {label}
                </button>
              ))}
              {selectedType !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedType("all")}
                  className="text-xs text-red-500 hover:text-red-700 ml-1"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-3">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-4.5 transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.intermediate
                        : theme.colors.borderDark,
                      borderRadius: theme.borderRadius.full,
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 transition-transform ${
                        showAdvancedSearch ? "translate-x-3.5" : ""
                      }`}
                      style={{
                        background: theme.colors.card,
                        borderRadius: theme.borderRadius.full,
                        boxShadow: theme.shadows.sm,
                      }}
                    />
                  </div>
                </div>

                <span
                  className="ml-2 text-xs font-medium whitespace-nowrap"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Advanced Search
                </span>
              </label>

              {showAdvancedSearch && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-1.5"
                  style={{
                    background: theme.colors.backgroundDark,
                    color: theme.colors.textSecondary,
                    borderRadius: theme.borderRadius.sm,
                  }}
                >
                  <Menu size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="w-full sm:w-48">
                <MaskedDatePicker
                  value={filters.departDate}
                  onChange={(date) => handleFilterChange("departDate", date)}
                  placeholderText="Departure Date"
                  minDate={new Date()}
                  size="small"
                />
              </div>

              <div className="flex-1 lg:w-52 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.searchKeyword}
                  onChange={(e) =>
                    handleFilterChange("searchKeyword", e.target.value)
                  }
                  className="w-full px-3 py-1.5 focus:outline-none text-xs"
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                    borderRadius: theme.borderRadius.sm,
                    background: theme.colors.card,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.intermediateLight}26`;
                    e.currentTarget.style.borderColor =
                      theme.colors.intermediateLight;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                />
                <FaSearch
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: theme.colors.textTertiary }}
                />
              </div>
            </div>
          </div>
        </div>

        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(11, 44, 86, 0.45)" }}
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div
              className="absolute right-0 top-0 h-full w-[82vw] max-w-80 p-5 sm:p-6"
              style={{
                background: theme.colors.card,
                boxShadow: theme.shadows.lg,
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2
                  className="text-base font-semibold"
                  style={{ color: theme.colors.textPrimary }}
                >
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  style={{ color: theme.colors.textSecondary }}
                >
                  <X size={18} />
                </button>
              </div>

              <FilterContent />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 pt-3 pb-6">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-56 shrink-0">
              <div
                className="sticky top-6"
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                }}
              >
                <FilterContent />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-hidden">
            {loading ? (
              <div
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                }}
              >
                <LoadingSkeleton />
              </div>
            ) : visibleGroupedEntries.length === 0 ? (
              <div
                className="p-8 text-center text-sm"
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.textTertiary,
                }}
              >
                No groups available at the moment
              </div>
            ) : (
              visibleGroupedEntries.map(([key, data]) => {
                const sectorParts = data.sector?.split("-") || [];
                // Resolve the sector header's origin/destination fallback values
                // (used by single-leg groups that don't carry a `details` array)
                // to clean IATA codes instead of raw city names.
                const origin = toDisplayIATA(sectorParts[0] || "");
                const destination = toDisplayIATA(
                  sectorParts[sectorParts.length - 1] || data.sector,
                );
                const hasMultiLeg = data.groups.some(
                  (g) => g.details && g.details.length > 1,
                );

                return (
                  <div
                    key={key}
                    className="overflow-hidden"
                    style={{
                      background: theme.colors.card,
                      border: `1px solid ${theme.colors.border}`,
                      boxShadow: theme.shadows.sm,
                      borderRadius: theme.borderRadius.lg,
                    }}
                  >
                    {/* Carrier header — flat, minimal */}
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-0"
                      style={{
                        borderBottom: `1px solid ${theme.colors.border}`,
                        background: theme.colors.card,
                      }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center justify-center shrink-0 w-11 h-11 sm:w-14 sm:h-14 lg:w-17.5 lg:h-17.5">
                          {(() => {
                            const logoUrl = logoLoadErrors[key]
                              ? null
                              : getAirlineLogoUrl(data);
                            return logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={data.airlineCode || data.airline}
                                className="w-full h-full object-contain"
                                onError={() => {
                                  setLogoLoadErrors((prev) => ({
                                    ...prev,
                                    [key]: true,
                                  }));
                                }}
                              />
                            ) : (
                              <span
                                className="font-semibold text-sm"
                                style={{ color: theme.colors.textPrimary }}
                              >
                                {data.airline}
                              </span>
                            );
                          })()}
                        </div>

                        <div
                          className="shrink-0"
                          style={{
                            width: "1px",
                            height: "20px",
                            background: theme.colors.border,
                          }}
                        />

                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: theme.colors.textPrimary }}
                        >
                          {data.airline}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <FaPlaneDeparture
                          size={11}
                          style={{ color: theme.colors.textTertiary }}
                        />
                        <span
                          className="font-semibold text-xs tracking-wide whitespace-nowrap"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatSectorToIATA(data.sector)}
                        </span>
                      </div>
                    </div>

                    {/* Responsive: scrolls horizontally on narrow screens instead of squashing columns; table keeps a sane minimum width so every column stays legible */}
                    <div className="overflow-x-auto w-full">
                      <table className="w-full table-fixed border-collapse min-w-170">
                        <thead>
                          <tr
                            className="text-xs font-semibold"
                            style={{
                              background: theme.colors.intermediate,
                              color: "#ffffff",
                            }}
                          >
                            <th
                              className="text-left whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width: "11%" /* FIX: Set explicit width */,
                              }}
                            >
                              Date
                            </th>
                            <th
                              className="text-left whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width: "9%" /* FIX: Set explicit width */,
                              }}
                            >
                              Flight
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width:
                                  "24%" /* FIX: Removed min-w-140 and set flexible width */,
                              }}
                            >
                              Sector
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width: "10%" /* FIX: Set explicit width */,
                              }}
                            >
                              Bag
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width: "8%" /* FIX: Set explicit width */,
                              }}
                            >
                              Meal
                            </th>
                            {hasMultiLeg && (
                              <th
                                className="text-center whitespace-nowrap"
                                style={{
                                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                  borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                  width: "8%" /* FIX: Set explicit width */,
                                }}
                              >
                                Days
                              </th>
                            )}
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                width: "14%" /* FIX: Set explicit width */,
                              }}
                            >
                              Fare
                            </th>
                            <th
                              className="whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                width: "8%" /* FIX: Set explicit width */,
                              }}
                            ></th>
                          </tr>
                        </thead>

                        <tbody>
                          {[...data.groups]
                            .sort((a, b) => {
                              const dateDiff =
                                new Date(a.dept_date) - new Date(b.dept_date);

                              if (dateDiff !== 0) return dateDiff;

                              return (
                                getComparablePrice(a) - getComparablePrice(b)
                              );
                            })
                            .map((group, rowIdx) => {
                              const seatCount = getSeatCount(group);
                              const details = group.details || [];
                              const flight = details[0];
                              const lastFlight = details[details.length - 1];
                              const isMultiLeg = details.length > 1;
                              // Fallback legs parsed straight from the sector
                              // string when the API didn't provide a details
                              // array (mirrors ApiGroups.tsx behaviour).
                              const sectorFallbackFlights =
                                details.length === 0
                                  ? parseSectorIntoFlights(group.sector || "")
                                  : [];

                              return (
                                <tr
                                  key={group.id || group._id}
                                  className="transition-colors"
                                  style={{
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                    background:
                                      rowIdx % 2 === 0
                                        ? theme.colors.card
                                        : theme.colors.background,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      theme.colors.backgroundDark;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      rowIdx % 2 === 0
                                        ? theme.colors.card
                                        : theme.colors.background;
                                  }}
                                >
                                  <td
                                    className="text-xs font-medium whitespace-nowrap align-top truncate"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      color: theme.colors.textSecondary,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {isMultiLeg ? (
                                      <div className="flex flex-col">
                                        {details.map((d, i) => {
                                          const rawDate =
                                            d.dep_date || d.flight_date;

                                          return (
                                            <LegCell key={i} index={i}>
                                              <span
                                                className="font-semibold text-sm whitespace-nowrap"
                                                style={{
                                                  color:
                                                    theme.colors.textPrimary,
                                                }}
                                              >
                                                {formatDate(rawDate)}
                                              </span>
                                            </LegCell>
                                          );
                                        })}
                                      </div>
                                    ) : flight ? (
                                      <span
                                        className="font-semibold text-sm whitespace-nowrap"
                                        style={{
                                          color: theme.colors.textPrimary,
                                        }}
                                      >
                                        {formatDate(
                                          flight.dep_date || flight.flight_date,
                                        )}
                                      </span>
                                    ) : (
                                      formatDate(group.dept_date)
                                    )}
                                  </td>

                                  {/* FIX 1: Flight column ki width kam kar di (se 14%) taake Sector ko zyada space mile */}
                                  <td
                                    className="align-top"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                      width: "14%",
                                    }}
                                  >
                                    {isMultiLeg ? (
                                      <div className="flex flex-col">
                                        {details.map((d, i) => (
                                          <LegCell key={i} index={i}>
                                            <div className="flex flex-col truncate">
                                              <span
                                                className="font-bold text-sm whitespace-nowrap leading-tight"
                                                style={{
                                                  color:
                                                    theme.colors.textPrimary,
                                                }}
                                              >
                                                {d.flight_no?.toUpperCase() ||
                                                  "—"}
                                              </span>
                                              {i === 0 &&
                                                group.airline?.airline_name && (
                                                  <span
                                                    className="text-[10px] whitespace-nowrap leading-tight truncate"
                                                    style={{
                                                      color:
                                                        theme.colors
                                                          .textTertiary,
                                                    }}
                                                  >
                                                    {group.airline.airline_name}
                                                  </span>
                                                )}
                                            </div>
                                          </LegCell>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col truncate">
                                        <span
                                          className="font-semibold text-sm whitespace-nowrap"
                                          style={{
                                            color: theme.colors.textPrimary,
                                          }}
                                        >
                                          {flight?.flight_no?.toUpperCase() ||
                                            "—"}
                                        </span>
                                        {group.airline?.airline_name && (
                                          <span
                                            className="text-[10px] whitespace-nowrap leading-tight truncate"
                                            style={{
                                              color: theme.colors.textTertiary,
                                            }}
                                          >
                                            {group.airline.airline_name}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  <td
                                    className="align-top w-full"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {isMultiLeg ? (
                                      <div className="flex flex-col">
                                        {details.map((d, i) => (
                                          <LegCell key={i} index={i}>
                                            <div className="w-full flex justify-center">
                                              <SectorRoute
                                                origin={d.origin}
                                                destination={d.destination}
                                                depTime={d.dept_time}
                                                arvTime={d.arv_time}
                                                isReturn={i % 2 !== 0}
                                              />
                                            </div>
                                          </LegCell>
                                        ))}
                                      </div>
                                    ) : details.length === 0 &&
                                      sectorFallbackFlights.length > 1 ? (
                                      // No `details` array at all and the sector
                                      // string encodes multiple legs (e.g.
                                      // "LAHORE-MUSCAT-JEDDAH") — render each leg.
                                      <div className="flex flex-col">
                                        {sectorFallbackFlights.map((leg, i) => (
                                          <LegCell key={i} index={i}>
                                            <div className="w-full flex justify-center">
                                              <SectorRoute
                                                origin={leg.originIATA}
                                                destination={leg.destIATA}
                                                isReturn={i % 2 !== 0}
                                              />
                                            </div>
                                          </LegCell>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex justify-center">
                                        <SectorRoute
                                          origin={flight?.origin || origin}
                                          destination={
                                            lastFlight?.destination ||
                                            destination
                                          }
                                          depTime={flight?.dept_time}
                                          arvTime={
                                            lastFlight?.arv_time ||
                                            flight?.arv_time
                                          }
                                        />
                                      </div>
                                    )}
                                  </td>

                                  <td
                                    className="text-center align-top"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {isMultiLeg ? (
                                      <div className="flex flex-col items-center">
                                        {details.map((d, i) => (
                                          <LegCell key={i} index={i}>
                                            <div className="w-full flex justify-center">
                                              {d.baggage ? (
                                                <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                  <FaSuitcase
                                                    className="shrink-0"
                                                    style={{
                                                      color:
                                                        theme.colors
                                                          .textTertiary,
                                                    }}
                                                  />
                                                  <span
                                                    style={{
                                                      color:
                                                        theme.colors
                                                          .textSecondary,
                                                    }}
                                                  >
                                                    {d.baggage}KG
                                                  </span>
                                                </div>
                                              ) : (
                                                <span
                                                  className="text-xs"
                                                  style={{
                                                    color:
                                                      theme.colors.textTertiary,
                                                  }}
                                                >
                                                  —
                                                </span>
                                              )}
                                            </div>
                                          </LegCell>
                                        ))}
                                      </div>
                                    ) : flight?.baggage ? (
                                      <div className="inline-flex items-center gap-1 text-xs font-medium">
                                        <FaSuitcase
                                          className="shrink-0"
                                          style={{
                                            color: theme.colors.textTertiary,
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: theme.colors.textSecondary,
                                          }}
                                        >
                                          {flight.baggage}KG
                                        </span>
                                      </div>
                                    ) : (
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: theme.colors.textTertiary,
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>

                                  <td
                                    className="text-center align-top"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {isMultiLeg ? (
                                      <div className="flex flex-col items-center">
                                        {details.map((d, i) => (
                                          <LegCell key={i} index={i}>
                                            <div className="w-full flex justify-center">
                                              <span
                                                className="inline-block text-[11px] font-semibold px-2 py-0.5"
                                                style={
                                                  d.meal && d.meal !== "No"
                                                    ? {
                                                        background: "#e6efe9",
                                                        color: "#2f6b4f",
                                                        borderRadius:
                                                          theme.borderRadius.sm,
                                                      }
                                                    : {
                                                        background:
                                                          theme.colors
                                                            .backgroundDark,
                                                        color:
                                                          theme.colors
                                                            .textTertiary,
                                                        borderRadius:
                                                          theme.borderRadius.sm,
                                                      }
                                                }
                                              >
                                                {d.meal && d.meal !== "No"
                                                  ? "Yes"
                                                  : "No"}
                                              </span>
                                            </div>
                                          </LegCell>
                                        ))}
                                      </div>
                                    ) : (
                                      <span
                                        className="inline-block text-[11px] font-semibold px-2 py-0.5"
                                        style={
                                          flight?.meal && flight.meal !== "No"
                                            ? {
                                                background: "#e6efe9",
                                                color: "#2f6b4f",
                                                borderRadius:
                                                  theme.borderRadius.sm,
                                              }
                                            : {
                                                background:
                                                  theme.colors.backgroundDark,
                                                color:
                                                  theme.colors.textTertiary,
                                                borderRadius:
                                                  theme.borderRadius.sm,
                                              }
                                        }
                                      >
                                        {flight?.meal && flight.meal !== "No"
                                          ? "Yes"
                                          : "No"}
                                      </span>
                                    )}
                                  </td>

                                  {hasMultiLeg && (
                                    <td
                                      className="text-center align-middle"
                                      style={{
                                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                        borderRight: `1px solid ${theme.colors.border}`,
                                      }}
                                    >
                                      {isMultiLeg && getDays(group) > 0 ? (
                                        <span
                                          className="inline-block text-xs font-semibold px-2 py-0.5"
                                          style={{
                                            background:
                                              theme.colors.backgroundDark,
                                            color: theme.colors.textPrimary,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.borderRadius.sm,
                                          }}
                                        >
                                          {getDays(group)}
                                        </span>
                                      ) : (
                                        <span
                                          className="text-xs"
                                          style={{
                                            color: theme.colors.textTertiary,
                                          }}
                                        >
                                          —
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  <td
                                    className="text-center whitespace-nowrap align-middle truncate"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {user?.priceOnCall ? (
                                      <span
                                        className="text-sm font-bold"
                                        style={{
                                          color: theme.colors.textPrimary,
                                        }}
                                      >
                                        On Call
                                      </span>
                                    ) : (
                                      <div
                                        className="text-base font-bold"
                                        style={{
                                          color: theme.colors.textPrimary,
                                        }}
                                      >
                                        PKR{" "}
                                        {calculatePriceAfterMargin(
                                          group.price,
                                          group,
                                        )?.toLocaleString()}
                                      </div>
                                    )}
                                  </td>

                                  {/* FIX 2: Ticket Icon wapas add kar diya hai */}
                                  <td
                                    className="align-middle"
                                    style={{
                                      padding: "4px 6px",
                                      width: "85px",
                                      minWidth: "85px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleBookNow(group)}
                                      disabled={!user?.showHideButton}
                                      className="flex items-center justify-center gap-1 transition-colors whitespace-nowrap w-full leading-none"
                                      style={{
                                        height: "26px",
                                        minWidth: "75px",
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        letterSpacing: "0.2px",
                                        borderRadius: "4px",
                                        padding: "0 4px",
                                        background: user?.showHideButton
                                          ? theme.colors.accent
                                          : theme.colors.border,
                                        color: user?.showHideButton
                                          ? "#ffffff"
                                          : theme.colors.textTertiary,
                                        cursor: user?.showHideButton
                                          ? "pointer"
                                          : "not-allowed",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (user?.showHideButton) {
                                          e.currentTarget.style.background =
                                            theme.colors.accentDark;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (user?.showHideButton) {
                                          e.currentTarget.style.background =
                                            theme.colors.accent;
                                        }
                                      }}
                                    >
                                      {/* Icon wapas aa gaya! */}
                                      <Ticket size={12} className="shrink-0" />
                                      <span>Book Now</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
