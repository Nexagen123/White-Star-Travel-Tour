import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableBody,
} from "../components/ui/table";
import ComponentCard from "../components/common/ComponentCard";
import axiosInstance from "../Api/axios";
import { PencilIcon, TrashBinIcon } from "../icons";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import {
  generateUmrahPackagesPDF,
  UmrahPackage,
} from "../utils/umrahPackagepdf";
import { Modal } from "../components/ui/modal";
import { EyeIcon } from "@heroicons/react/24/outline";

interface FlightData {
  airline: string;
  flightNo: string;
  depDate?: string;
  depTime?: string;
  arrDate?: string;
  arrTime?: string;
  sectorFrom?: string;
  sectorTo?: string;
  fromTerminal?: string;
  toTerminal?: string;
  flightClass?: string;
  baggage?: string;
  meal?: string;
}

interface HotelData {
  name: string;
  location?: {
    city?: string;
    distance?: string | number;
    mapUrl?: string;
  };
  distance?: number | string;
}

interface TransportData {
  transportType?: string;
  route?: string;
}

interface PackageData {
  _id: string;
  id?: string;
  packageName: string;
  availableRooms?: number;
  selectedGroupTicketId?: string;
  groupTicket?: {
    _id?: string;
    id?: string;
    totalSeats?: number;
  };
  days?: number;
  flightLogo?: string;
  createdAt: string;
  updatedAt?: string;
  internalStatus?: "Public" | "Private";

  rooms?: {
    sharing: number | null;
    double: number | null;
    triple: number | null;
    quad: number | null;
    quint: number | null;
    childWithoutPackage: number | null;
    InfantWithoutPackage: number | null;
  };

  packageTotals?: {
    double?: number;
    triple?: number;
    quad?: number;
    shared?: number;
    childWithoutBed?: number;
    infant?: number;
    incentive?: number;
  };

  flights: FlightData[];
  hotels: HotelData[];
  transports: TransportData[];

  visa?: {
    visaType?: string;
    withTransport?: boolean;
  };

  logo?: string;

  // Package source fields
  packageSource?: "local-db" | "travel-network" | "abid-air";
  source?: string;
  externalId?: string | number;
  supplierName?: string;
  supplier?: {
    name?: string;
  };
  visibility?: boolean;
}

interface BookedSeatsData {
  groupId: string;
  totalSeats: number;
}

interface GroupTicketSeatsData {
  _id?: string;
  id?: string;
  totalSeats?: number;
}

interface UmrahBookingData {
  _id?: string;
  bookingNumber?: string;
  packageId?: string | { _id?: string; id?: string };
  packageSource?: "local-db" | "travel-network" | "abid-air" | string;
  packageName?: string;
  overallStatus?: string;
  createdAt?: string;
  roomType?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    agencyCode?: string;
  };
  passengerCount?: {
    adults?: number;
    children?: number;
    infants?: number;
    total?: number;
  };
  pricing?: {
    totalPrice?: number;
    currency?: string;
  };
  paymentStatus?: {
    status?: string;
    paidAmount?: number;
    totalAmount?: number;
  };
}

interface UmrahBookingStatusCounts {
  pending: number;
  cancelled: number;
}

// Interface for visibility settings from API
interface PackageVisibility {
  packageId: string;
  isVisible: boolean;
  source: "local-db" | "travel-network" | "abid-air";
  externalId?: string | number;
}

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatShortDate = (date?: string) => {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatMoney = (amount?: number) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }

  return Number(amount).toLocaleString("en-PK");
};

const getDepartureRange = (flights: FlightData[]) => {
  if (!flights || flights.length === 0) {
    return {
      from: "N/A",
      to: "N/A",
    };
  }

  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  return {
    from: formatShortDate(firstFlight.depDate),
    to: formatShortDate(lastFlight.depDate || lastFlight.arrDate),
  };
};

const getSectorText = (flights: FlightData[]) => {
  if (!flights || flights.length === 0) return "No Sector";

  const firstAirline = flights[0]?.airline || "AIRLINE";

  const routeParts: string[] = [];

  flights.forEach((flight, index) => {
    if (index === 0 && flight.sectorFrom) {
      routeParts.push(flight.sectorFrom);
    }

    if (flight.sectorTo) {
      routeParts.push(flight.sectorTo);
    }
  });

  const uniqueRoute = routeParts.filter(Boolean).join("-");

  return `${firstAirline}-${uniqueRoute}`;
};

const hasTransportInPackage = (pkg: PackageData) => {
  return Boolean(
    pkg.visa?.withTransport || (pkg.transports && pkg.transports.length > 0)
  );
};

const getId = (value?: string | number | null) => String(value || "");

const getPackageSource = (pkg: PackageData) => {
  const rawSource = String(pkg.packageSource || pkg.source || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  const supplierName = String(pkg.supplierName || pkg.supplier?.name || "")
    .trim()
    .toLowerCase();

  if (rawSource.includes("abid") || supplierName.includes("abid")) {
    return "abid-air";
  }

  if (rawSource.includes("travel-network") || supplierName.includes("travel network")) {
    return "travel-network";
  }

  if (!rawSource || rawSource === "local-db") {
    return "local-db";
  }

  return rawSource;
};

const getBookingSource = (booking: UmrahBookingData) =>
  String(booking.packageSource || "").trim().toLowerCase().replace(/_/g, "-");

const getPackageExternalId = (pkg: PackageData) =>
  getId(pkg.externalId || pkg.id || pkg._id);

const getPackageUiId = (pkg: PackageData) =>
  `${getPackageSource(pkg)}:${getPackageExternalId(pkg)}`;

const getVisibilityKey = (
  source: PackageVisibility["source"] | PackageData["packageSource"] | string | undefined,
  packageId?: string | number | null,
) => `${source || "local-db"}:${getId(packageId)}`;

const getBookingPackageId = (booking: UmrahBookingData) => {
  return typeof booking.packageId === "object"
    ? getId(booking.packageId?._id || booking.packageId?.id)
    : getId(booking.packageId);
};

const getPackageBookingKey = (pkg: PackageData) => {
  if (["travel-network", "abid-air"].includes(getPackageSource(pkg))) {
    return getVisibilityKey(getPackageSource(pkg), getPackageExternalId(pkg));
  }

  return getId(pkg._id);
};

const getBookingPackageKey = (booking: UmrahBookingData) => {
  const packageId = getBookingPackageId(booking);
  const source = getBookingSource(booking);
  if (["travel-network", "abid-air"].includes(source)) {
    return getVisibilityKey(source, packageId);
  }

  return packageId;
};

const getStatusClass = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (["confirmed", "completed", "approved"].includes(normalized)) {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (["cancelled", "rejected"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (["on hold", "pending", "in progress"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
};

const ManageUmrahPackage = () => {
  const { user } = useAuth();

  const canView = hasPermission(user, "view_umrah_packages");
  const canUseActions = hasPermission(user, "umrah_packages_action_buttons");

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [groupTicketTotalSeats, setGroupTicketTotalSeats] = useState<
    Map<string, number>
  >(new Map());
  const [bookedSeatsByGroup, setBookedSeatsByGroup] = useState<
    Map<string, BookedSeatsData>
  >(new Map());
  const [umrahBookingStatusCounts, setUmrahBookingStatusCounts] = useState<
    Map<string, UmrahBookingStatusCounts>
  >(new Map());
  const [umrahBookings, setUmrahBookings] = useState<UmrahBookingData[]>([]);
  const [selectedBookingsPackage, setSelectedBookingsPackage] =
    useState<PackageData | null>(null);
  const [packageBookings, setPackageBookings] = useState<UmrahBookingData[]>(
    []
  );
  const [bookingsModalOpen, setBookingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"all" | "local" | "travel" | "abid">("all");

  // Visibility state - loaded from API
  const [visibilityMap, setVisibilityMap] = useState<Map<string, boolean>>(new Map());

  // Modal state for visibility management
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [visibilityModalSource, setVisibilityModalSource] = useState<
    "travel-network" | "abid-air"
  >("travel-network");

  // Travel Network Margin state
  const [travelMargin, setTravelMargin] = useState<number>(0);
  const [travelMarginInput, setTravelMarginInput] = useState<string>("0");
  const [savingMargin, setSavingMargin] = useState(false);

  // Abid Air Margin state
  const [abidMargin, setAbidMargin] = useState<number>(0);
  const [abidMarginInput, setAbidMarginInput] = useState<string>("0");
  const [savingAbidMargin, setSavingAbidMargin] = useState(false);

  const hasFetched = useRef(false);

  // Filter packages based on active tab
  const filteredBySource = packages.filter((pkg) => {
    const source = getPackageSource(pkg);
    if (activeTab === "all") return true;
    if (activeTab === "local") return source === "local-db";
    if (activeTab === "travel") return source === "travel-network";
    if (activeTab === "abid") return source === "abid-air";
    return true;
  });

  // Filter by search term AND visibility
  const filteredPackages = filteredBySource.filter((pkg) => {
    const searchValue = searchTerm.toLowerCase().trim();
    if (!searchValue) return true;

    const packageName = pkg.packageName?.toLowerCase() || "";

    const hotelMatch = pkg.hotels?.some((hotel) => {
      const hotelName = hotel.name?.toLowerCase() || "";
      const city = hotel.location?.city?.toLowerCase() || "";
      return hotelName.includes(searchValue) || city.includes(searchValue);
    });

    const flightMatch = pkg.flights?.some((flight) => {
      const airline = flight.airline?.toLowerCase() || "";
      const flightNo = flight.flightNo?.toLowerCase() || "";
      const sectorFrom = flight.sectorFrom?.toLowerCase() || "";
      const sectorTo = flight.sectorTo?.toLowerCase() || "";
      return (
        airline.includes(searchValue) ||
        flightNo.includes(searchValue) ||
        sectorFrom.includes(searchValue) ||
        sectorTo.includes(searchValue)
      );
    });

    const transportMatch = pkg.transports?.some((transport) => {
      const transportType = transport.transportType?.toLowerCase() || "";
      const route = transport.route?.toLowerCase() || "";
      return transportType.includes(searchValue) || route.includes(searchValue);
    });

    const statusMatch = pkg.internalStatus?.toLowerCase().includes(searchValue);

    return (
      packageName.includes(searchValue) ||
      hotelMatch ||
      flightMatch ||
      transportMatch ||
      statusMatch
    );
  });

  // Toggle visibility for a single package
  const togglePackageVisibility = async (
    packageId: string,
    isVisible: boolean,
    source: "travel-network" | "abid-air" = "travel-network",
  ) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage package visibility");
      return;
    }

    try {
      const response = await axiosInstance.post("/package-visibility/toggle", {
        packageId,
        source,
        isVisible,
      });

      if (response.data?.success) {
        // Update the visibility map immediately to reflect the change in UI
        setVisibilityMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(getVisibilityKey(source, packageId), isVisible);
          return newMap;
        });

        toast.success(`Package ${isVisible ? "shown" : "hidden"} successfully`);
      } else {
        throw new Error(response.data?.message || "Failed to update visibility");
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update visibility");
    }
  };

  // Toggle all packages of a given external source's visibility
  const toggleAllPackagesBySource = async (
    source: "travel-network" | "abid-air",
    show: boolean,
  ) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage package visibility");
      return;
    }

    try {
      const sourcePackages = packages.filter(
        (pkg) => getPackageSource(pkg) === source
      );

      const promises = sourcePackages.map((pkg) => {
        const packageId = getPackageExternalId(pkg);
        return axiosInstance.post("/package-visibility/toggle", {
          packageId,
          source,
          isVisible: show,
        });
      });

      await Promise.all(promises);

      // Update the visibility map immediately to reflect the changes in UI
      setVisibilityMap((prev) => {
        const newMap = new Map(prev);
        sourcePackages.forEach((pkg) => {
          const packageId = getPackageExternalId(pkg);
          newMap.set(getVisibilityKey(source, packageId), show);
        });
        return newMap;
      });

      const sourceLabel = source === "abid-air" ? "Abid Air" : "travel network";
      toast.success(`${show ? "Showing" : "Hiding"} all ${sourceLabel} packages`);
    } catch (error) {
      console.error("Error toggling all packages:", error);
      toast.error("Failed to update visibility for all packages");
    }
  };

  // Toggle all travel network packages visibility (back-compat wrapper)
  const toggleAllTravelPackages = (show: boolean) =>
    toggleAllPackagesBySource("travel-network", show);

  // Get travel network / abid air packages for the visibility modal
  const travelNetworkPackages = packages.filter(
    (pkg) => getPackageSource(pkg) === "travel-network"
  );
  const abidAirVisibilityPackages = packages.filter(
    (pkg) => getPackageSource(pkg) === "abid-air"
  );

  // Check if all packages of a given source are visible
  const areAllPackagesVisible = (source: "travel-network" | "abid-air") => {
    const sourcePackages = packages.filter(
      (pkg) => getPackageSource(pkg) === source
    );
    if (sourcePackages.length === 0) return true;

    return sourcePackages.every((pkg) => {
      const packageId = getPackageExternalId(pkg);
      return visibilityMap.get(getVisibilityKey(source, packageId)) !== false;
    });
  };

  // Check if all travel packages are visible (back-compat wrapper)
  const areAllTravelPackagesVisible = () => {
    const travelPackages = packages.filter(
      (pkg) => getPackageSource(pkg) === "travel-network"
    );
    if (travelPackages.length === 0) return true;

    return travelPackages.every((pkg) => {
      const packageId = getPackageExternalId(pkg);
      return visibilityMap.get(getVisibilityKey("travel-network", packageId)) !== false;
    });
  };

  useEffect(() => {
    const fetchPackages = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const [
          packageRes,
          groupTicketRes,
          bookedSeatsRes,
          umrahBookingsRes,
          visibilityRes,
          marginRes,
          abidMarginRes,
        ] = await Promise.allSettled([
          axiosInstance.get("/umrahpackages/"), // All packages
          axiosInstance.get("/group-ticketing"),
          axiosInstance.get("/bookings/getBookedSeats"),
          axiosInstance.get("/umrah-bookings/admin/all"),
          axiosInstance.get("/package-visibility").catch(() => ({ data: { success: true, data: [] } })),
          axiosInstance.get("/travel-network-margin", { params: { source: "travel-network" } }).catch(() => ({ data: { success: true, data: { marginAmount: 0 } } })),
          axiosInstance.get("/travel-network-margin", { params: { source: "abid-air" } }).catch(() => ({ data: { success: true, data: { marginAmount: 0 } } })),
        ]);

        // Handle packages
        let localPackages: PackageData[] = [];
        let travelPackages: PackageData[] = [];
        let abidAirPackages: PackageData[] = [];

        if (packageRes.status === "fulfilled" && packageRes.value.data?.success) {
          const data = packageRes.value.data.data || [];
          localPackages = data.filter((pkg: PackageData) => getPackageSource(pkg) === "local-db").map((pkg: PackageData) => ({
            ...pkg,
            packageSource: "local-db",
          }));

          // Separate travel network packages from the response
          travelPackages = data.filter((pkg: PackageData) => getPackageSource(pkg) === "travel-network").map((pkg: PackageData) => ({
            ...pkg,
            packageSource: "travel-network",
            _id: getPackageUiId(pkg),
          }));
          abidAirPackages = data.filter((pkg: PackageData) => getPackageSource(pkg) === "abid-air").map((pkg: PackageData) => ({
            ...pkg,
            packageSource: "abid-air",
            _id: getPackageUiId(pkg),
          }));

          if (data.length === 0) {
            toast.info("No packages created yet");
          }
        }

        // As a backup, fetch travel network packages separately if needed
        if (travelPackages.length === 0) {
          try {
            const travelResponse = await axiosInstance.get("/umrahpackages/", {
              params: { source: "travel-network" },
            });
            if (travelResponse.data?.success) {
              travelPackages = travelResponse.data.data || [];
              travelPackages = travelPackages.map((pkg: PackageData) => ({
                ...pkg,
                packageSource: "travel-network",
                _id: getPackageUiId({ ...pkg, packageSource: "travel-network" }),
              }));
            }
          } catch (travelError) {
            console.warn("Error fetching travel network packages separately:", travelError);
          }
        }

        // Handle group tickets
        if (
          groupTicketRes.status === "fulfilled" &&
          groupTicketRes.value.data?.success
        ) {
          const seatsMap = new Map<string, number>();
          (groupTicketRes.value.data.data || []).forEach(
            (ticket: GroupTicketSeatsData) => {
              const ticketId = getId(ticket._id || ticket.id);
              if (!ticketId) return;
              seatsMap.set(ticketId, Number(ticket.totalSeats) || 0);
            }
          );
          setGroupTicketTotalSeats(seatsMap);
        }

        // Handle booked seats
        if (
          bookedSeatsRes.status === "fulfilled" &&
          bookedSeatsRes.value.data?.success
        ) {
          const bookedMap = new Map<string, BookedSeatsData>();
          (
            bookedSeatsRes.value.data?.data?.breakdown?.byGroup || []
          ).forEach((group: BookedSeatsData) => {
            const groupId = getId(group.groupId);
            if (!groupId) return;
            bookedMap.set(groupId, {
              ...group,
              totalSeats: Number(group.totalSeats) || 0,
            });
          });
          setBookedSeatsByGroup(bookedMap);
        }

        // Handle Umrah bookings
        if (
          umrahBookingsRes.status === "fulfilled" &&
          umrahBookingsRes.value.data?.success
        ) {
          const fetchedUmrahBookings = umrahBookingsRes.value.data.data || [];
          setUmrahBookings(fetchedUmrahBookings);

          const statusCountMap = new Map<string, UmrahBookingStatusCounts>();
          fetchedUmrahBookings.forEach((booking: UmrahBookingData) => {
            const packageKey = getBookingPackageKey(booking);
            if (!packageKey) return;

            const current = statusCountMap.get(packageKey) || {
              pending: 0,
              cancelled: 0,
            };

            if (booking.overallStatus === "Pending") {
              current.pending += 1;
            }

            if (booking.overallStatus === "Cancelled") {
              current.cancelled += 1;
            }

            statusCountMap.set(packageKey, current);
          });
          setUmrahBookingStatusCounts(statusCountMap);
        }

        // Combine all packages
        const allPackages = [...localPackages, ...travelPackages, ...abidAirPackages];
        setPackages(allPackages);

        // Handle visibility settings
        if (visibilityRes.status === "fulfilled" && visibilityRes.value.data?.success) {
          const visibilityData = visibilityRes.value.data.data || [];
          const newMap = new Map<string, boolean>();
          visibilityData.forEach((item: PackageVisibility) => {
            const key = item.externalId ? String(item.externalId) : item.packageId;
            newMap.set(getVisibilityKey(item.source, key), item.isVisible);
          });
          setVisibilityMap(newMap);
        }

        // Handle Travel Network margin
        if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
          const amount = Number(marginRes.value.data.data?.marginAmount) || 0;
          setTravelMargin(amount);
          setTravelMarginInput(String(amount));
        }

        // Handle Abid Air margin
        if (abidMarginRes.status === "fulfilled" && abidMarginRes.value.data?.success) {
          const amount = Number(abidMarginRes.value.data.data?.marginAmount) || 0;
          setAbidMargin(amount);
          setAbidMarginInput(String(amount));
        }

      } catch (error) {
        console.error("Error fetching packages:", error);
        toast.error("Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [canView]);

  const handleTogglePublicStatus = async (
    packageId: string,
    checked: boolean
  ) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }

    const pkg = packages.find((p) => p._id === packageId);
    if (["travel-network", "abid-air"].includes(pkg?.packageSource || "")) {
      toast.warning("External supplier packages cannot be edited");
      return;
    }

    const nextStatus: "Public" | "Private" = checked ? "Public" : "Private";
    const previousPackages = packages;

    setPackages((prev) =>
      prev.map((pkg) =>
        pkg._id === packageId ? { ...pkg, internalStatus: nextStatus } : pkg
      )
    );

    try {
      const { data } = await axiosInstance.patch(
        `/umrahpackages/${packageId}/internal-status`,
        { internalStatus: nextStatus }
      );

      if (!data?.success) {
        throw new Error(data?.message || "Failed to update status");
      }

      toast.success(`Package is now ${nextStatus}`);
    } catch (error) {
      console.error("Error updating package status:", error);
      setPackages(previousPackages);
      toast.error("Failed to update package status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }

    const pkg = packages.find((p) => p._id === id);
    if (["travel-network", "abid-air"].includes(pkg?.packageSource || "")) {
      toast.warning("External supplier packages cannot be deleted");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this package?")) return;

    try {
      await axiosInstance.delete(`/umrahpackages/${id}`);

      setPackages((prev) => prev.filter((pkg) => pkg._id !== id));
      setSelectedPackageIds((prev) => prev.filter((item) => item !== id));

      toast.success("Package deleted successfully");
    } catch (error) {
      console.error("Error deleting package:", error);
      toast.error("Failed to delete package");
    }
  };

  const handleViewBookings = (pkg: PackageData) => {
    const packageKey = getPackageBookingKey(pkg);
    const bookingsForPackage = umrahBookings.filter(
      (booking) => getBookingPackageKey(booking) === packageKey
    );
    setSelectedBookingsPackage(pkg);
    setPackageBookings(bookingsForPackage);
    setBookingsModalOpen(true);
  };

  const handleOpenBookingDetails = (bookingId?: string) => {
    if (!bookingId) return;
    window.open(
      `/admin-portal/umrah-pkg-bookings?bookingId=${bookingId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedPackageIds(filteredPackages.map((pkg) => pkg._id));
    } else {
      setSelectedPackageIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportPDF = async () => {
    if (selectedPackageIds.length === 0) {
      toast.warning("Please select at least one package to print PDF!");
      return;
    }

    setPdfLoading(true);

    try {
      const selectedData = packages.filter((pkg) =>
        selectedPackageIds.includes(pkg._id)
      );

      const formattedPackagesForPDF: UmrahPackage[] = selectedData.map(
        (pkg) => {
          const seatStats = getPackageSeatStats(pkg);

          return {
            packageName: pkg.packageName,
            logo: pkg.flightLogo || pkg.logo,
            seatSummary: {
              total: seatStats.totalSeats,
              requested: seatStats.pendingBookings,
              confirmed: seatStats.bookedSeats,
              cancelled: seatStats.cancelledBookings,
              remaining: seatStats.remainingSeats,
            },
            packageDuration: pkg.days || 21,
            flights: pkg.flights.map((flight) => ({
              flightNo: flight.flightNo,
              sectorFrom: flight.sectorFrom,
              sectorTo: flight.sectorTo,
              depDate: flight.depDate,
            })),
            hotels: pkg.hotels.map((hotel) => ({
              name: hotel.name,
              city: hotel.location?.city || "-",
              distance: hotel.location?.distance || hotel.distance || "-",
            })),
            packageTotals: {
              double: pkg.packageTotals?.double || 0,
              triple: pkg.packageTotals?.triple || 0,
              quad: pkg.packageTotals?.quad || 0,
              shared: pkg.packageTotals?.shared || 0,
              childWithoutBed: pkg.packageTotals?.childWithoutBed || 0,
              infant: pkg.packageTotals?.infant || 0,
            },
            rooms: {
              sharing: pkg.rooms?.sharing ?? undefined,
              double: pkg.rooms?.double ?? undefined,
              triple: pkg.rooms?.triple ?? undefined,
              quad: pkg.rooms?.quad ?? undefined,
              quint: pkg.rooms?.quint ?? undefined,
            },
          };
        }
      );

      await generateUmrahPackagesPDF(formattedPackagesForPDF);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error creating PDF structure:", error);
      toast.error("Failed to compile and download PDF package.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
        You do not have permission to view Umrah Packages.
      </div>
    );
  }

  const isAllSelected =
    filteredPackages.length > 0 &&
    filteredPackages.every((pkg) => selectedPackageIds.includes(pkg._id));

  const handleSaveMargin = async () => {
    if (!canUseActions) {
      toast.error("You don't have permission to update margin");
      return;
    }
    const parsed = Number(travelMarginInput);
    if (isNaN(parsed)) {
      toast.error("Please enter a valid PKR amount");
      return;
    }
    setSavingMargin(true);
    try {
      const res = await axiosInstance.post("/travel-network-margin", {
        marginAmount: parsed,
        source: "travel-network",
      });
      if (res.data?.success) {
        setTravelMargin(parsed);
        toast.success("Travel Network margin saved successfully");
      } else {
        throw new Error(res.data?.message || "Failed to save margin");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save margin");
    } finally {
      setSavingMargin(false);
    }
  };

  const handleSaveAbidMargin = async () => {
    if (!canUseActions) {
      toast.error("You don't have permission to update margin");
      return;
    }
    const parsed = Number(abidMarginInput);
    if (isNaN(parsed)) {
      toast.error("Please enter a valid PKR amount");
      return;
    }
    setSavingAbidMargin(true);
    try {
      const res = await axiosInstance.post("/travel-network-margin", {
        marginAmount: parsed,
        source: "abid-air",
      });
      if (res.data?.success) {
        setAbidMargin(parsed);
        toast.success("Abid Air margin saved successfully");
      } else {
        throw new Error(res.data?.message || "Failed to save margin");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save margin");
    } finally {
      setSavingAbidMargin(false);
    }
  };

  const localCount = packages.filter((p) => getPackageSource(p) === "local-db").length;
  const travelCount = packages.filter((p) => getPackageSource(p) === "travel-network").length;
  const abidAirCount = packages.filter((p) => getPackageSource(p) === "abid-air").length;

  const getPackageSeatStats = (pkg: PackageData) => {
    const selectedGroupTicketId = getId(
      pkg.selectedGroupTicketId || pkg.groupTicket?._id || pkg.groupTicket?.id
    );
    const linkedTotalSeats =
      groupTicketTotalSeats.get(selectedGroupTicketId) ??
      Number(pkg.groupTicket?.totalSeats || 0);
    const bookedSeats =
      bookedSeatsByGroup.get(selectedGroupTicketId)?.totalSeats || 0;
    const bookingStatusCounts = umrahBookingStatusCounts.get(getPackageBookingKey(pkg)) || {
      pending: 0,
      cancelled: 0,
    };
    const remainingSeats =
      selectedGroupTicketId && linkedTotalSeats >= 0
        ? Math.max(0, linkedTotalSeats - bookedSeats)
        : 0;

    return {
      totalSeats: linkedTotalSeats,
      bookedSeats,
      pendingBookings: bookingStatusCounts.pending,
      cancelledBookings: bookingStatusCounts.cancelled,
      remainingSeats,
    };
  };

  return (
    <ComponentCard title="Manage Umrah Packages">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Manage Umrah Packages
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Clean package list with pricing, sectors, hotels, transport and
            public status.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:max-w-xl xl:justify-end">
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading || selectedPackageIds.length === 0}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${selectedPackageIds.length === 0
                ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700"
                : "bg-cyan-700 hover:bg-cyan-800 focus:ring-2 focus:ring-cyan-200"
              }`}
          >
            {pdfLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating PDF...
              </span>
            ) : (
              `Export Selected PDF (${selectedPackageIds.length})`
            )}
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search packages..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20 sm:max-w-sm"
          />
        </div>
      </div>

      {/* Tabs for filtering packages by source */}
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4 dark:border-white/10">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
          >
            All Packages
            <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {packages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("local")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === "local"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
          >
            Local DB
            <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {localCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("travel")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === "travel"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
          >
            Travel Network
            <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {travelCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("abid")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === "abid"
                ? "bg-cyan-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
          >
            Abid Air
            <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {abidAirCount}
            </span>
          </button>
        </div>

        {/* Visibility control for travel network packages */}
        {activeTab === "travel" && travelNetworkPackages.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Travel Network Margin Input */}
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 dark:border-purple-800/40 dark:bg-purple-900/20">
              <label className="text-xs font-semibold text-purple-700 whitespace-nowrap dark:text-purple-400">
                Margin (PKR):
              </label>
              <input
                type="number"
                step="100"
                value={travelMarginInput}
                onChange={(e) => setTravelMarginInput(e.target.value)}
                className="w-28 rounded border border-purple-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 dark:border-purple-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="e.g. 5000 or -5000"
              />
              <button
                onClick={handleSaveMargin}
                disabled={savingMargin}
                className="rounded bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {savingMargin ? "Saving..." : "Save"}
              </button>
              {travelMargin !== 0 && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400">
                  Active: PKR {travelMargin.toLocaleString()}
                  {travelMargin < 0 ? " (discount)" : ""}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setVisibilityModalSource("travel-network");
                setVisibilityModalOpen(true);
              }}
              className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            >
              <EyeIcon className="mr-1 inline h-4 w-4" />
              Manage Visibility
            </button>
            <button
              onClick={() => toggleAllTravelPackages(!areAllTravelPackagesVisible())}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              {areAllTravelPackagesVisible() ? "Hide All" : "Show All"}
            </button>
          </div>
        )}

        {/* Visibility & margin control for Abid Air packages */}
        {activeTab === "abid" && abidAirVisibilityPackages.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Abid Air Margin Input */}
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 dark:border-cyan-800/40 dark:bg-cyan-900/20">
              <label className="text-xs font-semibold text-cyan-700 whitespace-nowrap dark:text-cyan-400">
                Margin (PKR):
              </label>
              <input
                type="number"
                step="100"
                value={abidMarginInput}
                onChange={(e) => setAbidMarginInput(e.target.value)}
                className="w-28 rounded border border-cyan-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200 dark:border-cyan-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="e.g. 5000 or -5000"
              />
              <button
                onClick={handleSaveAbidMargin}
                disabled={savingAbidMargin}
                className="rounded bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingAbidMargin ? "Saving..." : "Save"}
              </button>
              {abidMargin !== 0 && (
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  Active: PKR {abidMargin.toLocaleString()}
                  {abidMargin < 0 ? " (discount)" : ""}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setVisibilityModalSource("abid-air");
                setVisibilityModalOpen(true);
              }}
              className="rounded-lg bg-cyan-100 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50"
            >
              <EyeIcon className="mr-1 inline h-4 w-4" />
              Manage Visibility
            </button>
            <button
              onClick={() => toggleAllPackagesBySource("abid-air", !areAllPackagesVisible("abid-air"))}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              {areAllPackagesVisible("abid-air") ? "Hide All" : "Show All"}
            </button>
          </div>
        )}
      </div>

      {/* FIXED: Table container - removed overflow-x-auto and min-w constraints */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/3">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-200 bg-gray-900 dark:border-white/10 dark:bg-gray-950">
              <TableRow>
                <TableCell isHeader className="w-[3%] px-2 py-3 sm:px-4 sm:py-4">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableCell>

                <TableCell
                  isHeader
                  className="w-[7%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Date
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[20%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Package Name
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[10%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Departure
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[22%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Price
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[18%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Sector
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[8%] px-2 py-3 text-start text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Visa
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[6%] px-2 py-3 text-center text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Public
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[6%] px-2 py-3 text-center text-xs font-bold text-white sm:px-4 sm:py-4 sm:text-sm"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading Packages...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPackages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {searchTerm.trim()
                      ? "No matching packages found"
                      : activeTab === "travel"
                        ? "No travel network packages available"
                        : activeTab === "local"
                          ? "No local packages found"
                          : "No packages found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.map((pkg) => {
                  const isSelected = selectedPackageIds.includes(pkg._id);
                  const departureRange = getDepartureRange(pkg.flights);
                  const sectorText = getSectorText(pkg.flights);
                  const transportAdded = hasTransportInPackage(pkg);
                  const seatStats = getPackageSeatStats(pkg);
                  const packageSource = getPackageSource(pkg);
                  const isTravelNetwork = packageSource === "travel-network";
                  const isAbidAir = packageSource === "abid-air";
                  const isExternalPackage = isTravelNetwork || isAbidAir;
                  const displayId = isExternalPackage ? getPackageExternalId(pkg) : pkg._id;
                  const visibilityKey = getVisibilityKey(packageSource, displayId);

                  // For travel network packages, check the visibility map (default visible)
                  const isVisible = isExternalPackage
                    ? visibilityMap.get(visibilityKey) !== false
                    : true;

                  return (
                    <TableRow
                      key={pkg._id}
                      className={`border-b border-gray-200 align-top transition last:border-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/4 ${isSelected
                          ? "bg-blue-50/60 dark:bg-blue-900/10"
                          : "bg-white dark:bg-transparent"
                        } ${isTravelNetwork ? "border-l-4 border-l-purple-400" : isAbidAir ? "border-l-4 border-l-cyan-400" : ""}`}
                    >
                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(pkg._id)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>

                      <TableCell className="px-2 py-3 text-xs text-gray-700 sm:px-4 sm:py-5 sm:text-sm dark:text-gray-300">
                        <div className="leading-5">
                          {formatDate(pkg.createdAt)}
                        </div>
                        {isExternalPackage && (
                          <span className="mt-1 inline-block rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 sm:px-2 sm:text-xs dark:bg-purple-900/30 dark:text-purple-400">
                            {isAbidAir ? "Abid Air" : "Travel Network"}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <div className="flex items-start gap-2 sm:gap-3">
                          {pkg.logo ? (
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:h-10 sm:w-10 dark:border-white/10">
                              <img
                                src={pkg.logo}
                                alt={pkg.packageName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}

                          <div className="min-w-0">
                            <p className="text-xs font-extrabold uppercase text-gray-800 sm:text-sm dark:text-gray-100">
                              {pkg.packageName || "N/A"}
                              {isExternalPackage && (
                                <span className="ml-1 text-[10px] font-normal text-purple-600 sm:text-xs">
                                  ID: {displayId}
                                </span>
                              )}
                            </p>

                            <p className="mt-1 text-[11px] font-bold text-gray-700 sm:text-xs dark:text-gray-300">
                              Days:
                              <span className="ml-1 font-semibold">
                                {pkg.days || 0}
                              </span>
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <div className="space-y-0.5 text-[11px] font-semibold sm:text-sm">
                          <p className="text-green-600">
                            From: {departureRange.from}
                          </p>
                          <p className="text-red-500">
                            To: {departureRange.to}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                          <table className="w-full border-collapse text-[10px] sm:text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Type
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Dbl
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Trp
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Qud
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Shr
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr className="bg-gray-50 dark:bg-white/4">
                                <td className="px-1 py-1 font-extrabold text-green-600 sm:px-3 sm:py-2">
                                  Sell
                                </td>
                                <td className="px-1 py-1 font-bold text-green-600 sm:px-3 sm:py-2">
                                  {formatMoney(pkg.packageTotals?.double)}
                                </td>
                                <td className="px-1 py-1 font-bold text-green-600 sm:px-3 sm:py-2">
                                  {formatMoney(pkg.packageTotals?.triple)}
                                </td>
                                <td className="px-1 py-1 font-bold text-green-600 sm:px-3 sm:py-2">
                                  {formatMoney(pkg.packageTotals?.quad)}
                                </td>
                                <td className="px-1 py-1 font-bold text-green-600 sm:px-3 sm:py-2">
                                  {formatMoney(pkg.packageTotals?.shared)}
                                </td>
                              </tr>
                              {/* Travel Network / Abid Air: show original + margin row */}
                              {(() => {
                                const activeMargin = isTravelNetwork ? travelMargin : isAbidAir ? abidMargin : 0;
                                if (!activeMargin) return null;
                                const rowClass = isAbidAir
                                  ? "bg-cyan-50 dark:bg-cyan-900/10"
                                  : "bg-purple-50 dark:bg-purple-900/10";
                                const textClass = isAbidAir ? "text-cyan-700" : "text-purple-700";
                                return (
                                  <tr className={rowClass}>
                                    <td className={`px-1 py-1 font-extrabold ${textClass} sm:px-3 sm:py-2`}>
                                      {activeMargin > 0 ? "+Margin" : "-Margin"}
                                    </td>
                                    {(["double", "triple", "quad", "shared"] as const).map((key) => {
                                      const base = pkg.packageTotals?.[key];
                                      const withMargin = typeof base === "number" && base > 0 ? Math.max(0, base + activeMargin) : null;
                                      return (
                                        <td key={key} className={`px-1 py-1 font-bold ${textClass} sm:px-3 sm:py-2`}>
                                          {withMargin !== null ? formatMoney(withMargin) : "—"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-2 overflow-hidden rounded-md border border-gray-200 sm:mt-3 dark:border-white/10">
                          <table className="w-full border-collapse text-[10px] sm:text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2">
                                  Tot
                                </th>
                                <th className="px-1 py-1 text-left font-extrabold text-green-600 sm:px-3 sm:py-2">
                                  Con
                                </th>
                                <th className="px-1 py-1 text-left font-extrabold text-red-500 sm:px-3 sm:py-2">
                                  Can
                                </th>
                                <th className="px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2">
                                  Rem
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr className="bg-gray-50 text-gray-700 dark:bg-white/4 dark:text-gray-300">
                                <td className="px-1 py-1 sm:px-3 sm:py-2">
                                  {seatStats.totalSeats}
                                </td>
                                <td className="px-1 py-1 sm:px-3 sm:py-2">
                                  {seatStats.bookedSeats}
                                </td>
                                <td className="px-1 py-1 sm:px-3 sm:py-2">
                                  {seatStats.cancelledBookings}
                                </td>
                                <td className="px-1 py-1 sm:px-3 sm:py-2">
                                  {seatStats.remainingSeats}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <p className="mb-2 text-[11px] font-extrabold uppercase text-gray-900 sm:text-sm dark:text-gray-100">
                          {sectorText}
                        </p>

                        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                          <table className="w-full border-collapse text-[10px] sm:text-xs">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Hotel
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  City
                                </th>
                                <th className="border-b border-gray-200 px-1 py-1 text-left font-extrabold sm:px-3 sm:py-2 dark:border-white/10">
                                  Dist
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {pkg.hotels && pkg.hotels.length > 0 ? (
                                pkg.hotels.map((hotel, index) => (
                                  <tr
                                    key={`${hotel.name}-${index}`}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white dark:bg-transparent"
                                        : "bg-gray-50 dark:bg-white/4"
                                    }
                                  >
                                    <td className="border-b border-gray-200 px-1 py-1 font-bold uppercase text-gray-700 last:border-b-0 sm:px-3 sm:py-2 dark:border-white/10 dark:text-gray-300">
                                      {hotel.name || "N/A"}
                                    </td>
                                    <td className="border-b border-gray-200 px-1 py-1 font-bold uppercase text-gray-700 last:border-b-0 sm:px-3 sm:py-2 dark:border-white/10 dark:text-gray-300">
                                      {hotel.location?.city || "N/A"}
                                    </td>
                                    <td className="border-b border-gray-200 px-1 py-1 font-bold text-gray-700 last:border-b-0 sm:px-3 sm:py-2 dark:border-white/10 dark:text-gray-300">
                                      {hotel.location?.distance ||
                                        hotel.distance ||
                                        "N/A"}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-1 py-3 text-center text-gray-500 sm:px-3 sm:py-4"
                                  >
                                    No hotel data
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <div className="space-y-2">
                          {transportAdded ? (
                            <span className="inline-flex whitespace-nowrap rounded-md bg-gray-800 px-1.5 py-0.5 text-[10px] font-extrabold text-white sm:px-2.5 sm:py-1 sm:text-xs dark:bg-gray-700">
                              Transport
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-extrabold text-gray-600 sm:px-2.5 sm:py-1 sm:text-xs dark:bg-white/10 dark:text-gray-300">
                              None
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        {isExternalPackage ? (
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={(event) => {
                                togglePackageVisibility(
                                  String(displayId),
                                  event.target.checked,
                                  isAbidAir ? "abid-air" : "travel-network",
                                );
                              }}
                              disabled={!canUseActions}
                              className="peer sr-only"
                            />
                            <div className="peer h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-4 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 sm:h-6 sm:w-11 sm:after:h-5 sm:after:w-5 sm:peer-checked:after:translate-x-5" />
                          </label>
                        ) : (
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={(pkg.internalStatus || "Public") === "Public"}
                              onChange={(event) =>
                                handleTogglePublicStatus(
                                  pkg._id,
                                  event.target.checked
                                )
                              }
                              disabled={!canUseActions}
                              className="peer sr-only"
                            />
                            <div className="peer h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-4 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 sm:h-6 sm:w-11 sm:after:h-5 sm:after:w-5 sm:peer-checked:after:translate-x-5" />
                          </label>
                        )}
                      </TableCell>

                      <TableCell className="px-2 py-3 sm:px-4 sm:py-5">
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          <button
                            onClick={() =>
                              canUseActions &&
                              handleViewBookings(pkg)
                            }
                            className="whitespace-nowrap rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700 sm:px-3 sm:py-2 sm:text-xs"
                            title="View Umrah bookings for this package"
                          >
                            Bookings
                          </button>

                          <div className="flex gap-1.5 sm:gap-2">
                            {isExternalPackage ? (
                              <button
                                disabled
                                className="flex flex-1 justify-center rounded-lg bg-gray-100 p-1.5 text-gray-400 cursor-not-allowed sm:p-2 dark:bg-white/5"
                                title="External supplier packages cannot be edited"
                              >
                                <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  canUseActions &&
                                  window.open(
                                    `/admin-portal/update-umrah-package/${pkg._id}`,
                                    "_blank"
                                  )
                                }
                                disabled={!canUseActions}
                                className="flex flex-1 justify-center rounded-lg bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:p-2 dark:bg-blue-500/10"
                                title={
                                  canUseActions
                                    ? "Edit"
                                    : "You don't have permission to manage Umrah packages"
                                }
                              >
                                <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(pkg._id)}
                              disabled={!canUseActions || isExternalPackage}
                              className={`flex flex-1 justify-center rounded-lg p-1.5 transition sm:p-2 ${isExternalPackage
                                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5"
                                  : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-500/10"
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                              title={
                                isExternalPackage
                                  ? "External supplier packages cannot be deleted"
                                  : canUseActions
                                    ? "Delete"
                                    : "You don't have permission to manage Umrah packages"
                              }
                            >
                              <TrashBinIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Visibility Management Modal for Travel Network / Abid Air Packages */}
      {(() => {
        const modalIsAbid = visibilityModalSource === "abid-air";
        const modalPackages = modalIsAbid ? abidAirVisibilityPackages : travelNetworkPackages;
        const modalLabel = modalIsAbid ? "Abid Air Packages" : "Travel Network Packages";
        const modalAccent = modalIsAbid ? "cyan" : "purple";

        return (
          <Modal
            isOpen={visibilityModalOpen}
            onClose={() => setVisibilityModalOpen(false)}
            className="max-w-4xl"
          >
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="mb-5 pr-12">
                <p className={`text-xs font-bold uppercase tracking-wide text-${modalAccent}-700`}>
                  {modalLabel}
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  Manage Package Visibility
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Toggle visibility of {modalLabel.toLowerCase()}. Hidden packages will not appear in the main list.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleAllPackagesBySource(visibilityModalSource, true)}
                    className={`rounded-lg bg-${modalAccent}-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-${modalAccent}-700`}
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => toggleAllPackagesBySource(visibilityModalSource, false)}
                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                  >
                    Hide All
                  </button>
                  <span className="text-sm text-gray-500">
                    {modalPackages.filter((pkg) => {
                      const id = getPackageExternalId(pkg);
                      return visibilityMap.get(getVisibilityKey(visibilityModalSource, id)) !== false;
                    }).length} of {modalPackages.length} visible
                  </span>
                </div>
              </div>

              {modalPackages.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
                  No {modalLabel.toLowerCase()} found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-150 border-collapse bg-white text-sm">
                      <thead>
                        <tr className="bg-gray-900 text-white">
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                            Package Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                            External ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                            Days
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                            Rooms
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide">
                            Visibility
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {modalPackages.map((pkg) => {
                          const packageId = getPackageExternalId(pkg);
                          const isVisible =
                            visibilityMap.get(getVisibilityKey(visibilityModalSource, packageId)) !== false;

                          return (
                            <tr key={packageId} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {pkg.logo && (
                                    <img
                                      src={pkg.logo}
                                      alt={pkg.packageName}
                                      className="h-10 w-10 rounded-lg object-cover"
                                    />
                                  )}
                                  <div>
                                    <div className="font-bold text-gray-900">
                                      {pkg.packageName || "N/A"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {pkg.flights?.[0]?.airline || "Unknown Airline"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-sm text-gray-600">
                                {packageId}
                              </td>
                              <td className="px-4 py-4 font-semibold text-gray-700">
                                {pkg.days || 0}
                              </td>
                              <td className="px-4 py-4 font-semibold text-gray-700">
                                {pkg.availableRooms || 0}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isVisible
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                    }`}
                                >
                                  {isVisible ? "Visible" : "Hidden"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() =>
                                    togglePackageVisibility(packageId, !isVisible, visibilityModalSource)
                                  }
                                  disabled={!canUseActions}
                                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${isVisible
                                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                                      : "bg-green-100 text-green-700 hover:bg-green-200"
                                    } disabled:opacity-50`}
                                >
                                  {isVisible ? "Hide" : "Show"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      <Modal
        isOpen={bookingsModalOpen}
        onClose={() => {
          setBookingsModalOpen(false);
          setSelectedBookingsPackage(null);
          setPackageBookings([]);
        }}
        className="max-w-7xl"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 pr-12">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Umrah Package Bookings
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">
              {selectedBookingsPackage?.packageName || "Package"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {packageBookings.length} booking
              {packageBookings.length === 1 ? "" : "s"} found for this package
            </p>
          </div>

          {packageBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
              No Umrah package bookings found for this package.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 border-collapse bg-white text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      {[
                        "Booking",
                        "Booked On",
                        "Agent",
                        "Passengers",
                        "Final Price",
                        "Payment",
                        "Status",
                        "Action",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {packageBookings.map((booking) => {
                      const passengerCount = booking.passengerCount || {};
                      const currency = booking.pricing?.currency || "PKR";
                      const totalPrice =
                        booking.pricing?.totalPrice ??
                        booking.paymentStatus?.totalAmount ??
                        0;

                      return (
                        <tr key={booking._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">
                              BK# {booking.bookingNumber || "N/A"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-gray-500">
                              {booking.roomType || "Package"}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-700">
                            {formatDate(booking.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">
                              {booking.user?.companyName ||
                                booking.user?.name ||
                                "N/A"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {booking.user?.email || ""}
                            </div>
                            {booking.user?.phone ? (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {booking.user.phone}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <div className="inline-grid grid-cols-4 overflow-hidden rounded-lg border border-gray-200 text-center text-xs">
                              {[
                                ["Adt", passengerCount.adults || 0],
                                ["Chd", passengerCount.children || 0],
                                ["Inf", passengerCount.infants || 0],
                                ["Tot", passengerCount.total || 0],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="min-w-10 border-r border-gray-200 px-2 py-1.5 last:border-r-0"
                                >
                                  <div className="font-bold text-gray-400">
                                    {label}
                                  </div>
                                  <div className="font-black text-gray-800">
                                    {value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-black text-emerald-700">
                            {currency} {Number(totalPrice).toLocaleString("en-PK")}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(
                                booking.paymentStatus?.status
                              )}`}
                            >
                              {booking.paymentStatus?.status || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(
                                booking.overallStatus
                              )}`}
                            >
                              {booking.overallStatus || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleOpenBookingDetails(booking._id)}
                              className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                            >
                              <EyeIcon className="h-3 w-3" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ToastContainer style={{ zIndex: 9999999 }} />
    </ComponentCard>
  );
};

export default ManageUmrahPackage;
