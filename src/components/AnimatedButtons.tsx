import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// -------------------------------------------------------------
// EFFECT 1: SPARKLE / GLARE BUTTON
// -------------------------------------------------------------
interface SparkleButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  to?: string;
}

export const SparkleButton: React.FC<SparkleButtonProps> = ({
  children,
  onClick,
  className = '',
  type = 'button',
  disabled = false,
  to,
}) => {
  const content = (
    <>
      <span className="sparkle-text-base">{children}</span>
      <span className="sparkle-text-glare" aria-hidden="true">{children}</span>
      {/* 5 Sparkle SVG icons as per CSS spec */}
      {[...Array(5)].map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
        </svg>
      ))}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`btn-sparkle ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-sparkle ${className}`}
    >
      {content}
    </button>
  );
};

// -------------------------------------------------------------
// EFFECT 2: FINGERPRINT LOGIN BUTTON
// -------------------------------------------------------------
interface FingerprintButtonProps {
  label: string;
  onSuccess: () => void;
  className?: string;
  isSubmitting?: boolean;
}

export const FingerprintButton: React.FC<FingerprintButtonProps> = ({
  label,
  onSuccess,
  className = '',
  isSubmitting = false,
}) => {
  const [isActive, setIsActive] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive || isSubmitting) return;

    setIsActive(true);
    // Simulate fingerprint scanning delay, matching CSS animation length (4s / 4000ms total)
    // On 75% scale/rotation (approx 3000ms), we hit successful validation
    setTimeout(() => {
      onSuccess();
      setIsActive(false);
    }, 3200);
  };

  return (
    <div className={`btn-fingerprint-body ${className}`}>
      <div 
        onClick={handleClick}
        className={`btn-fingerprint-container ${isActive ? 'active' : ''}`}
      >
        <span className="fingertext">{isSubmitting ? 'Authenticating...' : label}</span>
        
        {/* SVG Fingerprint with paths matching the base and active scan states */}
        <svg className="fingerprint fingerprint-base" viewBox="0 0 44 44" fill="none" strokeWidth="2.5">
          <path className="odd" d="M22 6C16.5 6 12 10.5 12 16V28" strokeLinecap="round" />
          <path className="even" d="M16 11C13.5 13.5 12 17 12 21" strokeLinecap="round" />
          <path className="odd" d="M4 22C4 12 12 4 22 4s18 8 18 18" strokeLinecap="round" />
          <path className="even" d="M8 22c0-7.7 6.3-14 14-14s14 6.3 14 14" strokeLinecap="round" />
          <path className="odd" d="M22 10c-6.6 0-12 5.4-12 12v11" strokeLinecap="round" />
          <path className="even" d="M18 14c-4.4 0-8 3.6-8 8v16" strokeLinecap="round" />
        </svg>

        <svg className="fingerprint fingerprint-active" viewBox="0 0 44 44" fill="none" strokeWidth="2.5">
          <path className="odd" d="M22 6C16.5 6 12 10.5 12 16V28" strokeLinecap="round" />
          <path className="even" d="M16 11C13.5 13.5 12 17 12 21" strokeLinecap="round" />
          <path className="odd" d="M4 22C4 12 12 4 22 4s18 8 18 18" strokeLinecap="round" />
          <path className="even" d="M8 22c0-7.7 6.3-14 14-14s14 6.3 14 14" strokeLinecap="round" />
          <path className="odd" d="M22 10c-6.6 0-12 5.4-12 12v11" strokeLinecap="round" />
          <path className="even" d="M18 14c-4.4 0-8 3.6-8 8v16" strokeLinecap="round" />
        </svg>

        <div className="ok">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>SUCCESS</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// EFFECT 3: RAINBOW GLOW BUTTONS & ANCHORS
// -------------------------------------------------------------
interface RainbowButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<any>) => void;
  className?: string;
  to?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const RainbowButton: React.FC<RainbowButtonProps> = ({
  children,
  onClick,
  className = '',
  to,
  type = 'button',
  disabled = false,
}) => {
  const content = (
    <div className="btn-rainbow-content">
      <span>{children}</span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`btn-rainbow ${className}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={`btn-rainbow ${className}`} onClick={onClick}>
      {content}
    </button>
  );
};

// -------------------------------------------------------------
// EFFECT 4: GLOWING BORDER CONTAINER (FOR COURSES/PACKS LISTS)
// -------------------------------------------------------------
interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const GlowingCard: React.FC<GlowingCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
  };

  return (
    <div
      className={`glowing-card ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <div className="glowing-card-border" />
      <div className="glowing-card-glow" />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
