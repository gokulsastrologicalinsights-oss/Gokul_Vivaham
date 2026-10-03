/**
 * Predefined list of premium Vedic Astrologers for Gokul Vivaham.
 * Used consistently across the client booking flow and admin dashboard.
 */

export interface Astrologer {
  id: string;
  name: string;
  title?: string;
  specialties: string[];
  experience: string;
  languages: string[];
  rating: number;
  reviewsCount: number;
  fee: number;
  bio: string;
  slots: string[];
  initials: string;
  colorClass: string; // Tailored HSL backgrounds for initials avatar
}

export const ASTROLOGERS: Astrologer[] = [
  {
    id: "e50e37d5-21df-454b-8ed8-0e7ddb33827d",
    name: "Gokul Murugan",
    title: "Marriage & Relationship Astrology Specialist",
    specialties: ["Marriage Compatibility Analysis", "Horoscope Matching Check", "Relationship Guidance", "Matrimonial Astrology"],
    experience: "8+ Years Experience",
    languages: ["Tamil", "English"],
    rating: 4.9,
    reviewsCount: 312,
    fee: 999,
    bio: "Gokul Murugan specializes in detailed marriage compatibility analysis, horoscope matching, relationship guidance, and matrimonial astrology consultations. With over 8 years of experience, he has helped individuals and families make informed matrimonial decisions through traditional and practical astrological insights.",
    slots: [
      "09:30 AM - 10:00 AM",
      "10:30 AM - 11:00 AM",
      "11:30 AM - 12:00 PM",
      "02:00 PM - 02:30 PM",
      "03:00 PM - 03:30 PM",
      "04:00 PM - 04:30 PM",
      "05:00 PM - 05:30 PM"
    ],
    initials: "GM",
    colorClass: "from-maroon-700 to-amber-600 text-white"
  }
];

export const HISTORICAL_ASTROLOGERS: Astrologer[] = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    name: "Guruji Gokul Shastri",
    specialties: ["Horoscope Matching", "Kundali Dosha Remedies", "Marriage Muhurtham"],
    experience: "24+ Years",
    languages: ["Tamil", "Sanskrit", "English"],
    rating: 4.9,
    reviewsCount: 1240,
    fee: 999,
    bio: "A revered Vedic scholar from Tanjore who has guided over 10,000 families in matrimonial alliance matching and dosha remedies.",
    slots: [
      "10:00 AM - 10:30 AM",
      "11:00 AM - 11:30 AM",
      "02:00 PM - 02:30 PM",
      "03:00 PM - 03:30 PM",
      "04:30 PM - 05:00 PM",
      "05:30 PM - 06:00 PM"
    ],
    initials: "GS",
    colorClass: "from-amber-600 to-yellow-500 text-white"
  },
  {
    id: "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c",
    name: "Sri Ananthakrishna Iyer",
    specialties: ["KP Astrology", "Marriage Timing (Prasnam)", "Career & Wealth Guidance"],
    experience: "18+ Years",
    languages: ["Tamil", "Malayalam", "English"],
    rating: 4.8,
    reviewsCount: 850,
    fee: 999,
    bio: "Specialized in KP system and Prasnam (Horary methods) to offer precise timing predictions for matrimonial alliances and professional growth.",
    slots: [
      "09:30 AM - 10:00 AM",
      "10:30 AM - 11:00 AM",
      "11:30 AM - 12:00 PM",
      "03:30 PM - 04:00 PM",
      "04:00 PM - 04:30 PM",
      "05:00 PM - 05:30 PM"
    ],
    initials: "AI",
    colorClass: "from-rose-700 to-maroon-500 text-white"
  },
  {
    id: "c9b8a7d6-e5f4-3c2b-1a0d-9e8f7a6b5c4d",
    name: "Devi Rajeshwari",
    specialties: ["Numerology Matching", "Palmistry Analysis", "Astro-Gemology Advisor"],
    experience: "15+ Years",
    languages: ["Tamil", "Telugu", "Hindi"],
    rating: 4.7,
    reviewsCount: 630,
    fee: 999,
    bio: "Blends traditional Vedic analysis with Numerology and Gemology to suggest customized name corrections and gemstone remedies for prospective partners.",
    slots: [
      "10:00 AM - 10:30 AM",
      "11:00 AM - 11:30 AM",
      "02:30 PM - 03:00 PM",
      "03:00 PM - 03:30 PM",
      "04:30 PM - 05:00 PM",
      "05:30 PM - 06:00 PM"
    ],
    initials: "DR",
    colorClass: "from-emerald-700 to-teal-500 text-white"
  }
];

export const getAstrologerById = (id: string): Astrologer | undefined => {
  return ASTROLOGERS.find(a => a.id === id) || HISTORICAL_ASTROLOGERS.find(a => a.id === id);
};
