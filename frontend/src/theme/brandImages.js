import allGroups from "../assets/images/allgroupsbgg.jpg";
import bahrain from "../assets/images/bahrain.webp";
import bahrainBg from "../assets/images/bahrainbg.webp";
import dohaBg from "../assets/images/dohabg.webp";
import flight from "../assets/images/bgaeroplane.webp";
import hero from "../assets/images/hero.jpg";
import heroOne from "../assets/images/hero1.webp";
import heroTwo from "../assets/images/hero2.webp";
import heroThree from "../assets/images/hero3.webp";
import jeddah from "../assets/images/jeddah.webp";
import madina from "../assets/images/madina.webp";
import makkah from "../assets/images/makkah.webp";
import makkahPackage from "../assets/images/ummrahbg.png";
import muscatBg from "../assets/images/muscatbg.jpg";
import qatar from "../assets/images/qatar.jpg";
import uaeBg from "../assets/images/uaebg.jpg";
import ukBg from "../assets/images/ukbg.avif";

export const brandImages = {
  hero,
  heroOne,
  heroTwo,
  heroThree,
  allGroups,
  bahrain,
  bahrainBg,
  dohaBg,
  flight,
  jeddah,
  madina,
  makkah,
  makkahPackage,
  muscatBg,
  qatar,
  uaeBg,
  ukBg,
};

export const featuredTravelImages = [
  {
    title: "Makkah",
    location: "Saudi Arabia",
    image: makkah,
    category: "umrah",
    tag: "Holy Journey",
  },
  {
    title: "Madinah",
    location: "Saudi Arabia",
    image: madina,
    category: "umrah",
    tag: "Ziyarah",
  },
  {
    title: "Jeddah",
    location: "Saudi Arabia",
    image: jeddah,
    category: "ksa",
    tag: "KSA Routes",
  },
  {
    title: "Dubai",
    location: "United Arab Emirates",
    image: uaeBg,
    category: "gulf",
    tag: "UAE Groups",
  },
  {
    title: "Doha",
    location: "Qatar",
    image: dohaBg,
    category: "gulf",
    tag: "Qatar Flights",
  },
  {
    title: "Bahrain",
    location: "Bahrain",
    image: bahrainBg,
    category: "gulf",
    tag: "Gulf Travel",
  },
  {
    title: "Muscat",
    location: "Oman",
    image: muscatBg,
    category: "gulf",
    tag: "Oman Routes",
  },
  {
    title: "United Kingdom",
    location: "UK",
    image: ukBg,
    category: "world",
    tag: "Long Haul",
  },
];

export const fallbackOffers = [
  {
    _id: "white-star-umrah",
    title: "Premium Umrah group seats and packages",
    image: makkahPackage,
  },
  {
    _id: "white-star-gulf",
    title: "Gulf routes for UAE, Qatar, Bahrain and Oman",
    image: uaeBg,
  },
  {
    _id: "white-star-ksa",
    title: "KSA departures with managed group support",
    image: jeddah,
  },
];
