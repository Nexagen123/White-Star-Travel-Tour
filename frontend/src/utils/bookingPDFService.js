// export const printGDSBooking = (booking) => {
//   // --- 1. Helper Functions ---
//   const formatFullDate = (dateStr) => {
//     if (!dateStr) return "";

//     // Handle YYYY-MM-DD safely without timezone shifting
//     if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
//       const [year, month, day] = dateStr.split("-").map(Number);
//       return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
//         weekday: "short",
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       });
//     }

//     return new Date(dateStr).toLocaleDateString("en-GB", {
//       weekday: "short",
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   // --- 2. Data Preparation (Preserving your logic + adding PDF specific helpers) ---
//   const flight = booking.flights?.[0] || {};

//   // Booking Status
//   const bookingStatus = (
//     booking.status ||
//     booking.bookingStatus ||
//     "N/A"
//   ).toUpperCase();

//   // Airline & Logos
//   const airlineName = (
//     booking.airline?.name ||
//     flight.airlineName ||
//     "AIRLINE"
//   ).toUpperCase();
//   // Note: Ensure this path is accessible from the browser window, or use a Base64 string if possible
//   // const agencyLogo = "/src/assets/images/logo.webp";
//   const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";

//   // Booking Refs
//   const pnr = booking.pnr || booking.bookingReference || "N/A";
//   // const bookingRef = booking.bookingReference || pnr;

//   // // Flight Details
//   // const flightNum = booking.flightNumber || flight.flightNo || "XX000";
//   // // Location Logic
//   // const origin = (
//   //     booking.origin ||
//   //     booking.originCity ||
//   //     flight.origin ||
//   //     ""
//   // ).toUpperCase();

//   // Try multiple sources for IATA / airport codes (flight, booking, sector fields)
//   let originCode = (
//     booking.originCode ||
//     flight.originCode ||
//     booking.originIata ||
//     flight.sectorFrom ||
//     ""
//   ).toUpperCase();

//   // const dest = (
//   //     booking.destination ||
//   //     booking.destinationCity ||
//   //     flight.destination ||
//   //     ""
//   // ).toUpperCase();

//   let destCode = (
//     booking.destinationCode ||
//     flight.destinationCode ||
//     booking.destinationIata ||
//     flight.sectorTo ||
//     ""
//   ).toUpperCase();

//   // If still missing, try parsing from booking.sector (e.g. "ISB-AUH")
//   if (
//     (!originCode || !originCode.trim() || originCode === "") &&
//     booking.sector
//   ) {
//     const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
//     if (sectorMatch) originCode = sectorMatch[1];
//   }
//   if ((!destCode || !destCode.trim() || destCode === "") && booking.sector) {
//     const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
//     if (sectorMatch) destCode = sectorMatch[2];
//   }

//   // Final fallback to show 'N/A' instead of a static hard-coded IATA
//   originCode = originCode || "N/A";
//   destCode = destCode || "N/A";

//   // Time Logic
//   // const depTime = flight.depTime || booking.depTime || "00:00";
//   // const arrTime = flight.arrTime || booking.arrTime || "00:00";
//   // const depDate = formatFullDate(booking.departureDate);
//   // const arrDate = formatFullDate(booking.arrivalDate || booking.departureDate);

//   // // Baggage & Sector
//   // const baggage = booking.baggageWeight || flight.baggage || "20KG";
//   // const sector = `${origin} (${originCode}) - ${dest} (${destCode})`;

//   // // Plane Icon (Base64 from your PDF code)
//   // const planeIconBase64 =
//   //     "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

//   // Passengers (Logic adapted to handle array like the PDF, defaulting to your single passenger extract if needed)
//   const passengers =
//     booking.passengers && booking.passengers.length > 0
//       ? booking.passengers
//       : [
//           {
//             title: booking.passengers?.[0]?.title || "",
//             givenName: booking.passengers?.[0]?.givenName || "PASSENGER",
//             surName: booking.passengers?.[0]?.surName || "NAME",
//             passport: "N/A",
//           },
//         ];

//   // Frontend user fallback (safe parse)
//   // const storedFrontendUser = (() => {
//   //     try {
//   //         return JSON.parse(localStorage.getItem("frontend_user") || "{}");
//   //     } catch (e) {
//   //         return {};
//   //     }
//   // })();

//   // Dynamic fields (never static)
//   // const issuedBy =
//   //     booking.issuedBy ||
//   //     storedFrontendUser.companyName ||
//   //     storedFrontendUser.name ||
//   //     "N/A";

//   // const agencyName =
//   //     (booking.userId && booking.userId.companyName) ||
//   //     booking.agencyName ||
//   //     storedFrontendUser.companyName ||
//   //     "N/A";

//   // const phoneNumber =
//   //     (booking.userId && booking.userId.phone) ||
//   //     booking.phone ||
//   //     storedFrontendUser.phone ||
//   //     "N/A";

//   // --- 3. Build per-flight sections & passenger rows ---
//   const bookingId =
//     booking.bookingReference ||
//     booking.bookingId ||
//     booking.counter ||
//     booking._id ||
//     "N/A";
//   const flightsArr =
//     booking.flights && booking.flights.length > 0 ? booking.flights : [flight];

//   const flightSectionsHTML = flightsArr
//     .map((f, index) => {
//       const fNum = f.flightNo || booking.flightNumber || "XX000";
//       const fAirline = (
//         f.airlineName ||
//         booking.airline?.name ||
//         "AIRLINE"
//       ).toUpperCase();
//       const fBaggage = f.baggage || booking.baggageWeight || "20KG";
//       const fDepTime = f.depTime || booking.depTime || "00:00";
//       const fArrTime = f.arrTime || booking.arrTime || "00:00";

//       let fOriginCode = (f.originCode || f.sectorFrom || "").toUpperCase();
//       let fDestCode = (f.destinationCode || f.sectorTo || "").toUpperCase();
//       const fOriginCity = (f.origin || f.originCity || "").toUpperCase();
//       const fDestCity = (
//         f.destination ||
//         f.destinationCity ||
//         ""
//       ).toUpperCase();

//       if (!fOriginCode && f.sector) {
//         const m = f.sector.match(/([A-Z]{3})-([A-Z]{3})/);
//         if (m) {
//           fOriginCode = m[1];
//           fDestCode = m[2];
//         }
//       }
//       fOriginCode = fOriginCode || originCode;
//       fDestCode = fDestCode || destCode;

//       const fDepDate = formatFullDate(
//         f.departureDate ||
//           f.depDate ||
//           f.date ||
//           (index === 0
//             ? booking.departureDate
//             : booking.returnDate || booking.arrivalDate),
//       );
//       const fArrDate = formatFullDate(
//         f.arrivalDate ||
//           f.arrDate ||
//           f.arrival_date ||
//           f.departureDate ||
//           f.depDate ||
//           f.date ||
//           (index === 0
//             ? booking.departureDate
//             : booking.returnDate || booking.arrivalDate),
//       );

//       const fHeaderOrigin = fOriginCity || fOriginCode;
//       const fOriginLabel = fOriginCity
//         ? `${fOriginCity} (${fOriginCode})`
//         : fOriginCode;
//       const fHeaderDest = fDestCity || fDestCode;
//       const fDestLabel = fDestCity ? `${fDestCity} (${fDestCode})` : fDestCode;

//       return `
//         <div class="flight-section">
//             <div class="flight-header">Flight ${index + 1} - ${fHeaderOrigin} (${fOriginCode}) to ${fHeaderDest} (${fDestCode})</div>
//             <table class="flight-table">
//                 <thead>
//                     <tr>
//                         <th>AIRLINE NAME</th>
//                         <th>Flight #</th>
//                         <th>DEPARTURE</th>
//                         <th></th>
//                         <th>ARRIVAL</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     <tr>
//                         <td>${fAirline}</td>
//                         <td>${fNum}<br><span style="color:#999;font-size:10px;">Baggage</span><br>${fBaggage}</td>
//                         <td><strong style="font-size:14px;">${fDepTime}</strong><br>${fOriginLabel}<br><span style="color:#555;">${fDepDate}</span></td>
//                         <td style="text-align:center;font-size:22px;color:#333;">&#9992;</td>
//                         <td><strong style="font-size:14px;">${fArrTime}</strong><br>${fDestLabel}<br><span style="color:#555;">${fArrDate}</span></td>
//                     </tr>
//                 </tbody>
//             </table>
//         </div>`;
//     })
//     .join("");

//   const passengersHTML = passengers
//     .map(
//       (p, i) => `
//         <tr>
//             <td>${i + 1}</td>
//             <td>${[p.title, p.givenName, p.surName].filter(Boolean).join(" ")}</td>
//             <td>${p.passport || p.passportNumber || "N/A"}</td>
//             <td>${p.meal ? "Yes" : "N/A"}</td>
//             <td>${p.status || bookingStatus || "Confirmed"}</td>
//         </tr>`,
//     )
//     .join("");

//   // --- 4. Construct the HTML ---
//   const ticketHTML = `
// <!DOCTYPE html>
// <html>
// <head>
//     <title>Electronic Ticket Voucher</title>
//     <style>
//         @media print {
//             @page { margin: 10mm; size: A4 portrait; }
//             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//         }
//         body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 30px; background: #fff; }

//         .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
//         .page-title { font-size: 26px; font-weight: bold; color: #1a5276; }
//         .airline-logo img { height: 55px; object-fit: contain; }

//         .info-box { background: #1a5276; color: #fff; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px; }
//         .info-box .info-row { margin-bottom: 4px; font-size: 13px; }

//         .flight-section { margin-bottom: 20px; border-radius: 4px; overflow: hidden; border: 1px solid #eee; }
//         .flight-header { background: #d4ac0d; color: #fff; padding: 10px 15px; font-weight: bold; font-size: 14px; }
//         .flight-table { width: 100%; border-collapse: collapse; }
//         .flight-table th { text-align: left; padding: 10px 15px; font-size: 11px; color: #555; font-weight: bold; border-bottom: 1px solid #eee; background: #fff; }
//         .flight-table td { padding: 10px 15px; font-size: 12px; vertical-align: top; }

//         .pax-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//         .pax-table thead tr { background: #1a5276; color: #fff; }
//         .pax-table th { padding: 10px 15px; text-align: left; font-size: 12px; }
//         .pax-table td { padding: 10px 15px; border-bottom: 1px solid #eee; font-size: 12px; }

//         .terms-title { font-weight: bold; color: #1a5276; font-size: 14px; margin: 20px 0 8px; }
//         .terms-list { padding-left: 20px; margin: 0; }
//         .terms-list li { margin-bottom: 5px; font-size: 12px; }
//     </style>
// </head>
// <body>
//     <div style="max-width: 800px; margin: 0 auto;">

//         <!-- Header -->
//         <div class="header">
//             <div class="page-title">Electronic Ticket Voucher</div>
//             <div class="airline-logo">
//                 ${
//                   airlineLogo
//                     ? `<img src="${airlineLogo}" alt="${airlineName}" />`
//                     : `<span style="font-size:20px;font-weight:bold;color:#1a5276;">${airlineName}</span>`
//                 }
//             </div>
//         </div>

//         <!-- Booking Info Box -->
//         <div class="info-box">
//             <div class="info-row">Booking Reference Number (PNR) :  ${pnr}</div>
//             <div class="info-row">Booking ID :  ${bookingId}</div>
//             <div class="info-row">Issued By :  ${getAgencyName(booking)}</div>
//             <div class="info-row">Agent Name :  ${getName(booking)}</div>
//             <div class="info-row">Contact :  ${getAgencyPhone(booking)}</div>
//         </div>

//         <!-- Flight Sections -->
//         ${flightSectionsHTML}

//         <!-- Passengers -->
//         <table class="pax-table">
//             <thead>
//                 <tr>
//                     <th>Sr#</th>
//                     <th>Passenger Name</th>
//                     <th>Passport#</th>
//                     <th>Meal</th>
//                     <th>Status</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${passengersHTML}
//             </tbody>
//         </table>

//         <!-- Terms & Conditions -->
//         <div class="terms-title">Terms &amp; Conditions</div>
//         <ul class="terms-list">
//             <li>Please Report Airline Check-In Counter 4 Hours Before Flight Departure.</li>
//             <li>All Visa and Travel Document are Traveler Own Responsibility.</li>
//             <li>Tickets are non refundable</li>
//         </ul>

//     </div>
// </body>
// </html>
// `;
//   // --- 5. The Iframe Trick ---
//   const iframe = document.createElement("iframe");
//   iframe.style.position = "fixed";
//   iframe.style.right = "0";
//   iframe.style.bottom = "0";
//   iframe.style.width = "0";
//   iframe.style.height = "0";
//   iframe.style.border = "0";

//   document.body.appendChild(iframe);

//   const doc = iframe.contentWindow.document;
//   doc.open();
//   doc.write(ticketHTML);
//   doc.close();

//   iframe.onload = () => {
//     try {
//       iframe.contentWindow.focus();
//       iframe.contentWindow.print();
//     } catch (e) {
//       console.error("Print failed", e);
//     } finally {
//       // Remove iframe after delay
//       setTimeout(() => {
//         document.body.removeChild(iframe);
//       }, 1000);
//     }
//   };
// };

const getAgencyName = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  if (booking.agencyName) {
    return booking.agencyName;
  }
  if (storedFrontendUser.companyName) {
    return storedFrontendUser.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

const getStoredFrontendUser = () => {
  try {
    return JSON.parse(localStorage.getItem("frontend_user") || "{}");
  } catch {
    return {};
  }
};

const getName = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  if (booking.contactPersonName) {
    return booking.contactPersonName;
  }
  if (booking.issuedBy) {
    return booking.issuedBy;
  }
  if (storedFrontendUser.name) {
    return storedFrontendUser.name;
  }
  if (storedFrontendUser.companyName) {
    return storedFrontendUser.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

// const getAgencyEmail = (booking) => {
//     const storedFrontendUser = getStoredFrontendUser();

//     if (typeof booking.userId === "object" && booking.userId?.email) {
//         return booking.userId.email;
//     }
//     if (booking.email) {
//         return booking.email;
//     }
//     if (booking.contactEmail) {
//         return booking.contactEmail;
//     }
//     if (storedFrontendUser.email) {
//         return storedFrontendUser.email;
//     }
//     return "N/A";
// };

const getAgencyPhone = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.phone) {
    return booking.userId.phone;
  }
  if (booking.phone) {
    return booking.phone;
  }
  if (booking.contactPhone) {
    return booking.contactPhone;
  }
  if (booking.contactNumber) {
    return booking.contactNumber;
  }
  if (storedFrontendUser.phone) {
    return storedFrontendUser.phone;
  }
  return "N/A";
};

const formatTicketDate = (dateStr) => {
  if (!dateStr) return "N/A";

  const date =
    typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(
          ...dateStr
            .split("-")
            .map((value, index) => Number(value) - (index === 1 ? 1 : 0)),
        )
      : new Date(dateStr);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime12 = (time) => {
  if (!time) return "N/A";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "N/A";
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

const formatWeekday = (dateStr) => {
  if (!dateStr) return "";
  let date;
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase();
};

const formatBookingStatus = (status) => {
  const value = String(status || "N/A")
    .replace(/_/g, " ")
    .trim();
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `PKR ${value.toLocaleString("en-PK")}`;
};

const getPassengerPrice = (bookingData, passenger = {}) => {
  const pricing = bookingData.pricing || {};
  const type = String(passenger.type || "").toLowerCase();

  if (type === "child") return pricing.childPrice || pricing.childTotal || 0;
  if (type === "infant") return pricing.infantPrice || pricing.infantTotal || 0;
  return pricing.adultPrice || pricing.adultTotal || bookingData.price || 0;
};

const getPassengerCountsByType = (passengers) =>
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

const getDateOnly = (dateStr) => {
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

const addDaysToDate = (dateStr, days) => {
  const dateOnly = getDateOnly(dateStr);
  if (!dateOnly) return "";
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getDateOnly(date);
};

const getTimeMinutes = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getResolvedFlightArrivalDate = (flight, fallbackDate) => {
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

const getRouteCodesFromSector = (sector, index = 0) => {
  // Word-boundary anchors ensure we only pick up standalone 3-letter IATA
  // codes (e.g. "ISB-JED"), not substrings inside longer city names glued
  // together with dashes (e.g. "MULTAN-JEDDAH-MULTAN" must NOT yield "TAN-JED").
  const codes = String(sector || "")
    .toUpperCase()
    .match(/\b[A-Z]{3}\b/g);

  if (codes && codes.length >= index + 2) {
    return [codes[index], codes[index + 1]];
  }

  const match = String(sector || "").match(/\b([A-Z]{3})-([A-Z]{3})\b/i);
  return match ? [match[1].toUpperCase(), match[2].toUpperCase()] : [];
};

const getIataCode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "";
};

const getPassengerName = (passenger = {}) =>
  [passenger.title, passenger.givenName, passenger.surName]
    .filter(Boolean)
    .join(" ")
    .trim() || "PASSENGER NAME";

const formatPassengerType = (type) => {
  const value = String(type || "Adult").trim();
  if (!value) return "Adult";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const getPassengerList = (bookingData) =>
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

const getFlightList = (bookingData) => {
  const firstFlight =
    bookingData.flights && bookingData.flights[0] ? bookingData.flights[0] : {};

  return bookingData.flights && bookingData.flights.length > 0
    ? bookingData.flights
    : [firstFlight];
};

const getFlightRouteDetails = (flight, bookingData, index) => {
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
    // Do not truncate to 3 chars when no real IATA code is available -
    // show the full sector/city name as-is instead.
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
// GLOBAL MEDIA VARIABLES (Icons & Logos)
// ==========================================
const AGENCY_LOGO_URL =
  "https://via.placeholder.com/150x50?text=WaQar+MaKah+Travels";
const FALLBACK_LOGO_URL =
  "https://img.magnific.com/free-vector/airplane-sky_1308-31202.jpg?semt=ais_hybrid&w=740&q=80";

const WINDOW_SEAT_ICON =
  "https://cdn-icons-png.flaticon.com/512/1595/1595173.png";
const BAGGAGE_ICON = "https://cdn-icons-png.flaticon.com/512/1801/1801353.png";
const USER_ICON =
  "https://www.iconpacks.net/icons/1/free-user-group-icon-296-thumb.png";
const FLIGHT_ICON = "https://cdn-icons-png.flaticon.com/512/0/614.png";
const FOOTER_ILLUSTRATION =
  "https://ex-coders.com/html/turmet/assets/img/plane-shape1.png";

export function printGDSBooking(bookingData, options = {}) {
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
  const passengerCount = passengers.length;
  const passengerSummary =
    passengerCount === 1
      ? passengerName
      : `${passengerName} + ${passengerCount - 1} more`;
  const passengerCounts = getPassengerCountsByType(passengers);

  // COMPACT Passengers HTML - NO SCROLL BAR
  const passengersHTML = passengers
    .map((passenger, index) => {
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
  const [checkedBaggage, cabinBaggage] = String(defaultBaggage).split("+");

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
    .map((flight, index) => {
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

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print failed", e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
}
