export const COMMUNITY_THEME_COLOR_KEYS = [
  "amber",
  "purple",
  "blue",
  "green",
  "red",
  "pink",
  "teal",
  "indigo",
  "orange",
  "cyan",
] as const;

export type CommunityThemeColorKey = (typeof COMMUNITY_THEME_COLOR_KEYS)[number];

export type CommunityColorSpec = {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  avatarBg: string;
  ring: string;
};

// All class strings are hardcoded (no dynamic interpolation) so Tailwind scanner picks them all up
export const COMMUNITY_COLORS: Record<CommunityThemeColorKey, CommunityColorSpec> = {
  amber: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/40",
    badgeBg: "bg-amber-500/20",
    avatarBg: "bg-amber-500/25",
    ring: "ring-amber-500/30",
  },
  purple: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/40",
    badgeBg: "bg-purple-500/20",
    avatarBg: "bg-purple-500/25",
    ring: "ring-purple-500/30",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/40",
    badgeBg: "bg-blue-500/20",
    avatarBg: "bg-blue-500/25",
    ring: "ring-blue-500/30",
  },
  green: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/40",
    badgeBg: "bg-green-500/20",
    avatarBg: "bg-green-500/25",
    ring: "ring-green-500/30",
  },
  red: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/40",
    badgeBg: "bg-red-500/20",
    avatarBg: "bg-red-500/25",
    ring: "ring-red-500/30",
  },
  pink: {
    bg: "bg-pink-500/15",
    text: "text-pink-400",
    border: "border-pink-500/40",
    badgeBg: "bg-pink-500/20",
    avatarBg: "bg-pink-500/25",
    ring: "ring-pink-500/30",
  },
  teal: {
    bg: "bg-teal-500/15",
    text: "text-teal-400",
    border: "border-teal-500/40",
    badgeBg: "bg-teal-500/20",
    avatarBg: "bg-teal-500/25",
    ring: "ring-teal-500/30",
  },
  indigo: {
    bg: "bg-indigo-500/15",
    text: "text-indigo-400",
    border: "border-indigo-500/40",
    badgeBg: "bg-indigo-500/20",
    avatarBg: "bg-indigo-500/25",
    ring: "ring-indigo-500/30",
  },
  orange: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/40",
    badgeBg: "bg-orange-500/20",
    avatarBg: "bg-orange-500/25",
    ring: "ring-orange-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/20",
    avatarBg: "bg-cyan-500/25",
    ring: "ring-cyan-500/30",
  },
};

const FALLBACK_COLORS: CommunityColorSpec = {
  bg: "bg-primary/15",
  text: "text-primary",
  border: "border-primary/40",
  badgeBg: "bg-primary/20",
  avatarBg: "bg-primary/25",
  ring: "ring-primary/30",
};

export function getCommunityColors(key: string | null | undefined): CommunityColorSpec {
  if (key && key in COMMUNITY_COLORS) {
    return COMMUNITY_COLORS[key as CommunityThemeColorKey];
  }
  return FALLBACK_COLORS;
}

export const COMMUNITY_TAGS = [
  "LoFi",
  "Rock",
  "Metal",
  "Electronic",
  "Jazz",
  "Hip Hop",
  "Indie",
  "Classical",
  "R&B",
  "Reggae",
  "Ambient",
  "House",
  "Pop",
  "Acoustic",
  "Beginner",
  "Collab",
  "Practice",
  "Late Night",
] as const;

export type CommunityTag = (typeof COMMUNITY_TAGS)[number];
