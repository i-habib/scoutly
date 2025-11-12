// Scout-themed icon components
import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Scout Fleur-de-lis (universal scouting symbol)
export const ScoutFleurDeLis: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M12 2L10 8L8 6L9 12H15L16 6L14 8L12 2Z" 
      fill="currentColor"
      opacity="0.9"
    />
    <path 
      d="M9 12L7 14L5 18H8L9 15L9 12Z" 
      fill="currentColor"
      opacity="0.8"
    />
    <path 
      d="M15 12L17 14L19 18H16L15 15L15 12Z" 
      fill="currentColor"
      opacity="0.8"
    />
    <path 
      d="M9 15L12 22L15 15L14 16H10L9 15Z" 
      fill="currentColor"
    />
  </svg>
);

// Eagle Scout symbol
export const EagleIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M12 2C10 2 8 3 7 5L5 8L8 10L10 8C10 8 11 7 12 7C13 7 14 8 14 8L16 10L19 8L17 5C16 3 14 2 12 2Z" 
      fill="currentColor"
    />
    <circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.6" />
    <path 
      d="M8 10L6 12L7 16L9 15L10 13L8 10Z" 
      fill="currentColor"
      opacity="0.8"
    />
    <path 
      d="M16 10L18 12L17 16L15 15L14 13L16 10Z" 
      fill="currentColor"
      opacity="0.8"
    />
    <path 
      d="M10 13L9 15L8 18L12 22L16 18L15 15L14 13L12 15L10 13Z" 
      fill="currentColor"
    />
  </svg>
);

// Campfire icon
export const CampfireIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M10 18L8 21H16L14 18" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round"
      opacity="0.6"
    />
    <path 
      d="M6 21H18" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M12 14C10 14 9 12 9 10C9 8 10 6 12 3C14 6 15 8 15 10C15 12 14 14 12 14Z" 
      fill="currentColor"
      opacity="0.9"
    />
    <path 
      d="M12 10C11 10 10.5 9 10.5 8C10.5 7 11 6 12 4C13 6 13.5 7 13.5 8C13.5 9 13 10 12 10Z" 
      fill="currentColor"
      opacity="0.5"
    />
  </svg>
);

// Compass icon (navigation/orienteering)
export const CompassIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path 
      d="M12 3L13 7L12 12L11 7L12 3Z" 
      fill="currentColor"
      opacity="0.9"
    />
    <path 
      d="M12 12L16 10L12 9L12 12Z" 
      fill="currentColor"
      opacity="0.7"
    />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <text x="12" y="5" fontSize="4" fill="currentColor" textAnchor="middle">N</text>
  </svg>
);

// Tent icon
export const TentIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M12 4L5 20H19L12 4Z" 
      fill="currentColor"
      opacity="0.8"
    />
    <path 
      d="M12 4L12 20" 
      stroke="currentColor" 
      strokeWidth="1.5"
      opacity="0.4"
    />
    <path 
      d="M5 20H19" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

// Knot icon (rope knot)
export const KnotIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M6 12C6 12 8 8 12 8C16 8 18 12 18 12C18 12 16 16 12 16C8 16 6 12 6 12Z" 
      stroke="currentColor" 
      strokeWidth="2"
      fill="none"
    />
    <path 
      d="M12 8L12 4M12 16L12 20" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
  </svg>
);

// Hiking boot icon
export const HikingBootIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M8 8L10 5L14 5L16 8L16 12L14 15L10 15L8 12L8 8Z" 
      fill="currentColor"
      opacity="0.7"
    />
    <path 
      d="M8 12L6 17L18 17L16 12" 
      fill="currentColor"
      opacity="0.9"
    />
    <path 
      d="M6 17L5 19L19 19L18 17" 
      fill="currentColor"
    />
    <path 
      d="M10 8L11 6M13 6L14 8" 
      stroke="currentColor" 
      strokeWidth="1"
      opacity="0.4"
    />
  </svg>
);

// Merit Badge Circle (generic badge shape)
export const MeritBadgeIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path 
      d="M12 6L13.5 10.5L18 10.5L14.5 13.5L16 18L12 15L8 18L9.5 13.5L6 10.5L10.5 10.5L12 6Z" 
      fill="currentColor"
      opacity="0.8"
    />
  </svg>
);

// Backpack icon
export const BackpackIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M8 6C8 4 9.5 2 12 2C14.5 2 16 4 16 6" 
      stroke="currentColor" 
      strokeWidth="1.5"
      opacity="0.6"
    />
    <rect x="7" y="6" width="10" height="14" rx="2" fill="currentColor" opacity="0.8" />
    <rect x="9" y="10" width="6" height="4" rx="1" fill="currentColor" opacity="0.4" />
    <path 
      d="M7 8L5 10L5 18L7 20M17 8L19 10L19 18L17 20" 
      stroke="currentColor" 
      strokeWidth="1.5"
      opacity="0.6"
    />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </svg>
);

// Map icon
export const MapIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" 
      fill="currentColor"
      opacity="0.7"
    />
    <path 
      d="M9 3V18M15 6V21" 
      stroke="currentColor" 
      strokeWidth="1.5"
      opacity="0.4"
    />
    <circle cx="12" cy="10" r="2" fill="currentColor" />
  </svg>
);
