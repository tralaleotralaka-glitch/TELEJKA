import React from 'react';

interface TelejkaLogoProps {
  size?: number;
  className?: string;
}

export const TelejkaLogo: React.FC<TelejkaLogoProps> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    className={className}
    aria-label="TELEJKA logo"
  >
    <defs>
      <linearGradient id="telejkaLogoGrad" x1="48" y1="32" x2="464" y2="480" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#37BCEE" />
        <stop offset="55%" stopColor="#229ED9" />
        <stop offset="100%" stopColor="#1565A8" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="118" fill="url(#telejkaLogoGrad)" />
    <circle cx="404" cy="112" r="142" fill="#FFFFFF" fillOpacity="0.09" />
    <path
      d="M398 128L108 242C94 247.5 94.5 267.5 108.8 272.2L184 297L352 178C357.5 174 363.6 181.2 358.8 186L222 315L214 388C213 398.5 225.4 404.8 233.4 397.8L278 358L348 408C358.2 415.4 372.6 409.8 375.4 397.4L418 148C420.5 133.6 410.5 123 398 128Z"
      fill="#FFFFFF"
    />
    <path
      d="M184 297L352 178C357.5 174 363.6 181.2 358.8 186L222 315L214 388L184 297Z"
      fill="#C5E4FA"
    />
    <circle cx="242" cy="436" r="16" fill="#FFFFFF" fillOpacity="0.92" />
    <circle cx="332" cy="436" r="16" fill="#FFFFFF" fillOpacity="0.92" />
  </svg>
);
