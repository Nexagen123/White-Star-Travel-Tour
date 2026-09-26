import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoSrc from "../assets/images/whitestarlogo.png";
import makkahSrc from "../assets/images/makkah.webp";
import madinaSrc from "../assets/images/madina.webp";
import iataSrc from "../assets/images/iata.png";
import kaabaIconSrc from "../assets/images/kaaba.png";

// Page is A4 width at 96dpi; height is driven by content so a group with one
// package produces a short page instead of a mostly-empty A4 sheet.
const PAGE_W_PX = 794;
const PAGE_PAD = 26;
const ROWS_PER_PAGE = 6;

const FONT_STACK = "'Segoe UI', Roboto, Arial, sans-serif";

const NAVY = "#1b2a5e";
const NAVY_DARK = "#101a3d";
const GOLD = "#c9a24a";
const GREEN = "#12813f";
const ORANGE = "#e2661f";
const GRAY_BG = "#f2f4f8";
const HAIRLINE = "#e4e7ee";
const TEXT_GRAY = "#8b93a1";

const CONTACT_PHONE_1 = "0333-7736611";
const CONTACT_PHONE_2 = "0344-7736611";
const CONTACT_ADDRESS =
  "Office # 130, Ground Floor, City Mall, Chen One Road, Faisalabad";
const TAGLINE = "We Plan Your Journey, You Share Your Faith";

// Common carriers on Umrah routes — resolves a bare IATA code (as stored on
// older records) to its full display name. Anything already a full name, or
// not in this table, passes through unchanged.
const AIRLINE_NAMES = {
  SV: "Saudi Arabian Airlines",
  PK: "Pakistan International Airlines",
  PA: "Airblue",
  FZ: "flydubai",
  EK: "Emirates",
  QR: "Qatar Airways",
  GF: "Gulf Air",
  KU: "Kuwait Airways",
  WY: "Oman Air",
  EY: "Etihad Airways",
  "9P": "Fly Jinnah",
  ER: "Serene Air",
  G9: "Air Arabia",
  XY: "flynas",
  F3: "flyadeal",
  TK: "Turkish Airlines",
};

const resolveAirlineName = (name) => {
  const key = String(name || "")
    .trim()
    .toUpperCase();
  return AIRLINE_NAMES[key] || name;
};

// CORS-enabled logo CDN, keyed by IATA code — used as a fallback when a
// package's own uploaded logo can't be loaded into the canvas (most admin
// uploads are same-origin/plain <img> only and have no CORS headers, which
// html2canvas requires to draw them without tainting the page).
const wwayLogoUrl = (code) =>
  /^[A-Z0-9]{2,3}$/.test(code)
    ? `https://img.wway.io/pics/root/${code}@png?exar=1&rs=fit:80:40`
    : null;

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}${MONTHS[d.getMonth()]}`;
};

const trimTime = (t) => (t ? String(t).slice(0, 5) : "--:--");

const fmt = (n) => Number(n).toLocaleString();

// Route title plaque is a fixed layout (794px page, 26px page padding, two
// 120px side columns with 14px margins, 16px plaque padding, 3px border) —
// so the box the route text has to fit in is always exactly this wide.
const TITLE_BOX_WIDTH = 794 - 26 * 2 - 120 * 2 - 14 * 2 - 16 * 2 - 3 * 2;

let _measureCtx = null;
const measureTextWidth = (text, fontSize, letterSpacing = 2) => {
  if (!_measureCtx) {
    _measureCtx = document.createElement("canvas").getContext("2d");
  }
  _measureCtx.font = `800 ${fontSize}px ${FONT_STACK}`;
  const base = _measureCtx.measureText(text).width;
  if ("letterSpacing" in _measureCtx) {
    _measureCtx.letterSpacing = `${letterSpacing}px`;
    return _measureCtx.measureText(text).width;
  }
  return base + letterSpacing * Math.max(0, text.length - 1);
};

// Finds the largest font size (with a small safety margin) that keeps the
// route title on one line, matching the reference flyer instead of wrapping.
const fitTitleFontSize = (text, maxWidth = TITLE_BOX_WIDTH - 8) => {
  for (let size = 34; size >= 14; size -= 1) {
    if (measureTextWidth(text, size) <= maxWidth) return size;
  }
  return 14;
};

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
    // A stalled/hanging request (dead host, blocked port) would otherwise
    // never fire load or error and stall PDF generation indefinitely.
    const timer = setTimeout(() => done(null), 6000);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });

const waitForImages = (root) => {
  const imgs = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 3000);
      });
    }),
  );
};

const ROOM_TYPES = ["sharing", "quad", "triple", "double"];
const ROOM_LABELS = {
  sharing: "SHARING",
  quad: "QUAD",
  triple: "TRIPLE",
  double: "DOUBLE",
};

const getRoomPrice = (pkg, type) => {
  const totals = pkg.packageTotals || {};
  const rooms = pkg.rooms || {};
  if (type === "sharing") return totals.shared || rooms.sharing || 0;
  return totals[type] || rooms[type] || 0;
};

// Groups packages either by their full route (sector) or by airline, so each
// group gets one flyer-style header instead of repeating it per package.
const getDuration = (pkg) => {
  const d = parseInt(pkg.packageDuration);
  if (d > 0) return String(d);
  const flights = pkg.flights || [];
  const start = new Date(pkg.dept_date || flights[0]?.depDate || NaN);
  const end = new Date(
    pkg.returnDate || flights[flights.length - 1]?.arrDate || NaN,
  );
  if (isNaN(start) || isNaN(end)) return "";
  const days = Math.round((end - start) / 86400000) + 1;
  return days > 0 ? String(days) : "";
};

// Each flyer header describes exactly one route + airline + duration, so the
// days, airline name and logo in the header are true for every card beneath
// it. "groupBy" only decides the order the flyers are emitted in.
const groupPackages = (packages, groupBy) => {
  const map = new Map();

  packages.forEach((pkg) => {
    const flights = pkg.flights || [];
    const routeTokens = flights.length
      ? [
          flights[0].sectorFrom || "",
          ...flights.map((f) => f.sectorTo || ""),
        ].filter(Boolean)
      : (pkg.sector || "").split("-").filter(Boolean);
    const routeLabel = routeTokens.join("-") || pkg.sector || "UNKNOWN";
    const airline = pkg.airlineName || pkg.airline?.airline_name || "Airline";
    const duration = getDuration(pkg);

    const key = `${routeLabel}|${airline}|${duration}`;

    if (!map.has(key)) {
      map.set(key, {
        title: routeLabel,
        airline,
        duration,
        airlineLogo: null,
        packages: [],
      });
    }
    const g = map.get(key);
    if (!g.airlineLogo) {
      g.airlineLogo = pkg.airline?.logo_url || pkg.logo || null;
    }
    g.packages.push(pkg);
  });

  map.forEach((g) => {
    g.packages.sort((a, b) => {
      const da = new Date(
        a.dept_date || a.flights?.[0]?.depDate || 0,
      ).getTime();
      const db = new Date(
        b.dept_date || b.flights?.[0]?.depDate || 0,
      ).getTime();
      return da - db;
    });
  });

  return Array.from(map.values())
    .map((g) => {
      const airlineCode = String(g.airline).trim().slice(0, 3).toUpperCase();
      return {
        title: g.title,
        airlineName: String(resolveAirlineName(g.airline)).toUpperCase(),
        airlineCode,
        duration: g.duration,
        airlineLogo: g.airlineLogo,
        airlineLogoFallback: wwayLogoUrl(airlineCode),
        packages: g.packages,
      };
    })
    .sort((a, b) => {
      const byRoute = a.title.localeCompare(b.title);
      const byAirline = a.airlineName.localeCompare(b.airlineName);
      const [first, second] =
        groupBy === "airline" ? [byAirline, byRoute] : [byRoute, byAirline];
      return first || second || Number(a.duration) - Number(b.duration);
    });
};

// ---- Icon glyphs, drawn inline so the PDF needs no icon font or network ----
const ICON_VISA = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/><path d="M4.8 16.5c.6-1.7 1.8-2.5 3.2-2.5s2.6.8 3.2 2.5"/><line x1="14.5" y1="9.5" x2="19.5" y2="9.5"/><line x1="14.5" y1="13" x2="19.5" y2="13"/></svg>`;
const ICON_FLIGHT = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2.5 1.5V22l4-1 4 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
const ICON_HOTEL = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M4 3h16a1 1 0 0 1 1 1v17H3V4a1 1 0 0 1 1-1zm2 3v2h3V6H6zm5 0v2h3V6h-3zm5 0v2h2V6h-2zM6 10v2h3v-2H6zm5 0v2h3v-2h-3zm5 0v2h2v-2h-2zM6 14v2h3v-2H6zm5 0v2h3v-2h-3zm5 0v2h2v-2h-2zm-6 4v3h4v-3h-4z"/></svg>`;
const ICON_TRANSPORT = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18 11H6V6h12v5z"/></svg>`;

// Madinah has no clean licensed icon asset in the project (the only file found
// is a watermarked stock preview), so this is a hand-built flat dome+minaret
// glyph in the same style as the Kaaba illustration used for Makkah.
const ICON_MADINAH = `<svg viewBox="0 0 48 48" width="100%" height="100%">
  <rect x="5" y="30" width="8" height="14" fill="#cbd2dc"/>
  <rect x="7.5" y="14" width="3" height="16" fill="#e6eaf0"/>
  <rect x="6" y="10.5" width="6" height="3.5" fill="#a8b1bf"/>
  <circle cx="9" cy="6.5" r="2.2" fill="${GOLD}"/>
  <path d="M18 33a12 12 0 0 1 24 0z" fill="#0e6b39"/>
  <path d="M21 33a9 9 0 0 1 18 0z" fill="#18a355"/>
  <rect x="16" y="33" width="28" height="11" rx="1.5" fill="#0c4a2a"/>
  <rect x="29" y="18" width="2" height="6" fill="${GOLD}"/>
  <circle cx="30" cy="15.5" r="2.4" fill="${GOLD}"/>
</svg>`;

const SERVICE_ITEMS = [
  { label: "VISA", icon: ICON_VISA },
  { label: "FLIGHT", icon: ICON_FLIGHT },
  { label: "HOTEL", icon: ICON_HOTEL },
  { label: "TRANSPORT", icon: ICON_TRANSPORT },
];

// Bakes a photo into an actual diamond-shaped PNG (crop + 45° rotation + gold
// border all done on a canvas) instead of relying on nested CSS transforms —
// html2canvas doesn't reliably fill a rotated+clipped box, leaving gaps at
// the diamond's points, so the diamond is pre-rendered as a plain flat image.
const createDiamondDataUrl = (img, size, borderPx) => {
  const preSize = Math.round(size / Math.SQRT2);

  const square = document.createElement("canvas");
  square.width = preSize;
  square.height = preSize;
  const sctx = square.getContext("2d");
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const scale = Math.max(preSize / sw, preSize / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  sctx.drawImage(img, (preSize - dw) / 2, (preSize - dh) / 2, dw, dh);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d");
  // JPEG has no alpha channel — the untouched corners outside the diamond
  // would otherwise export as solid black instead of blending into the page.
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, size, size);
  octx.save();
  octx.translate(size / 2, size / 2);
  octx.rotate(Math.PI / 4);
  octx.drawImage(square, -preSize / 2, -preSize / 2, preSize, preSize);
  octx.lineWidth = borderPx;
  octx.strokeStyle = GOLD;
  octx.strokeRect(
    -preSize / 2 + borderPx / 2,
    -preSize / 2 + borderPx / 2,
    preSize - borderPx,
    preSize - borderPx,
  );
  octx.restore();

  return out.toDataURL("image/jpeg", 0.92);
};

const diamondTile = (dataUrl, offsetLeft) => `
  <img src="${dataUrl}" style="width:62px;height:62px;display:block;margin-left:${offsetLeft}px;" />`;

const sizeIcon = (svg, px) =>
  svg.replace(
    'width="100%" height="100%"',
    `width="${px}" height="${px}" style="display:block;"`,
  );

// Plain block layout with fixed sizes (no flex centering) so every icon lands
// on the same baseline and html2canvas can't shift them relative to labels.
const serviceIconHtml = ({ label, icon }) => `
  <div style="width:25%;text-align:center;">
    <div style="width:24px;height:24px;margin:0 auto;color:#ffffff;">${sizeIcon(icon, 24)}</div>
    <div style="font-size:10px;line-height:13px;height:13px;font-weight:700;color:#ffffff;letter-spacing:0.6px;margin-top:5px;">${label}</div>
  </div>`;

const buildHeaderHtml = ({
  group,
  pageNum,
  totalPages,
  airlineLogoUrl,
  diamondUrls,
}) => {
  const duration = group.duration;

  const title = group.title;
  const titleSize = fitTitleFontSize(title);

  return `
  <div style="position:relative;">
    ${
      totalPages > 1
        ? `<div style="position:absolute;top:0;right:0;font-size:9px;line-height:11px;color:#a3a9b3;">PAGE ${pageNum} OF ${totalPages}</div>`
        : ""
    }

    <div style="display:flex;align-items:flex-start;justify-content:space-between;">
      <img src="${logoSrc}" style="height:62px;object-fit:contain;" />
      <div style="display:flex;align-items:center;margin-bottom:12px;">
        ${diamondTile(diamondUrls[0], 0)}
        ${diamondTile(diamondUrls[1], -14)}
      </div>
      <img src="${iataSrc}" style="height:48px;object-fit:contain;" />
    </div>

    <div style="display:flex;align-items:flex-start;justify-content:space-between;">
      <div style="width:120px;text-align:center;">
        <div style="border:1px solid ${HAIRLINE};border-radius:10px;background:${GRAY_BG};padding:6px 0 8px;">
          <div style="font-size:42px;line-height:44px;height:44px;font-weight:800;color:${NAVY};">${duration || "-"}</div>
          <div style="font-size:14px;line-height:17px;height:17px;font-weight:700;color:${NAVY};letter-spacing:2px;margin-top:2px;">DAYS</div>
        </div>
        <div style="font-size:25px;line-height:30px;height:30px;font-weight:800;color:${NAVY};letter-spacing:1px;margin-top:4px;">UMRAH</div>
      </div>

      <div style="flex:1;margin:0 14px;background:${NAVY};border:3px solid ${GOLD};border-radius:12px;padding:12px 16px 10px;">
        <div style="text-align:center;font-size:${titleSize}px;line-height:${titleSize + 8}px;font-weight:800;color:#ffffff;letter-spacing:2px;">${title}</div>
        <div style="display:flex;align-items:flex-start;width:100%;margin-top:10px;">
          ${SERVICE_ITEMS.map(serviceIconHtml).join("")}
        </div>
      </div>

      <div style="width:120px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:44px;">
        ${
          airlineLogoUrl
            ? `<img src="${airlineLogoUrl}" crossorigin="anonymous" style="max-width:100%;max-height:66px;object-fit:contain;" />`
            : `<div style="width:56px;height:56px;border-radius:28px;background:${NAVY};color:#ffffff;font-size:18px;line-height:56px;font-weight:800;text-align:center;">${group.airlineCode}</div>`
        }
        <div style="font-size:11px;line-height:14px;font-weight:800;color:${NAVY};letter-spacing:0.5px;margin-top:4px;">${group.airlineName}</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:10px;font-size:12px;line-height:15px;height:15px;font-weight:700;color:${ORANGE};letter-spacing:0.6px;">
      MAKKAH &nbsp;.&nbsp; MADINAH &nbsp;.&nbsp; COMFORTABLE JOURNEY &nbsp;.&nbsp; SPIRITUAL EXPERIENCE
    </div>
  </div>`;
};

const hotelColumnHtml = ({ label, hotel, iconHtml, showDivider }) => `
  <div style="flex:1;padding:0 12px;min-width:0;${showDivider ? `border-right:1px solid ${HAIRLINE};` : ""}">
    <div style="text-align:center;font-size:12px;line-height:15px;height:15px;font-weight:800;color:${ORANGE};letter-spacing:0.5px;">${label}</div>
    <div style="display:flex;align-items:flex-start;margin-top:5px;">
      <div style="width:30px;height:30px;flex-shrink:0;margin-right:7px;">${iconHtml}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10.5px;line-height:13px;min-height:39px;overflow-wrap:anywhere;font-weight:700;color:#1f2937;text-transform:uppercase;">${hotel?.name || "TBA"}</div>
        <div style="font-size:10px;line-height:13px;min-height:13px;overflow-wrap:anywhere;font-weight:700;color:${TEXT_GRAY};margin-top:3px;">${[
          hotel?.nightCount ? `${hotel.nightCount} NIGHTS` : "",
          hotel?.distance,
        ]
          .filter(Boolean)
          .join(" &bull; ")}</div>
      </div>
    </div>
  </div>`;

const flightColumnHtml = (pkg) => {
  const flights = pkg.flights || [];
  const lines = flights
    .slice(0, 2)
    .map((fl) => {
      const line = `${fl.flightNo || "-"} ${formatDate(fl.depDate)} ${fl.sectorFrom || ""} ${fl.sectorTo || ""} ${trimTime(fl.depTime)} ${trimTime(fl.arrTime)}`;
      return `<div style="font-size:9px;line-height:12px;min-height:24px;overflow-wrap:anywhere;font-weight:600;color:#33415c;">${line}</div>`;
    })
    .join("");

  return `
  <div style="flex:1.45;padding:0 10px;min-width:0;">
    <div style="text-align:center;font-size:12px;line-height:15px;height:15px;font-weight:800;color:${ORANGE};letter-spacing:0.5px;">FLIGHT</div>
    <div style="display:flex;align-items:center;margin-top:5px;">
      <div style="width:20px;height:20px;flex-shrink:0;margin-right:6px;color:${NAVY};">${ICON_FLIGHT}</div>
      <div style="flex:1;min-width:0;">${lines}</div>
    </div>
  </div>`;
};

const buildCardHtml = (pkg, index) => {
  const makkahHotel = (pkg.hotels || []).find((h) =>
    ["makkah", "mecca"].includes((h.city || "").toLowerCase()),
  );
  const madinahHotel = (pkg.hotels || []).find((h) =>
    ["madinah", "madina", "medina"].includes((h.city || "").toLowerCase()),
  );

  const priceCols = ROOM_TYPES.map((type, i) => {
    const price = getRoomPrice(pkg, type);
    return `
    <div style="flex:1;text-align:center;padding:7px 0 8px;${i > 0 ? "border-left:1px solid rgba(255,255,255,0.22);" : ""}">
      <div style="font-size:11px;line-height:14px;height:14px;font-weight:700;color:#d5ddf0;letter-spacing:0.6px;">${ROOM_LABELS[type]}</div>
      <div style="font-size:15px;line-height:19px;height:19px;font-weight:800;color:#ffffff;margin-top:1px;">${price > 0 ? fmt(price) : "&mdash;"}</div>
    </div>`;
  }).join("");

  return `
  <div style="display:flex;margin-bottom:9px;">
    <div style="width:104px;flex-shrink:0;margin-right:8px;border-radius:10px;background:${GRAY_BG};
      display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 0;">
      <div style="font-size:13px;line-height:16px;height:16px;font-weight:800;color:${GREEN};letter-spacing:0.5px;">PACKAGE</div>
      <div style="font-size:34px;line-height:40px;height:40px;font-weight:800;color:${GREEN};">${String(index + 1).padStart(2, "0")}</div>
    </div>

    <div style="flex:1;border-radius:10px;overflow:hidden;background:#ffffff;min-width:0;">
      <div style="display:flex;background:${NAVY};">${priceCols}</div>
      <div style="display:flex;padding:9px 0 10px;">
        ${hotelColumnHtml({
          label: "MAKKAH",
          hotel: makkahHotel,
          iconHtml: `<img src="${kaabaIconSrc}" style="width:100%;height:100%;object-fit:contain;" />`,
          showDivider: true,
        })}
        ${hotelColumnHtml({
          label: "MADINAH",
          hotel: madinahHotel,
          iconHtml: ICON_MADINAH,
          showDivider: true,
        })}
        ${flightColumnHtml(pkg)}
      </div>
    </div>
  </div>`;
};

// Sits directly after the last card — never pinned to the page bottom, so a
// short group doesn't leave a dead gap above the footer.
const buildFooterHtml = () => `
  <div style="margin-top:14px;background:${NAVY_DARK};border-radius:10px;padding:10px 16px;min-height:48px;box-sizing:border-box;display:flex;align-items:center;">
    <div style="background:${ORANGE};border-radius:8px;padding:8px 16px;flex-shrink:0;margin-right:16px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="font-size:11px;line-height:13px;font-weight:800;color:#fff;letter-spacing:0.5px;white-space:nowrap;">LIMITED SEATS</div>
      <div style="font-size:11px;line-height:13px;font-weight:800;color:#fff;white-space:nowrap;margin-top:2px;">BOOK NOW!</div>
    </div>
    <div style="flex:1;text-align:center;min-width:0;">
      <div style="font-size:13px;line-height:16px;height:16px;font-weight:800;color:#fff;letter-spacing:0.5px;">${CONTACT_PHONE_1} &nbsp;|&nbsp; ${CONTACT_PHONE_2}</div>
      <div style="font-size:10px;line-height:14px;color:#c9d0dd;margin-top:3px;">${CONTACT_ADDRESS}</div>
    </div>
  </div>
  <div style="margin-top:7px;text-align:center;font-size:11px;line-height:14px;height:14px;font-style:italic;color:${GOLD};">${TAGLINE}</div>`;

const buildPageHtml = ({
  group,
  pageNum,
  totalPages,
  pageRows,
  startIndex,
  airlineLogoUrl,
  diamondUrls,
}) => `
  <div style="width:${PAGE_W_PX}px;background:#ffffff;font-family:${FONT_STACK};
    padding:${PAGE_PAD}px;box-sizing:border-box;">
    ${buildHeaderHtml({ group, pageNum, totalPages, airlineLogoUrl, diamondUrls })}
    <div style="margin-top:12px;">
      ${pageRows.map((pkg, i) => buildCardHtml(pkg, startIndex + i)).join("")}
    </div>
    ${buildFooterHtml()}
  </div>`;

export const generateUmrahPackagesPDF = async (packages, options = {}) => {
  if (!packages || packages.length === 0) {
    throw new Error("No packages selected");
  }
  const groupBy = options.groupBy === "airline" ? "airline" : "sector";

  const groups = groupPackages(packages, groupBy);

  // Pre-check which airline logos actually load, so the header never shows a broken image box
  const airlineLogoUrls = [
    ...new Set(
      groups.flatMap((g) => [g.airlineLogo, g.airlineLogoFallback]).filter(Boolean),
    ),
  ];
  const loadable = await Promise.all(
    airlineLogoUrls.map((url) => loadImage(url).then((img) => !!img)),
  );
  const airlineLogoOk = new Map(
    airlineLogoUrls.map((url, i) => [url, loadable[i]]),
  );

  // Baked once — every page reuses the same two diamond tiles.
  const [makkahImg, madinaImg] = await Promise.all([
    loadImage(makkahSrc),
    loadImage(madinaSrc),
  ]);
  const diamondUrls = [
    makkahImg ? createDiamondDataUrl(makkahImg, 62, 3) : "",
    madinaImg ? createDiamondDataUrl(madinaImg, 62, 3) : "",
  ];

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidthMm = doc.internal.pageSize.getWidth();

  let firstPage = true;

  for (const group of groups) {
    const totalPages = Math.max(
      1,
      Math.ceil(group.packages.length / ROWS_PER_PAGE),
    );
    // Prefer the package's own logo; if it can't be loaded into the canvas
    // (custom uploads are often on a host with no CORS headers), fall back
    // to the CORS-enabled CDN copy for the same airline code before giving
    // up and drawing the plain code circle.
    const airlineLogoUrl =
      group.airlineLogo && airlineLogoOk.get(group.airlineLogo)
        ? group.airlineLogo
        : group.airlineLogoFallback && airlineLogoOk.get(group.airlineLogoFallback)
          ? group.airlineLogoFallback
          : null;

    for (let p = 0; p < totalPages; p++) {
      const pageRows = group.packages.slice(
        p * ROWS_PER_PAGE,
        (p + 1) * ROWS_PER_PAGE,
      );
      const html = buildPageHtml({
        group,
        pageNum: p + 1,
        totalPages,
        pageRows,
        startIndex: p * ROWS_PER_PAGE,
        airlineLogoUrl,
        diamondUrls,
      });

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.style.width = `${PAGE_W_PX}px`;
      container.style.overflow = "visible";
      container.innerHTML = html;
      document.body.appendChild(container);

      let canvas;
      try {
        await waitForImages(container);
        canvas = await html2canvas(container.firstElementChild, {
          scale: 2,
          width: PAGE_W_PX,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
      } finally {
        document.body.removeChild(container);
      }

      // Page height follows the rendered content so there is never a block of
      // empty paper between the last card and the footer.
      const pageHeightMm = (canvas.height / canvas.width) * pageWidthMm;
      if (firstPage) {
        doc.deletePage(1);
      }
      firstPage = false;
      doc.addPage(
        [pageWidthMm, pageHeightMm],
        pageHeightMm > pageWidthMm ? "p" : "l",
      );
      doc.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        pageWidthMm,
        pageHeightMm,
      );
    }
  }

  doc.save("White_Star_Umrah_Offers.pdf");
  return true;
};
