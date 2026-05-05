import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const ScoutFleurDeLis: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  const imageSize = Math.round(size * 1.1);
  const frameSize = imageSize + 16;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white border-2 border-black ${className}`}
      aria-hidden="true"
      role="presentation"
      style={{ width: frameSize, height: frameSize }}
    >
      <img
        src="/scout-fleur-de-lis.png"
        width={imageSize}
        height={imageSize}
        alt=""
        role="presentation"
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </span>
  );
};

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
