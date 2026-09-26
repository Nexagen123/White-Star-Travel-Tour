// bookingPDFService.ts

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getStoredFrontendUser = (): Record<string, any> => {
  try {
    return JSON.parse(
      localStorage.getItem("frontend_user") ||
        localStorage.getItem("admin_user") ||
        "{}",
    );
  } catch {
    return {};
  }
};

const getAgencyName = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  if (booking.agencyName) return booking.agencyName;
  if (storedFrontendUser.companyName) return storedFrontendUser.companyName;
  return "SUPRA TRAVEL & TOURS";
};

const getAgencyPhone = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.phone) {
    return booking.userId.phone;
  }
  if (booking.phone) return booking.phone;
  if (booking.contactPhone) return booking.contactPhone;
  if (booking.contactNumber) return booking.contactNumber;
  if (storedFrontendUser.phone) return storedFrontendUser.phone;
  return "N/A";
};

const formatTicketDate = (dateStr: any): string => {
  if (!dateStr) return "N/A";

  let date: Date;

  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime12 = (time: any): string => {
  if (!time) return "N/A";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "N/A";
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

const formatWeekday = (dateStr: any): string => {
  if (!dateStr) return "";
  let date: Date;
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase();
};

const formatBookingStatus = (status: any): string => {
  const value = String(status || "N/A")
    .replace(/_/g, " ")
    .trim();
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatCurrency = (amount: any): string => {
  const value = Number(amount || 0);
  return `PKR ${value.toLocaleString("en-PK")}`;
};

const getPassengerPrice = (bookingData: any, passenger: any = {}): number => {
  const pricing = bookingData.pricing || {};
  const type = String(passenger.type || "").toLowerCase();

  if (type === "child") return pricing.childPrice || pricing.childTotal || 0;
  if (type === "infant") return pricing.infantPrice || pricing.infantTotal || 0;
  return pricing.adultPrice || pricing.adultTotal || bookingData.price || 0;
};

const getPassengerCountsByType = (passengers: any[]) =>
  passengers.reduce(
    (counts, passenger) => {
      const type = String(passenger.type || "Adult").toLowerCase();
      if (type === "child") counts.children += 1;
      else if (type === "infant") counts.infants += 1;
      else counts.adults += 1;
      return counts;
    },
    { adults: 0, children: 0, infants: 0 },
  );

const getDateOnly = (dateStr: any): string => {
  if (!dateStr) return "";
  if (typeof dateStr === "object" && dateStr.$date) {
    return getDateOnly(dateStr.$date);
  }
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const addDaysToDate = (dateStr: any, days: number): string => {
  const dateOnly = getDateOnly(dateStr);
  if (!dateOnly) return "";
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getDateOnly(date);
};

const getTimeMinutes = (time: any): number | null => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getResolvedFlightArrivalDate = (
  flight: any,
  fallbackDate: any,
): string => {
  const depDate = getDateOnly(
    flight.departureDate || flight.depDate || flight.date,
  );
  const arrDate =
    getDateOnly(flight.arrivalDate || flight.arrDate || flight.arrival_date) ||
    getDateOnly(fallbackDate) ||
    depDate;
  const depMinutes = getTimeMinutes(flight.depTime);
  const arrMinutes = getTimeMinutes(flight.arrTime);

  if (
    depDate &&
    arrDate === depDate &&
    depMinutes !== null &&
    arrMinutes !== null &&
    arrMinutes < depMinutes
  ) {
    return addDaysToDate(depDate, 1);
  }

  return arrDate;
};

const getRouteCodesFromSector = (sector: any, index = 0): string[] => {
  const codes = String(sector || "")
    .toUpperCase()
    .match(/\b[A-Z]{3}\b/g);

  if (codes && codes.length >= index + 2) {
    return [codes[index], codes[index + 1]];
  }

  const match = String(sector || "").match(/\b([A-Z]{3})-([A-Z]{3})\b/i);
  return match ? [match[1].toUpperCase(), match[2].toUpperCase()] : [];
};

const getIataCode = (value: any): string => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "";
};

const getPassengerName = (passenger: any = {}): string =>
  [passenger.title, passenger.givenName, passenger.surName]
    .filter(Boolean)
    .join(" ")
    .trim() || "PASSENGER NAME";

const formatPassengerType = (type: any): string => {
  const value = String(type || "Adult").trim();
  if (!value) return "Adult";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const getPassengerList = (bookingData: any): any[] =>
  bookingData.passengers && bookingData.passengers.length > 0
    ? bookingData.passengers
    : [
        {
          title: "",
          givenName: "PASSENGER",
          surName: "NAME",
          passport: "N/A",
        },
      ];

const getFlightList = (bookingData: any): any[] => {
  const firstFlight =
    bookingData.flights && bookingData.flights[0] ? bookingData.flights[0] : {};

  return bookingData.flights && bookingData.flights.length > 0
    ? bookingData.flights
    : [firstFlight];
};

const getFlightRouteDetails = (
  flight: any,
  bookingData: any,
  index: number,
) => {
  const [flightSectorFrom, flightSectorTo] = getRouteCodesFromSector(
    flight.sector,
  );
  const [bookingSectorFrom, bookingSectorTo] = getRouteCodesFromSector(
    bookingData.sector,
    index,
  );
  const originCode = (
    flight.originCode ||
    flight.sectorFrom ||
    flightSectorFrom ||
    bookingSectorFrom ||
    getIataCode(flight.origin) ||
    getIataCode(flight.originCity) ||
    bookingData.originCode ||
    bookingData.originIata ||
    ""
  ).toUpperCase();
  const destinationCode = (
    flight.destinationCode ||
    flight.sectorTo ||
    flightSectorTo ||
    bookingSectorTo ||
    getIataCode(flight.destination) ||
    getIataCode(flight.destinationCity) ||
    bookingData.destinationCode ||
    bookingData.destinationIata ||
    ""
  ).toUpperCase();
  const originName = (
    flight.origin ||
    flight.originCity ||
    bookingData.origin ||
    bookingData.originCity ||
    originCode ||
    "N/A"
  ).toUpperCase();
  const destinationName = (
    flight.destination ||
    flight.destinationCity ||
    bookingData.destination ||
    bookingData.destinationCity ||
    destinationCode ||
    "N/A"
  ).toUpperCase();

  return {
    originCode: originCode || originName,
    destinationCode: destinationCode || destinationName,
    originName,
    destinationName,
    departureDate: formatTicketDate(
      flight.departureDate ||
        flight.depDate ||
        flight.date ||
        (index === 0
          ? bookingData.departureDate
          : bookingData.returnDate || bookingData.arrivalDate),
    ),
    arrivalDate: formatTicketDate(
      getResolvedFlightArrivalDate(
        flight,
        index === 0
          ? bookingData.departureDate
          : bookingData.returnDate || bookingData.arrivalDate,
      ),
    ),
  };
};

// ==========================================
// CONSTANTS
// ==========================================

const FALLBACK_LOGO_URL =
  "https://img.magnific.com/free-vector/airplane-sky_1308-31202.jpg?semt=ais_hybrid&w=740&q=80";
const FLIGHT_ICON = "https://cdn-icons-png.flaticon.com/512/0/614.png";
const FOOTER_ILLUSTRATION =
  "https://ex-coders.com/html/turmet/assets/img/plane-shape1.png";

// ==========================================
// TYPES (EXPORTED)
// ==========================================

export interface Passenger {
  type?: string;
  title?: string;
  givenName?: string;
  surName?: string;
  passport?: string;
  passportNumber?: string;
  meal?: boolean | string;
  status?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
  nationality?: string;
  passengerType?: string;
}

export interface Flight {
  departureDate?: string;
  depDate?: string;
  date?: string;
  arrivalDate?: string;
  arrDate?: string;
  arrival_date?: string;
  depTime?: string;
  arrTime?: string;
  sector?: string;
  originCode?: string;
  sectorFrom?: string;
  origin?: string;
  originCity?: string;
  destinationCode?: string;
  sectorTo?: string;
  destination?: string;
  destinationCity?: string;
  flightNo?: string;
  airlineName?: string;
  airlineLogo?: string;
  baggage?: string;
  meal?: boolean | string;
  cabinClass?: string;
  class?: string;
}

export interface BookingData {
  pnr?: string;
  status?: string;
  bookingStatus?: string;
  bookingReference?: string;
  bookingId?: string;
  counter?: string;
  _id?: string;
  createdAt?: string;
  departureDate?: string;
  returnDate?: string;
  arrivalDate?: string;
  depTime?: string;
  arrTime?: string;
  flightNumber?: string;
  baggageWeight?: string;
  price?: number;
  sector?: string;
  originCode?: string;
  originIata?: string;
  origin?: string;
  originCity?: string;
  destinationCode?: string;
  destinationIata?: string;
  destination?: string;
  destinationCity?: string;
  email?: string;
  airline?: {
    name?: string;
    logoUrl?: string;
  };
  contactAgency?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  pricing?: {
    adultPrice?: number;
    adultTotal?: number;
    childPrice?: number;
    childTotal?: number;
    infantPrice?: number;
    infantTotal?: number;
    grandTotal?: number;
  };
  passengers?: Passenger[];
  flights?: Flight[];
}

export interface PrintOptions {
  withPrice?: boolean;
}

// ==========================================
// MAIN PRINT FUNCTION
// ==========================================

export function printGDSBooking(
  bookingData: BookingData,
  options: PrintOptions = {},
): void {
  console.log("Print function triggered...", bookingData);
  const withPrice = Boolean(options.withPrice);

  // Extracting necessary data fields from JSON
  const pnr = bookingData.pnr || "N/A";
  const bookingStatus = formatBookingStatus(
    bookingData.status || bookingData.bookingStatus,
  );
  const bookingRef =
    bookingData.bookingReference ||
    bookingData.bookingId ||
    bookingData.counter ||
    bookingData._id ||
    "N/A";

  // Formatting Issue Date (Using createdAt from JSON)
  const issueDateStr = bookingData.createdAt
    ? new Date(bookingData.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const passengers = getPassengerList(bookingData);
  const passengerName = getPassengerName(passengers[0]);
  // Removed unused passengerSummary
  const passengerCounts = getPassengerCountsByType(passengers);

  // COMPACT Passengers HTML - NO SCROLL BAR
  const passengersHTML = passengers
    .map((passenger: Passenger, index: number) => {
      const passportNo =
        passenger.passport || passenger.passportNumber || "N/A";
      const passengerPrice = getPassengerPrice(bookingData, passenger);

      // Format DOB - Short format
      let dob = "N/A";
      if (passenger.dateOfBirth) {
        try {
          const dobDate = new Date(passenger.dateOfBirth);
          if (!isNaN(dobDate.getTime())) {
            dob = dobDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } catch (e) {
          dob = "N/A";
        }
      }

      // Get passport expiry - Short format
      let passportExpiry = "N/A";
      if (passenger.passportExpiry) {
        try {
          const expiryDate = new Date(passenger.passportExpiry);
          if (!isNaN(expiryDate.getTime())) {
            passportExpiry = expiryDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } catch (e) {
          passportExpiry = "N/A";
        }
      }

      // Get nationality
      const nationality = passenger.nationality || "N/A";

      // Get passenger type/title
      const passengerType = formatPassengerType(
        passenger.type || passenger.passengerType,
      );
      const title = passenger.title || "";
      const givenName = passenger.givenName || "";
      const surName = passenger.surName || "";
      const fullName =
        `${title} ${givenName} ${surName}`.trim() ||
        getPassengerName(passenger);

      const displayName = fullName;
      const displayNationality =
        nationality.length > 12
          ? nationality.substring(0, 10) + "..."
          : nationality;

      return `
        <tr class="text-[10px]">
            <td class="py-1 px-1.5 text-gray-500 text-center">${index + 1}</td>
            <td class="py-1 px-1.5 font-semibold text-gray-800 whitespace-nowrap">${displayName}</td>
            <td class="py-1 px-1.5 text-gray-600 text-center">${passengerType}</td>
            <td class="py-1 px-1.5 text-gray-600 text-center whitespace-nowrap">${dob}</td>
            <td class="py-1 px-1.5 text-gray-600 text-center whitespace-nowrap">${displayNationality}</td>
            <td class="py-1 px-1.5 text-gray-600 text-center whitespace-nowrap">${passportNo}</td>
            <td class="py-1 px-1.5 text-gray-600 text-center whitespace-nowrap">${passportExpiry}</td>
            ${withPrice ? `<td class="py-1 px-1.5 text-right font-semibold text-gray-800 whitespace-nowrap">${formatCurrency(passengerPrice)}</td>` : ""}
        </tr>`;
    })
    .join("");

  const flights = getFlightList(bookingData);
  const firstFlight = flights[0] || {};
  const defaultBaggage =
    firstFlight.baggage || bookingData.baggageWeight || "23kg + 7kg";
  // Removed unused checkedBaggage and cabinBaggage

  // Enhanced Airline Logo handling with Salam Air specific fallback
  const airlineName =
    bookingData.airline?.name || firstFlight.airlineName || "Airline";
  const isSalamAir = airlineName.toLowerCase().includes("salam");

  // Primary logo URL
  let AIRLINE_LOGO_URL =
    bookingData.airline?.logoUrl ||
    firstFlight.airlineLogo ||
    FALLBACK_LOGO_URL;

  // Salam Air specific handling
  const SALAM_AIR_LOGO =
    "https://alhaidertravel.pk/storage/airlines/1721135342.png";
  const SALAM_AIR_FALLBACK =
    "https://via.placeholder.com/190x68/2B4C7E/FFFFFF?text=Salam+Air";

  if (isSalamAir) {
    // Force Salam Air logo
    AIRLINE_LOGO_URL = SALAM_AIR_LOGO;
  }

  // Other airline logo overrides
  if (bookingData.airline?.name?.toLowerCase().includes("saudi")) {
    AIRLINE_LOGO_URL =
      "https://upload.wikimedia.org/wikipedia/commons/d/dc/Saudia_logo_2023.png";
  }
  if (bookingData.airline?.name?.toLowerCase().includes("jinnah")) {
    AIRLINE_LOGO_URL =
      "https://api.skypass.pk/uploads/airline_images/1702383592.png";
  }

  const flightCardsHTML = flights
    .map((flight: Flight, index: number) => {
      const route = getFlightRouteDetails(flight, bookingData, index);
      const flightNo = flight.flightNo || bookingData.flightNumber || "N/A";
      const baggage = String(
        flight.baggage || bookingData.baggageWeight || defaultBaggage,
      ).toUpperCase();
      const mealStatus =
        flight.meal === "Yes" || flight.meal === true ? "YES" : "NO";
      const depTime = formatTime12(flight.depTime || bookingData.depTime);
      const arrTime = formatTime12(flight.arrTime || bookingData.arrTime);
      const cabinClass = (
        flight.cabinClass ||
        flight.class ||
        "Economy"
      ).toUpperCase();
      const depRawDate =
        flight.departureDate ||
        flight.depDate ||
        flight.date ||
        (index === 0
          ? bookingData.departureDate
          : bookingData.returnDate || bookingData.arrivalDate);
      const weekday = formatWeekday(depRawDate);
      const status = bookingStatus.toUpperCase();

      return `
        <div class="mb-3">
            <div class="flex items-center gap-2 mb-1.5 text-sm font-bold text-gray-800">
                <span>${route.originName}</span>
                <img src="${FLIGHT_ICON}" class="w-3.5 h-3.5" alt="">
                <span>${route.destinationName}</span>
            </div>
            <div class="border border-blue-100 rounded-lg overflow-hidden">
                <table class="w-full text-left text-[10px]">
                    <thead>
                        <tr class="border-b border-blue-100 bg-gray-50/60">
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Date</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Times</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Flight</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Flight #</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Meal</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Baggage</th>
                            <th class="px-3 py-1.5 font-bold text-gray-700 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="px-3 py-2 font-semibold text-gray-800">${weekday}<br>${route.departureDate.toUpperCase()}</td>
                            <td class="px-3 py-2 font-semibold text-gray-800">${depTime}<br>${arrTime}</td>
                            <td class="px-3 py-2 font-semibold text-gray-800">${route.originName}<br>${route.destinationName}</td>
                            <td class="px-3 py-2 font-semibold text-gray-800">${flightNo}<br>${cabinClass}</td>
                            <td class="px-3 py-2 font-semibold text-gray-800">${mealStatus}</td>
                            <td class="px-3 py-2 font-semibold text-gray-800">${baggage}</td>
                            <td class="px-3 py-2 font-semibold text-emerald-600">${status}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    })
    .join("");

  // Contact/Agency Info
  const agency = bookingData.contactAgency || {};
  const agencyName = agency.name || getAgencyName(bookingData);
  const agencyEmail = agency.email || bookingData.email || "N/A";
  const agencyPhone = agency.phone || getAgencyPhone(bookingData);
  const pricing = bookingData.pricing || {};

  const priceSummaryHTML = withPrice
    ? `
        <div class="mb-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div class="bg-[#2B4C7E] px-3 py-1.5">
                <h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Fare Summary</h3>
            </div>
            <div class="grid grid-cols-4 text-[11px]">
                <div class="p-3 border-r border-gray-100">
                    <p class="text-[9px] text-gray-400 uppercase font-medium">Adults</p>
                    <p class="font-semibold text-gray-800 mt-0.5">${passengerCounts.adults} x ${formatCurrency(pricing.adultPrice || 0)}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">${formatCurrency(pricing.adultTotal || passengerCounts.adults * (pricing.adultPrice || 0))}</p>
                </div>
                <div class="p-3 border-r border-gray-100">
                    <p class="text-[9px] text-gray-400 uppercase font-medium">Children</p>
                    <p class="font-semibold text-gray-800 mt-0.5">${passengerCounts.children} x ${formatCurrency(pricing.childPrice || 0)}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">${formatCurrency(pricing.childTotal || passengerCounts.children * (pricing.childPrice || 0))}</p>
                </div>
                <div class="p-3 border-r border-gray-100">
                    <p class="text-[9px] text-gray-400 uppercase font-medium">Infants</p>
                    <p class="font-semibold text-gray-800 mt-0.5">${passengerCounts.infants} x ${formatCurrency(pricing.infantPrice || 0)}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">${formatCurrency(pricing.infantTotal || passengerCounts.infants * (pricing.infantPrice || 0))}</p>
                </div>
                <div class="p-3 text-right bg-blue-50/50">
                    <p class="text-[9px] text-gray-400 uppercase font-medium">Grand Total</p>
                    <p class="text-base font-bold text-[#2B4C7E] mt-0.5">${formatCurrency(pricing.grandTotal || 0)}</p>
                </div>
            </div>
        </div>`
    : "";

  // HTML Template Generation with COMPACT passenger table
  const ticketHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${airlineName} Ticket Itinerary - ${passengerName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background-color: white; }
        @media print {
            @page { margin: 6mm; size: A4 portrait; }
            .no-print { display: none; }
            body { padding: 0; margin: 0; }
        }
        /* COMPACT TABLE - NO SCROLL */
        .passenger-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px !important;
        }
        .passenger-table th {
            padding: 4px 4px !important;
            font-size: 8px !important;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            background: #f9fafb;
        }
        .passenger-table td {
            padding: 3px 4px !important;
            font-size: 9px !important;
            white-space: nowrap;
        }
        .passenger-table tbody tr {
            border-bottom: 1px solid #f3f4f6;
        }
    </style>
</head>
<body class="p-2 sm:p-4">

    <!-- Ticket Wrapper -->
    <div class="max-w-195 mx-auto bg-white border border-gray-200 rounded-2xl p-4 relative shadow-sm overflow-hidden">
        
        <!-- TOP HEADER SECTION -->
        <div class="flex justify-between items-start mb-3">
            <div>
                <img 
                    src="${AIRLINE_LOGO_URL}" 
                    onerror="this.onerror=null;this.src='${isSalamAir ? SALAM_AIR_FALLBACK : FALLBACK_LOGO_URL}';" 
                    alt="${airlineName}" 
                    style="width: 160px; height: 58px; object-fit: contain; object-position: left center;">
            </div>
            <div class="text-right">
                <h1 class="text-[#2B4C7E] text-xl font-light tracking-wide mb-0.5">${airlineName} Ticket <span class="text-[#F27424] font-medium">Itinerary</span></h1>
                <p class="text-[10px] text-gray-600 font-medium"><span class="text-[#2B4C7E]">PNR:</span> ${pnr}</p>
                <p class="text-[10px] text-gray-600 font-medium"><span class="text-[#2B4C7E]">REF:</span> ${bookingRef}</p>
                <p class="text-[10px] text-gray-600 font-medium"><span class="text-[#2B4C7E]">Status:</span> ${bookingStatus}</p>
                <p class="text-[9px] text-gray-400 mt-0.5">Issue: ${issueDateStr}</p>
            </div>
        </div>

        <!-- COMPACT PASSENGER DETAILS - NO SCROLL BAR -->
        <div class="mb-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div class="bg-[#2B4C7E] px-3 py-1">
                <h3 class="text-[9px] font-bold text-white uppercase tracking-wider">Passenger Details</h3>
            </div>
            <div style="overflow: visible !important;">
                <table class="passenger-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th class="text-left">Name</th>
                            <th>Type</th>
                            <th>DOB</th>
                            <th>Nationality</th>
                            <th>Passport</th>
                            <th>Expiry</th>
                            ${withPrice ? `<th class="text-right">Price</th>` : ""}
                        </tr>
                    </thead>
                    <tbody>
                        ${passengersHTML}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- TRAVEL ITINERARY SECTION HEADER -->
        <h2 class="text-sm font-bold text-gray-900 mb-2">Travel Itinerary</h2>

        <!-- FLIGHT CARDS -->
        ${flightCardsHTML}

        ${priceSummaryHTML}

        <!-- IMPORTANT INFORMATION -->
        <div class="border border-gray-200 rounded-lg p-2.5 bg-white mb-3 relative">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <div class="w-3.5 h-3.5 bg-[#2B4C7E] text-white rounded-full flex items-center justify-center text-[8px] font-bold font-serif">i</div>
                        <h3 class="text-[10px] font-bold text-[#2B4C7E]">TERMS & CONDITIONS</h3>
                    </div>
                    <ul class="text-[9px] text-gray-500 space-y-0.5 list-disc pl-4">
                        <li>This ticket is non-refundable & non-changeable under any circumstances.</li>
                        <li>Passengers must keep their visa and essential travel documents with them.</li>
                        <li>Passengers should arrive at the airport at least 4 hours before departure.</li>
                        <li>For assistance, contact ${agencyName}.</li>
                    </ul>
                </div>
                <div class="w-16 opacity-20 absolute right-2 bottom-2 hidden sm:block">
                    <img src="${FOOTER_ILLUSTRATION}" alt="graphic">
                </div>
            </div>
        </div>

        <!-- FOOTER CONTACT BAR -->
        <div class="grid grid-cols-3 gap-2 border-t border-gray-200 pt-2 text-center text-[9px] text-gray-500">
            <div>
                <p class="font-semibold text-gray-700 text-[9px]">Phone</p>
                <p class="mt-0.5 text-[9px]">${agencyPhone || "+971 50 123 4567"}</p>
            </div>
            <div class="border-x border-gray-100 px-2">
                <p class="font-semibold text-gray-700 text-[9px]">Email</p>
                <p class="mt-0.5 text-[9px]">${agencyEmail}</p>
            </div>
            <div>
                <p class="font-semibold text-gray-700 text-[9px]">Agency</p>
                <p class="mt-0.5 text-[9px]">${agencyName}</p>
            </div>
        </div>

    </div>

</body>
</html>
    `;

  // --- The Iframe Trick ---
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(ticketHTML);
    doc.close();
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print failed", e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
}
