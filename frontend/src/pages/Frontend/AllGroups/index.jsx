import React, { useEffect, useState, useContext } from "react";
import { FaRegCopy, FaCheck } from "react-icons/fa";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Menu, Package } from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { generateUmrahPackagesPDF } from "../../../utils/umrahPDFGen";

// Shows an airline's logo when one is available; falls back to just the
// airline name (no broken-image icon) when there's no logo or it fails to load.
const AirlineBadge = ({ name, logoUrl }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(logoUrl) && !imgError;

  return (
    <div className="flex items-center gap-2">
      {showImage ? (
        <div className="">
          <img
            style={{ height: "30px" }}
            src={logoUrl}
            alt={name || "Airline"}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : null}
      <span className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
        {name || "Airline"}
      </span>
    </div>
  );
};
const getAirlineLogoUrl = (flightLogo, flightNo) => {
  if (flightLogo) return flightLogo;

  const match = String(flightNo || "").match(/^([A-Z0-9]{2,3})[-\s]/i);
  if (!match) return null;

  return `https://img.wway.io/pics/root/${match[1].toUpperCase()}@png?exar=1&rs=fit:80:40`;
};

// Abid Air package seat counts are confirmed live during booking, so the
// package listing should not treat a missing/zero room count as sold out.
const isAbidAirPackage = (pkg = {}) =>
  String(pkg?.source || pkg?.packageSource || "").toLowerCase() === "abid-air";

export default function AllGroups({ headerType, header, searchParams }) {
  // const [copiedAll, setCopiedAll] = useState(false);
  // const [copiedRow, setCopiedRow] = useState({});
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingSingleId, setDownloadingSingleId] = useState(null);
  const [activeDurationTab, setActiveDurationTab] = useState("all"); // 'all', '14', '21', '28'
  const [isPdfPickerOpen, setIsPdfPickerOpen] = useState(false);
  const [pdfSelection, setPdfSelection] = useState({});
  const [pdfGroupBy, setPdfGroupBy] = useState("sector");

  const [pdfFilterValue, setPdfFilterValue] = useState("");

  // Same PDF generator as the bulk picker, but scoped to a single package —
  // triggered from the "Download PDF" button on each package card.
  const handleDownloadSinglePDF = async (group) => {
    const id = group.id || group._id;
    setDownloadingSingleId(id);
    try {
      await generateUmrahPackagesPDF([group], { groupBy: "sector" });
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF download failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingSingleId(null);
    }
  };

  const MONTHS_TITLE = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formatPackageDate = (date) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) return "-";
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // const buildCopyText = (groupsList) => {
  //   if (!groupsList.length) return "";
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  //   const headerText = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
  //   const lines = groupsList
  //     .map((g) => {
  //       const flight = g.flights?.[0];
  //       if (!flight) return null;
  //       const minPrice = Math.min(
  //         ...Object.values(g.rooms || {}).filter(Boolean),
  //       );
  //       const price = isFinite(minPrice) ? minPrice : 0;
  //       return `${flight.flightNo} *${g.packageName}* ${flight.sectorFrom} → ${flight.sectorTo}..... *PKR ${price.toLocaleString()}*`;
  //     })
  //     .filter(Boolean);
  //   const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nWaqar-e-Makkah Travel`;
  //   return [headerText, ...lines, "=======================", footer].join("\n");
  // };

  // const handleCopyAll = async () => {
  //   const text = buildCopyText(groups);
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch {
  //     const el = document.createElement("textarea");
  //     el.value = text;
  //     document.body.appendChild(el);
  //     el.select();
  //     document.execCommand("copy");
  //     document.body.removeChild(el);
  //   }
  //   setCopiedAll(true);
  //   setTimeout(() => setCopiedAll(false), 2000);
  // };

  // const handleCopyRow = async (group) => {
  //   const flight = group.flights?.[0];
  //   if (!flight) return;
  //   const minPrice = Math.min(
  //     ...Object.values(group.rooms || {}).filter(Boolean),
  //   );
  //   const price = isFinite(minPrice) ? minPrice : 0;
  //   const text = `${flight.flightNo} *${group.packageName}* ${flight.sectorFrom} → ${flight.sectorTo}..... *PKR ${price.toLocaleString()}*\n=======================\n*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nWaqar-e-Makkah Travel`;
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch {
  //     const el = document.createElement("textarea");
  //     el.value = text;
  //     document.body.appendChild(el);
  //     el.select();
  //     document.execCommand("copy");
  //     document.body.removeChild(el);
  //   }
  //   setCopiedRow((prev) => ({ ...prev, [group.id]: true }));
  //   setTimeout(
  //     () => setCopiedRow((prev) => ({ ...prev, [group.id]: false })),
  //     2000,
  //   );
  // };

  const dashboardUI = useContext(DashboardUIContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    searchKeyword: "",
    departDate: null,
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);

  // Supplier margins (PKR), fetched from backend
  const [travelNetworkMargin, setTravelNetworkMargin] = useState(0);
  const [abidAirMargin, setAbidAirMargin] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
  }, [searchParams]);

  const formatTime = (time) => {
    if (!time) return "";
    if (time.length === 4 && !time.includes(":"))
      return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
    return time.slice(0, 5);
  };

  const getId = (value) => String(value || "");

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const [
        packageRes,
        groupTicketRes,
        bookedSeatsRes,
        marginRes,
        abidMarginRes,
      ] = await Promise.allSettled([
        axiosInstance.get("/umrahpackages/"),
        axiosInstance.get("/group-ticketing"),
        axiosInstance.get("/bookings/getBookedSeats"),
        axiosInstance
          .get("/travel-network-margin", {
            params: { source: "travel-network" },
          })
          .catch(() => ({
            data: { success: true, data: { marginAmount: 0 } },
          })),
        axiosInstance
          .get("/travel-network-margin", {
            params: { source: "abid-air" },
          })
          .catch(() => ({
            data: { success: true, data: { marginAmount: 0 } },
          })),
      ]);

      // Load supplier margins
      if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
        setTravelNetworkMargin(
          Number(marginRes.value.data.data?.marginAmount) || 0,
        );
      }
      if (
        abidMarginRes.status === "fulfilled" &&
        abidMarginRes.value.data?.success
      ) {
        setAbidAirMargin(
          Number(abidMarginRes.value.data.data?.marginAmount) || 0,
        );
      }

      if (packageRes.status !== "fulfilled") {
        throw packageRes.reason;
      }

      const fetchedGroups = packageRes.value.data?.data || [];
      if (fetchedGroups.length === 0) {
        setGroups([]);
        setAirlines([]);
        setSectors([]);
        return;
      }

      const groupTicketTotalSeats = {};
      if (
        groupTicketRes.status === "fulfilled" &&
        groupTicketRes.value.data?.success
      ) {
        (groupTicketRes.value.data.data || []).forEach((ticket) => {
          const ticketId = getId(ticket._id || ticket.id);
          if (!ticketId) return;
          groupTicketTotalSeats[ticketId] = Number(ticket.totalSeats) || 0;
        });
      }

      const bookedSeatsByGroup = {};
      if (
        bookedSeatsRes.status === "fulfilled" &&
        bookedSeatsRes.value.data?.success
      ) {
        (bookedSeatsRes.value.data?.data?.breakdown?.byGroup || []).forEach(
          (group) => {
            const groupId = getId(group.groupId);
            if (!groupId) return;
            bookedSeatsByGroup[groupId] = Number(group.totalSeats) || 0;
          },
        );
      }

      const filtered = fetchedGroups.filter(
        (pkg) => pkg.internalStatus === "Public" && pkg.visibility !== false,
      );

      const formattedGroups = filtered
        .map((pkg) => {
          const flights = pkg.groupTicket?.flights || pkg.flights || [];
          const firstFlight = flights[0] || {};
          const lastFlight = flights[flights.length - 1] || {};

          const airlineName =
            pkg.groupTicket?.airline ||
            firstFlight.airlineName ||
            firstFlight.airline ||
            pkg.airlineName ||
            "";

          const sectorPoints =
            flights.length > 0
              ? [
                  firstFlight.sectorFrom || "",
                  ...flights.map((f) => f.sectorTo || ""),
                ].filter(Boolean)
              : [];
          const sector = sectorPoints.join("-");

          const toDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d) ? null : d;
          };

          // const hotels = (pkg.hotels || []).reduce((acc, h) => {
          //   const city = h.location?.city || "";
          //   const nightCount = Number(h?.nightCount ?? h?.nights ?? 0) || 0;
          //   const existingHotel = acc.find((hotel) => hotel.city === city);

          //   if (existingHotel) {
          //     existingHotel.nightCount += nightCount;
          //     return acc;
          //   }

          //   acc.push({
          //     _id: h._id,
          //     name: h.name || "",
          //     city,
          //     distance: h.location?.distance || "0",
          //     nightCount,
          //     rating: h.rating || 0,
          //     mapUrl: h.location?.mapUrl,
          //   });

          //   return acc;
          // }, []);

          const hotels = (pkg.hotels || []).map((h, index) => ({
            _id: h._id || `${h.name}-${index}`,
            name: h.name || "",
            city: h.location?.city || "",
            distance: h.location?.distance || "-",
            nightCount: Number(h?.nightCount ?? h?.nights ?? 0) || 0,
            rating: h.rating || 0,
            mapUrl: h.location?.mapUrl || "",
            originalHotel: h,
          }));

          const suppliedRooms = pkg.rooms || {};
          const rooms = Object.keys(suppliedRooms).length
            ? suppliedRooms
            : {
                double: Number(pkg.packageTotals?.double) || 0,
                triple: Number(pkg.packageTotals?.triple) || 0,
                quad: Number(pkg.packageTotals?.quad) || 0,
                sharing:
                  Number(
                    pkg.packageTotals?.shared ?? pkg.packageTotals?.sharing,
                  ) || 0,
              };
          const isTravelNetwork = pkg.packageSource === "travel-network";
          const isAbidAir = isAbidAirPackage(pkg);

          // For external supplier packages (Travel Network / Abid Air), apply
          // the admin-configured margin on top of each room price. We keep
          // originalRooms / originalPackageTotals for internal reference and
          // expose only the margin-added prices to the user.
          const marginVal = isTravelNetwork
            ? Number(
                marginRes.status === "fulfilled" &&
                  marginRes.value.data?.data?.marginAmount,
              ) || 0
            : isAbidAir
              ? Number(
                  abidMarginRes.status === "fulfilled" &&
                    abidMarginRes.value.data?.data?.marginAmount,
                ) || 0
              : 0;

          // margin can be negative (a discount off the base price), so only
          // skip when it's exactly 0 — not when it's negative.
          const applyMarginToRooms = (roomsObj, margin) => {
            if (!margin) return roomsObj;
            const result = {};
            Object.entries(roomsObj).forEach(([key, val]) => {
              result[key] =
                typeof val === "number" && val > 0
                  ? Math.max(0, val + margin)
                  : val;
            });
            return result;
          };

          const applyMarginToTotals = (totalsObj, margin) => {
            if (!margin) return totalsObj;
            const result = {};
            Object.entries(totalsObj).forEach(([key, val]) => {
              // Only apply to numeric price fields, not incentive etc.
              const priceKeys = [
                "double",
                "triple",
                "quad",
                "shared",
                "childWithoutBed",
                "infant",
              ];
              if (
                priceKeys.includes(key) &&
                typeof val === "number" &&
                val > 0
              ) {
                result[key] = Math.max(0, val + margin);
              } else {
                result[key] = val;
              }
            });
            return result;
          };

          const isExternalSupplier = isTravelNetwork || isAbidAir;
          const displayRooms = isExternalSupplier
            ? applyMarginToRooms(rooms, marginVal)
            : rooms;
          const originalPackageTotals = pkg.packageTotals || {};
          const displayPackageTotals = isExternalSupplier
            ? applyMarginToTotals(originalPackageTotals, marginVal)
            : originalPackageTotals;

          const roomValues = Object.values(displayRooms).filter(
            (v) => typeof v === "number" && v > 0,
          );
          const minPrice = roomValues.length > 0 ? Math.min(...roomValues) : 0;

          const selectedGroupTicketId = getId(
            pkg.selectedGroupTicketId ||
              pkg.groupTicket?._id ||
              pkg.groupTicket?.id,
          );
          const groupTicketSeats = groupTicketTotalSeats[selectedGroupTicketId];
          const groupTicketBookedSeats =
            bookedSeatsByGroup[selectedGroupTicketId] || 0;
          const remainingGroupTicketSeats =
            typeof groupTicketSeats === "number"
              ? Math.max(0, groupTicketSeats - groupTicketBookedSeats)
              : "";

          const localAvailableRooms =
            selectedGroupTicketId && remainingGroupTicketSeats !== ""
              ? remainingGroupTicketSeats
              : pkg.availableRooms !== undefined && pkg.availableRooms !== ""
                ? pkg.availableRooms
                : (pkg.groupTicket?.totalSeats ?? "");
          const availableRooms = isAbidAir
            ? (pkg.availableRooms ?? "")
            : localAvailableRooms;

          return {
            id: pkg._id || pkg.id,
            _id: pkg._id || pkg.id,
            // TNT-specific IDs — preserved explicitly so booking page can send them correctly
            tnt_package_id: pkg.tnt_package_id ?? null,
            tnt_group_id: pkg.tnt_group_id ?? pkg.groupId ?? null,
            packageName: pkg.packageName || "Umrah Package",
            packageDuration: pkg.days || "",
            sector,
            selectedGroupTicketId,
            groupTiktId: selectedGroupTicketId,
            groupTicketBookedSeats,
            groupTicketTotalSeats:
              typeof groupTicketSeats === "number" ? groupTicketSeats : "",
            airlineName,
            airline: {
              airline_name: airlineName,
              logo_url: getAirlineLogoUrl(
                pkg.flightLogo,
                firstFlight.flightNo || firstFlight.flight_no,
              ),
            },
            logo: pkg.logo,
            dept_date: toDate(firstFlight.depDate),
            returnDate: toDate(lastFlight.arrDate),
            depTime: formatTime(firstFlight.depTime || ""),
            arrTime: formatTime(lastFlight.arrTime || ""),
            flightNo: firstFlight.flightNo || "",
            flights,
            hotels,
            // displayRooms has margin applied for TNT packages (what user sees/books at)
            rooms: displayRooms,
            // Keep original rooms (without margin) so booking can send correct price to TNT
            originalRooms: rooms,
            packageSource: pkg.packageSource,
            source: pkg.source || pkg.packageSource,
            externalId: pkg.externalId || pkg.id,
            supplier: pkg.supplier || null,
            supplierName: pkg.supplierName || "",
            nightCount: pkg.nightCount || "",
            notes: pkg.notes || "",
            availableRooms,
            seatsOnCall: isAbidAir,
            price: minPrice,
            transport: pkg.transports,
            visa: pkg.visa || null,
            // displayPackageTotals has margin applied — used for price display
            packageTotals: displayPackageTotals,
            // originalPackageTotals — without margin, used for internal/booking reference
            originalPackageTotals,
            travelNetworkMargin: isExternalSupplier ? marginVal : 0,
            metadata: {
              packageName: pkg.packageName,
              flightNumber: firstFlight.flightNo || "",
              departureDate: toDate(firstFlight.depDate),
              arrivalDate: toDate(lastFlight.arrDate),
              packageDuration: pkg.days,
              hotels,
              flights,
            },
          };
        })
        .sort((a, b) => {
          // Group into a stable, predictable order: same route (sector)
          // together first, then same airline within that route, then by
          // soonest departure — instead of jumbling routes/airlines by date.
          const sectorCompare = (a.sector || "").localeCompare(b.sector || "");
          if (sectorCompare !== 0) return sectorCompare;

          const airlineCompare = (a.airlineName || "").localeCompare(
            b.airlineName || "",
          );
          if (airlineCompare !== 0) return airlineCompare;

          const aTime =
            a.dept_date instanceof Date ? a.dept_date.getTime() : Infinity;
          const bTime =
            b.dept_date instanceof Date ? b.dept_date.getTime() : Infinity;
          return aTime - bTime;
        });

      setAirlines(
        [
          ...new Set(formattedGroups.map((g) => g.airlineName).filter(Boolean)),
        ].sort(),
      );
      setSectors(
        [
          ...new Set(formattedGroups.map((g) => g.sector).filter(Boolean)),
        ].sort(),
      );
      setGroups(formattedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Failed to load Umrah packages. Please try again.");
      setGroups([]);
      setAirlines([]);
      setSectors([]);
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
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(value)
          ? prev.airlines.filter((a) => a !== value)
          : [...prev.airlines, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  // Duration tabs are built from whatever durations actually exist in the
  // fetched packages (e.g. 14, 15, 20, 21, 28...) instead of a fixed list,
  // so a new package duration automatically gets its own tab.
  const availableDurations = [
    ...new Set(
      groups
        .map((g) => parseInt(g.packageDuration))
        .filter((d) => !isNaN(d)),
    ),
  ].sort((a, b) => a - b);

  // Filter by duration tab
  const durationFilteredGroups = groups.filter((g) => {
    if (activeDurationTab === "all") return true;
    const duration = parseInt(g.packageDuration);
    if (isNaN(duration)) return false;
    return duration === Number(activeDurationTab);
  });

  // Apply search filters on top of duration filter
  const filteredGroups = durationFilteredGroups.filter((g) => {
    const airlineName = g.airlineName || "";
    const sector = (g.sector || "").toUpperCase().trim();
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(airlineName))
      return false;
    if (filters.sectors.length && !filters.sectors.includes(sector))
      return false;
    if (
      keyword &&
      !`${airlineName} ${sector} ${g.flightNo || ""} ${g.packageName || ""}`
        .toLowerCase()
        .includes(keyword)
    )
      return false;
    if (filters.departDate && g.dept_date) {
      const depDate = new Date(g.dept_date);
      const filterDate = new Date(filters.departDate);
      if (
        depDate.getFullYear() !== filterDate.getFullYear() ||
        depDate.getMonth() !== filterDate.getMonth() ||
        depDate.getDate() !== filterDate.getDate()
      )
        return false;
    }
    return true;
  });

  const pdfKeyOf = (g, mode) =>
    (mode === "airline" ? g.airlineName : g.sector) || "";

  const getPdfOptions = (mode) =>
    [
      ...new Set(filteredGroups.map((g) => pdfKeyOf(g, mode)).filter(Boolean)),
    ].sort();

  // A PDF covers exactly one sector or one airline, so the list only ever
  // shows packages matching the chosen value.
  const pdfCandidates = filteredGroups.filter(
    (g) => pdfKeyOf(g, pdfGroupBy) === pdfFilterValue,
  );

  const selectPdfSubset = (mode, value) => {
    setPdfGroupBy(mode);
    setPdfFilterValue(value);
    setPdfSelection(
      filteredGroups
        .filter((g) => pdfKeyOf(g, mode) === value)
        .reduce((acc, g) => {
          acc[g.id || g._id] = true;
          return acc;
        }, {}),
    );
  };

  const openPdfPicker = () => {
    if (filteredGroups.length === 0) {
      toast.warning("No packages available to download");
      return;
    }
    setIsPdfPickerOpen(true);
    selectPdfSubset("sector", getPdfOptions("sector")[0] || "");
  };

  const togglePdfSelection = (id) => {
    setPdfSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllForPdf = (checked) => {
    setPdfSelection(
      pdfCandidates.reduce((acc, g) => {
        acc[g.id || g._id] = checked;
        return acc;
      }, {}),
    );
  };

  const handleDownloadPDF = async () => {
    const selectedGroups = pdfCandidates.filter(
      (g) => pdfSelection[g.id || g._id],
    );
    if (selectedGroups.length === 0) {
      toast.warning("Please select at least one package");
      return;
    }

    setDownloadingPDF(true);
    try {
      await generateUmrahPackagesPDF(selectedGroups, { groupBy: pdfGroupBy });
      toast.success("PDF downloaded successfully!");
      setIsPdfPickerOpen(false);
    } catch (error) {
      console.error("PDF download failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const FilterContent = () => (
    <>
      <h3 className="font-bold text-sm mb-3 text-gray-800">Airlines</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {airlines.map((airline) => (
          <label
            key={airline}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline)}
              onChange={() => handleFilterChange("airline", airline)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {airline}
            </span>
          </label>
        ))}
      </div>
      <div className="h-px bg-gray-100 my-4" />
      <h3 className="font-bold text-sm mb-3 text-gray-800">Sectors</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {sector}
            </span>
          </label>
        ))}
      </div>
    </>
  );

  const UmrahPackageCard = ({ group, index }) => {
    const allFlights = group.flights || [];
    const rooms = group.rooms || {};
    const primary = theme.colors.primary;
    const seatsOnCall = group.seatsOnCall || isAbidAirPackage(group);
    const seatsLabel = seatsOnCall ? "On Call" : group.availableRooms;

    const allDisplayHotels = group.hotels || [];

    const combineHotelsByName = (hotels) =>
      hotels.reduce((combinedHotels, hotel) => {
        const hotelName = (hotel.name || "").trim();
        const normalizedName = hotelName.toLowerCase();
        const existingHotel = combinedHotels.find(
          (item) => (item.name || "").trim().toLowerCase() === normalizedName,
        );

        if (existingHotel && normalizedName) {
          existingHotel.nightCount += Number(hotel.nightCount) || 0;
          return combinedHotels;
        }

        combinedHotels.push({
          ...hotel,
          name: hotelName || hotel.name,
          nightCount: Number(hotel.nightCount) || 0,
        });
        return combinedHotels;
      }, []);

    const makkahHotels = combineHotelsByName(
      allDisplayHotels.filter((hotel) =>
        ["makkah", "mecca"].includes((hotel.city || "").toLowerCase()),
      ),
    );

    const madinahHotels = allDisplayHotels.filter((hotel) =>
      ["madinah", "madina", "medina"].includes(
        (hotel.city || "").toLowerCase(),
      ),
    );

    const packageTotals = group.packageTotals || {};
    const totalsKeyMap = {
      sharing: "shared",
      quint: "quint",
      quad: "quad",
      triple: "triple",
      double: "double",
      childWithoutBed: "childWithoutBed",
      infant: "infant",
    };

    const roomOrder = [
      "sharing",
      "quint",
      "quad",
      "triple",
      "double",
      "childWithoutBed",
      "infant",
    ];
    const roomColors = {
      sharing: { bg: "#e8f4fd", text: "#1565c0", border: "#90caf9" },
      quad: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
      triple: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
      double: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80" },
      quint: { bg: "#fce4ec", text: "#880e4f", border: "#f48fb1" },
      childWithoutBed: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
      infant: { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
    };

    const getRoomPrice = (key) => {
      const totalsKey = totalsKeyMap[key] || key;
      const fromTotals = packageTotals[totalsKey];
      if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
      return rooms[key];
    };

    const availableRoomTypes = roomOrder
      .filter((key) => {
        const isChildOrInfant =
          key.toLowerCase().includes("child") ||
          key.toLowerCase().includes("infant");
        if (isChildOrInfant) return false;
        const price = getRoomPrice(key);
        return typeof price === "number" && price > 0;
      })
      .map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));

    const fmt = (n) => Number(n).toLocaleString();

    // Build structured flight info instead of one long string
    const buildFlightInfo = (fl) => {
      const depD = fl.depDate ? new Date(fl.depDate) : null;
      const dateStr = depD
        ? `${String(depD.getDate()).padStart(2, "0")} ${MONTHS_TITLE[depD.getMonth()]}`
        : "";

      return {
        date: dateStr,
        sector:
          fl.sectorFrom && fl.sectorTo
            ? `${fl.sectorFrom} → ${fl.sectorTo}`
            : "",
        flightNo: fl.flightNo || "",
        depTime: fl.depTime || "",
        arrTime: fl.arrTime || "",
        baggage: fl.baggage || "",
      };
    };

    const FlightRow = ({ fl }) => {
      const info = buildFlightInfo(fl);
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-white/95">
          {info.date && (
            <span className="font-semibold text-white">{info.date}</span>
          )}
          {info.sector && <span className="font-medium">{info.sector}</span>}
          {info.flightNo && (
            <span className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-[10px] tracking-wide">
              {info.flightNo}
            </span>
          )}
          {(info.depTime || info.arrTime) && (
            <span className="opacity-90">
              {info.depTime}
              {info.depTime && info.arrTime ? " – " : ""}
              {info.arrTime}
            </span>
          )}
          {info.baggage && (
            <span className="opacity-80">🧳 {info.baggage}</span>
          )}
        </div>
      );
    };

    // Compact hotel row: one hotel per line, aligned left
    const HotelColumn = ({ title, hotels, icon, emptyLabel }) => (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <img
            className="w-8 h-8 object-contain shrink-0"
            src={icon}
            alt={title}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {title}
          </span>
        </div>

        {hotels.length > 0 ? (
          <div className="flex flex-col gap-1 pl-5">
            {hotels.map((hotel, i) => (
              <div key={hotel._id || i} className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-snug truncate">
                  {hotel.name || "-"}
                </div>
                <div className="text-[10px] text-gray-500 leading-snug">
                  {hotel.distance && hotel.distance !== "-"
                    ? `${hotel.distance} • `
                    : ""}
                  {hotel.nightCount || 0} Nights
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-gray-400 italic pl-5">
            {emptyLabel}
          </div>
        )}
      </div>
    );

    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* ── Header: package name + meta chips ───────────────────── */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5"
          style={{ background: primary }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {index !== undefined && (
              <span className="text-[10px] font-bold text-white/70 tabular-nums">
                #{index + 1}
              </span>
            )}
            <span className="text-sm sm:text-base font-bold text-white truncate">
              {group.packageName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {group.packageDuration && (
              <span className="bg-white/15 border border-white/25 rounded-full px-2.5 py-0.5 text-white text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">
                {group.packageDuration} Days
              </span>
            )}
            {group.nightCount && (
              <span className="bg-white/15 border border-white/25 rounded-full px-2.5 py-0.5 text-white text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">
                {group.nightCount} Nights
              </span>
            )}
            {(seatsOnCall ||
              (group.availableRooms !== "" &&
                group.availableRooms !== undefined)) && (
                <span className="bg-white/15 border border-white/25 rounded-full px-2.5 py-0.5 text-white text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">
                  Seats: {seatsLabel}
                </span>
              )}
          </div>
        </div>

        {/* ── Flight strip ─────────────────────────────────────────── */}
        {allFlights.length > 0 && (
          <div
            className="px-3 sm:px-4 py-2 flex flex-col gap-1"
            style={{ background: `${primary}dd` }}
          >
            {allFlights.map((fl, i) => (
              <FlightRow key={i} fl={fl} />
            ))}
          </div>
        )}

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:gap-6">
            {/* LEFT: airline + hotels */}
            <div className="flex flex-col sm:flex-row gap-4 min-w-0">
              {/* Airline logo */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="">
                  <img
                    style={{ height: "30px" }}
                    src={
                      group.airline?.logo_url ||
                      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop"
                    }
                    alt={group.airlineName}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop";
                    }}
                  />
                </div>
              </div>

              {/* Hotels — two clean columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0 justify-center items-center">
                <HotelColumn
                  title="Makkah"
                  hotels={makkahHotels}
                  icon="https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png"
                  emptyLabel="No hotel"
                />
                <HotelColumn
                  title="Madinah"
                  hotels={madinahHotels}
                  icon="https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png"
                  emptyLabel="No hotel"
                />
              </div>
            </div>

            {/* RIGHT: pricing + actions */}
            <div className="flex flex-col gap-3 lg:items-end lg:min-w-[260px]">
              {/* Pricing */}
              <div className="w-full">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Pricing per person
                </div>
                {availableRoomTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {availableRoomTypes.map(({ key, label }) => {
                      const c = roomColors[key] || {
                        bg: "#f3f4f6",
                        text: "#374151",
                        border: "#d1d5db",
                      };
                      return (
                        <div
                          key={key}
                          className="flex flex-col items-center px-2.5 py-1.5 rounded-md min-w-[72px]"
                          style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          <span
                            className="text-[9px] font-bold uppercase tracking-wide"
                            style={{ color: c.text }}
                          >
                            {label}
                          </span>
                          <span
                            className="text-[11px] font-bold whitespace-nowrap tabular-nums"
                            style={{ color: c.text }}
                          >
                            PKR {fmt(getRoomPrice(key))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Pricing unavailable
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row lg:justify-end gap-2 w-full">
                {headerType === "dashboard" && (
                  <button
                    onClick={() => handleDownloadSinglePDF(group)}
                    disabled={downloadingSingleId === (group.id || group._id)}
                    className="px-4 py-2 rounded-lg text-xs font-bold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {downloadingSingleId === (group.id || group._id)
                      ? "Generating…"
                      : "Download PDF"}
                  </button>
                )}
                <button
                  onClick={() =>
                    navigate("/dashboard/pkg-detail", { state: { group } })
                  }
                  className="px-5 py-2 rounded-lg text-white text-xs font-bold whitespace-nowrap hover:opacity-90 transition-opacity"
                  style={{ background: primary }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>

          {/* Notes — quieter, full width */}
          {group.notes && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border-l-2 border-amber-400 rounded-r-md">
              <div className="flex items-start gap-1.5 text-[11px]">
                <span className="font-bold text-amber-700 shrink-0">Note:</span>
                <span className="text-amber-900 leading-snug break-words">
                  {group.notes}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse"
        >
          <div className="h-12 bg-gray-200" />
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Get counts for each duration tab
  const getCountForDuration = (duration) => {
    if (duration === "all") return groups.length;
    return groups.filter((g) => {
      const pkgDuration = parseInt(g.packageDuration);
      return !isNaN(pkgDuration) && pkgDuration === duration;
    }).length;
  };

  return (
    <>
      <TopBar
        title={"Umrah Packages"}
        icon={<Package className="text-white w-5 h-5 sm:w-6 sm:h-6" />}
      />
      <div className="w-full min-h-screen bg-gray-50">
        {headerType === "dashboard" && groups.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 mb-3">
            <button
              onClick={openPdfPicker}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: "#dc2626" }}
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="xs:inline">Download PDF</span>
              {/* <span className="xs:hidden">PDF</span> */}
            </button>
          </div>
        )}

        {isPdfPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-bold text-gray-800">
                  Select Packages to Include
                </h2>
                <button
                  onClick={() => setIsPdfPickerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-600 shrink-0">
                  Download by:
                </span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() =>
                      selectPdfSubset("sector", getPdfOptions("sector")[0] || "")
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      pdfGroupBy === "sector"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Sector
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectPdfSubset(
                        "airline",
                        getPdfOptions("airline")[0] || "",
                      )
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      pdfGroupBy === "airline"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Airline
                  </button>
                </div>
                <select
                  value={pdfFilterValue}
                  onChange={(e) => selectPdfSubset(pdfGroupBy, e.target.value)}
                  className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white"
                >
                  {getPdfOptions(pdfGroupBy).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      pdfCandidates.length > 0 &&
                      pdfCandidates.every((g) => pdfSelection[g.id || g._id])
                    }
                    onChange={(e) => toggleSelectAllForPdf(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Select All
                </label>
                <span className="text-xs text-gray-500">
                  {pdfCandidates.filter((g) => pdfSelection[g.id || g._id]).length} of{" "}
                  {pdfCandidates.length} selected
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                {pdfCandidates.map((g) => {
                  const id = g.id || g._id;
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!pdfSelection[id]}
                        onChange={() => togglePdfSelection(id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {g.packageName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {g.sector} • {g.airlineName || "Airline"} •{" "}
                          {g.packageDuration || "-"} Days
                        </div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">
                          Departure: {formatPackageDate(g.dept_date)} • Return:{" "}
                          {formatPackageDate(g.returnDate)}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-primary whitespace-nowrap">
                        {g.price
                          ? `PKR ${Number(g.price).toLocaleString()}`
                          : ""}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsPdfPickerOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
                  style={{ background: downloadingPDF ? "#94a3b8" : "#dc2626" }}
                >
                  {downloadingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    "Generate PDF"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duration Tabs — dynamically generated from the durations present in the data */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveDurationTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeDurationTab === "all"
                ? "text-white bg-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            style={
              activeDurationTab === "all"
                ? { background: theme.colors.primary, color: "white" }
                : {}
            }
          >
            All ({getCountForDuration("all")})
          </button>
          {availableDurations.map((duration) => (
            <button
              key={duration}
              onClick={() => setActiveDurationTab(String(duration))}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeDurationTab === String(duration)
                  ? "text-white bg-primary border-b-2 border-primary"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
              style={
                activeDurationTab === String(duration)
                  ? { background: theme.colors.primary, color: "white" }
                  : {}
              }
            >
              {duration} Days ({getCountForDuration(duration)})
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 py-3 ${headerType === "dashboard" ? "rounded-t-2xl" : ""}`}
        >
          <div className="w-full xl:w-auto">{header}</div>
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-4">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-5 rounded-full transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.primary
                        : "#d1d5db",
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${showAdvancedSearch ? "translate-x-4" : ""}`}
                    />
                  </div>
                </div>
                <span className="ml-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                  Advanced Search
                </span>
              </label>
              {showAdvancedSearch && (
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-700"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Filters</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu size={20} />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-5 pt-4 pb-8">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-64 shrink-0">
              <div className="bg-white rounded-xl p-5 sticky top-6 border border-gray-100 shadow-sm">
                <FilterContent />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-gray-100">
                <div className="text-4xl sm:text-5xl mb-4">✈️</div>
                <p className="text-gray-400 text-sm sm:text-base">
                  No packages available at the moment
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-2">
                  Please check back later or adjust your filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.map((group, idx) => {
                  // Packages are sorted sector-first then airline, so a route
                  // header only when the sector changes, and an airline
                  // sub-header only when the airline changes within that
                  // sector, makes the grouping visible instead of one long
                  // undifferentiated list.
                  const prevGroup = filteredGroups[idx - 1];
                  const showSectorHeader =
                    !prevGroup || prevGroup.sector !== group.sector;
                  const showAirlineHeader =
                    showSectorHeader ||
                    prevGroup.airlineName !== group.airlineName;

                  return (
                    <React.Fragment key={group.id || group._id || idx}>
                      {showSectorHeader && group.sector && (
                        <div className="flex items-center gap-2.5 pt-3 pb-0.5 first:pt-0">
                          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-gray-700">
                            {group.sector}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      {showAirlineHeader && (
                        <div className="flex items-center gap-2.5 ml-1 pl-3 border-l-2 border-gray-200 pt-1.5 pb-1">
                          <AirlineBadge
                            name={group.airlineName}
                            logoUrl={group.airline?.logo_url}
                          />
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      )}
                      <UmrahPackageCard group={group} index={idx} />
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add responsive styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .xs\\:inline {
            display: inline;
          }
        }
        @media (min-width: 641px) {
          .xs\\:hidden {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
