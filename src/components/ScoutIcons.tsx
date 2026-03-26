import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const ScoutFleurDeLis: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2.5C9.85 4.5 8.82 7.05 8.92 9.56C6.75 8.69 4.71 8.94 3.5 10.12C5.36 10.72 6.93 12.16 8.02 14.23C8.56 15.26 8.94 16.39 9.17 17.55H7.46L6.08 20.5H10.19L12 17.89L13.81 20.5H17.92L16.54 17.55H14.83C15.06 16.39 15.44 15.26 15.98 14.23C17.07 12.16 18.64 10.72 20.5 10.12C19.29 8.94 17.25 8.69 15.08 9.56C15.18 7.05 14.15 4.5 12 2.5Z"
      fill="currentColor"
    />
    <path
      d="M12 7.45C11.04 8.47 10.52 9.69 10.45 10.94C10.38 12.25 10.77 13.69 12 15.27C13.23 13.69 13.62 12.25 13.55 10.94C13.48 9.69 12.96 8.47 12 7.45Z"
      fill="white"
      fillOpacity="0.22"
    />
    <path d="M10.87 17.55H13.13" stroke="white" strokeOpacity="0.34" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const EagleIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 3L18 5.3V10.4C18 14.52 15.46 18.15 12 19.9C8.54 18.15 6 14.52 6 10.4V5.3L12 3Z" fill="currentColor" opacity="0.18" />
    <path
      d="M12 4.5L16.5 6.23V10.18C16.5 13.38 14.65 16.26 12 17.69C9.35 16.26 7.5 13.38 7.5 10.18V6.23L12 4.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M8.95 11.4C10.15 10.94 11.03 9.96 11.35 8.67C11.42 10.18 10.96 11.67 10.05 12.88M15.05 11.4C13.85 10.94 12.97 9.96 12.65 8.67C12.58 10.18 13.04 11.67 13.95 12.88"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.9 13.7L12 12.85L13.1 13.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CampfireIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 18L5 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M19 18L16 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M5 21H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M12 4C13.87 6.18 14.83 8.03 14.83 9.94C14.83 12.2 13.54 14.1 12 15.15C10.46 14.1 9.17 12.2 9.17 9.94C9.17 8.03 10.13 6.18 12 4Z"
      fill="currentColor"
      opacity="0.88"
    />
    <path
      d="M12 7.1C12.88 8.23 13.25 9.16 13.25 10.06C13.25 11.15 12.68 12.06 12 12.64C11.32 12.06 10.75 11.15 10.75 10.06C10.75 9.16 11.12 8.23 12 7.1Z"
      fill="white"
      fillOpacity="0.26"
    />
  </svg>
);

export const CompassIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    <path d="M12 4.35V6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M19.65 12H17.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 19.65V17.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.35 12H6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9.2 14.8L11.1 9.1L14.8 12.9L9.2 14.8Z" fill="currentColor" />
  </svg>
);

export const TentIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4.5 18.5L12 5L19.5 18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5V18.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <path d="M7.35 18.5L12 12.4L16.65 18.5" fill="currentColor" opacity="0.18" />
    <path d="M4 18.5H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const KnotIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7 8.5C7 6.84 8.34 5.5 10 5.5H14C15.66 5.5 17 6.84 17 8.5C17 10.16 15.66 11.5 14 11.5H10C8.34 11.5 7 12.84 7 14.5C7 16.16 8.34 17.5 10 17.5H14C15.66 17.5 17 16.16 17 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M10.5 12H13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const HikingBootIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7.5 6.5H13.5L15.1 11.3L18.8 13.2C19.67 13.64 20.2 14.53 20.2 15.5V17.5H4.5V14.7C4.5 14.06 4.88 13.48 5.46 13.23L8 12.15L7.5 6.5Z" fill="currentColor" opacity="0.18" />
    <path d="M7.5 6.5H13.5L15.1 11.3L18.8 13.2C19.67 13.64 20.2 14.53 20.2 15.5V17.5H4.5V14.7C4.5 14.06 4.88 13.48 5.46 13.23L8 12.15L7.5 6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9.15 8.7H11.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8.95 10.85H11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const MeritBadgeIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="5.2" fill="currentColor" opacity="0.14" />
    <path
      d="M12 7.4L13.33 10.1L16.3 10.53L14.15 12.63L14.66 15.6L12 14.2L9.34 15.6L9.85 12.63L7.7 10.53L10.67 10.1L12 7.4Z"
      fill="currentColor"
    />
  </svg>
);

export const BackpackIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 6V4.8C9 3.81 9.81 3 10.8 3H13.2C14.19 3 15 3.81 15 4.8V6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="6" y="6" width="12" height="14.5" rx="3" fill="currentColor" opacity="0.16" />
    <rect x="6" y="6" width="12" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="10" width="6" height="3.6" rx="1" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const MapIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 6L9 4L15 6.2L20 4V18L15 20L9 17.8L4 20V6Z" fill="currentColor" opacity="0.14" />
    <path d="M4 6L9 4L15 6.2L20 4V18L15 20L9 17.8L4 20V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 4V17.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M15 6.2V20" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
