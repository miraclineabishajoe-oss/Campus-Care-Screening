import React from 'react';

// ==========================================
// PIXEL ART ICONS (Crisp Vector Pixel Edges)
// ==========================================

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const PixelHeart: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    {/* 16x16 Pixel Heart */}
    <rect x="2" y="3" width="4" height="2" />
    <rect x="10" y="3" width="4" height="2" />
    <rect x="1" y="5" width="6" height="3" />
    <rect x="9" y="5" width="6" height="3" />
    <rect x="2" y="8" width="12" height="2" />
    <rect x="3" y="10" width="10" height="2" />
    <rect x="5" y="12" width="6" height="2" />
    <rect x="7" y="14" width="2" height="1" />
  </svg>
);

export const PixelSparkle: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    {/* 4-point Pixel Star */}
    <rect x="7" y="1" width="2" height="4" />
    <rect x="7" y="11" width="2" height="4" />
    <rect x="1" y="7" width="4" height="2" />
    <rect x="11" y="7" width="4" height="2" />
    <rect x="6" y="5" width="4" height="6" />
    <rect x="5" y="6" width="6" height="4" />
  </svg>
);

export const PixelShield: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="2" width="12" height="2" />
    <rect x="1" y="4" width="14" height="4" />
    <rect x="2" y="8" width="12" height="3" />
    <rect x="4" y="11" width="8" height="2" />
    <rect x="6" y="13" width="4" height="2" />
    <rect x="7" y="15" width="2" height="1" />
  </svg>
);

export const PixelCalendar: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    {/* Top tabs */}
    <rect x="3" y="1" width="2" height="3" />
    <rect x="11" y="1" width="2" height="3" />
    {/* Outline */}
    <rect x="1" y="3" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="1" y="6" width="14" height="2" />
    {/* Date dots */}
    <rect x="4" y="9" width="2" height="2" />
    <rect x="7" y="9" width="2" height="2" />
    <rect x="10" y="9" width="2" height="2" />
    <rect x="4" y="12" width="2" height="2" />
    <rect x="7" y="12" width="2" height="2" />
  </svg>
);

export const PixelCheck: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="8" width="2" height="2" />
    <rect x="4" y="10" width="2" height="2" />
    <rect x="6" y="12" width="3" height="2" />
    <rect x="9" y="9" width="2" height="3" />
    <rect x="11" y="6" width="2" height="3" />
    <rect x="13" y="3" width="2" height="3" />
  </svg>
);

export const PixelClock: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <rect x="5" y="1" width="6" height="1" />
    <rect x="3" y="2" width="10" height="2" />
    <rect x="1" y="4" width="14" height="8" />
    <rect x="3" y="12" width="10" height="2" />
    <rect x="5" y="14" width="6" height="1" />
    {/* Center & Hands */}
    <rect x="7" y="4" width="2" height="5" fill="#FAF8F5" />
    <rect x="8" y="7" width="4" height="2" fill="#FAF8F5" />
  </svg>
);

export const PixelUser: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    {/* Head */}
    <rect x="5" y="2" width="6" height="5" />
    {/* Shoulders / Body */}
    <rect x="3" y="8" width="10" height="2" />
    <rect x="2" y="10" width="12" height="5" />
  </svg>
);

export const PixelPlant: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    {/* Pot */}
    <rect x="3" y="9" width="10" height="1" fill="#7E65B7" />
    <rect x="4" y="10" width="8" height="5" fill="#543E82" />
    {/* Leaves */}
    <rect x="7" y="5" width="2" height="4" fill="#389E6E" />
    <rect x="4" y="4" width="3" height="3" fill="#5ABF8F" />
    <rect x="9" y="3" width="3" height="3" fill="#5ABF8F" />
    <rect x="7" y="2" width="2" height="2" fill="#8ED6B2" />
  </svg>
);

export const PixelArrowRight: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="7" width="8" height="2" />
    <rect x="8" y="5" width="2" height="2" />
    <rect x="10" y="6" width="2" height="2" />
    <rect x="12" y="7" width="2" height="2" />
    <rect x="10" y="8" width="2" height="2" />
    <rect x="8" y="9" width="2" height="2" />
  </svg>
);

// ==========================================
// STANDARDIZED PIXEL BUTTON
// ==========================================

export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 
    | 'primary'      // Mint accent with dark border
    | 'secondary'    // Soft Lavender accent with dark border
    | 'mintDark'     // Deep emerald mint with white text
    | 'lavenderDark' // Deep royal lavender with white text
    | 'cream'        // Neutral cream card style
    | 'outline'      // Crisp white with 2px dark border
    | 'ghost'        // Flat subtle background on hover
    | 'danger';      // Soft pinkish red with dark border
  size?: 'sm' | 'md' | 'lg';
  pixelFont?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pixelFont = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  // Height, padding, and font size standardization
  const sizeStyles = {
    sm: 'h-[34px] px-3 text-xs gap-1.5',
    md: 'h-[40px] px-4 text-xs sm:text-sm gap-2',
    lg: 'h-[48px] px-6 text-sm sm:text-base gap-2.5 font-bold',
  }[size];

  // Cohesive Color Palette
  const variantStyles = {
    // Mint Green (Primary Calm Call-to-Action)
    primary:
      'bg-[#BFECD3] text-[#0F3523] border-[#2B2438] hover:bg-[#A3DEBF] active:bg-[#8ED6B2]',
    // Soft Lavender (Co-primary / Friendly support)
    secondary:
      'bg-[#DDD4F0] text-[#2C1F48] border-[#2B2438] hover:bg-[#C8BAE8] active:bg-[#B6A4DC]',
    // Deep Mint (High-emphasis action)
    mintDark:
      'bg-[#297D56] text-white border-[#2B2438] hover:bg-[#1D5E40] active:bg-[#164630]',
    // Deep Lavender (Portal navigation / verified action)
    lavenderDark:
      'bg-[#7E65B7] text-white border-[#2B2438] hover:bg-[#684FA0] active:bg-[#543E82]',
    // Cream Surface
    cream:
      'bg-[#FAF8F5] text-[#231E2C] border-[#2B2438] hover:bg-[#F4EFEA] active:bg-[#E8E0D5]',
    // Crisp White Outline with Pixel Border
    outline:
      'bg-white text-[#231E2C] border-[#2B2438] hover:bg-[#F7F5FC] active:bg-[#EFEAF8]',
    // Subtle Ghost (Transparent border)
    ghost:
      'bg-transparent text-[#534B62] border-transparent shadow-none hover:bg-[#EFEAF8] hover:text-[#231E2C] active:bg-[#DDD4F0]',
    // Danger / Cancel
    danger:
      'bg-[#FDE8E8] text-[#9B1C1C] border-[#2B2438] hover:bg-[#FBD5D5] active:bg-[#F8B4B4]',
  }[variant];

  // Pixel art shadow and interactive stepped translation
  const isGhost = variant === 'ghost';
  const shadowStyles = isGhost
    ? ''
    : 'shadow-[2px_2px_0px_#2B2438] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#2B2438] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';

  const disabledStyles = disabled
    ? 'opacity-50 cursor-not-allowed translate-x-0 translate-y-0 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 pointer-events-none'
    : '';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-semibold border-2 rounded-none
        transition-all duration-75 select-none text-center whitespace-nowrap
        ${pixelFont ? 'font-pixel' : 'font-sans'}
        ${sizeStyles}
        ${variantStyles}
        ${shadowStyles}
        ${disabledStyles}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
    </button>
  );
};

// ==========================================
// STANDARDIZED PIXEL CARD
// ==========================================

export interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'cream' | 'white' | 'lavender' | 'mint' | 'muted';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'lavender' | 'mint';
  border?: 'dark' | 'soft' | 'none';
  accentBorderTop?: 'mint' | 'lavender' | 'none';
}

export const PixelCard: React.FC<PixelCardProps> = ({
  variant = 'white',
  shadow = 'md',
  border = 'dark',
  accentBorderTop = 'none',
  className = '',
  children,
  ...props
}) => {
  const bgStyles = {
    cream: 'bg-[#FAF8F5]',
    white: 'bg-white',
    lavender: 'bg-[#F7F5FC]',
    mint: 'bg-[#F2FAF6]',
    muted: 'bg-[#F4EFEA]',
  }[variant];

  const borderStyles = {
    dark: 'border-2 border-[#2B2438]',
    soft: 'border-2 border-[#D6CCE8]',
    none: 'border-0',
  }[border];

  const shadowStyles = {
    none: '',
    sm: 'shadow-[2px_2px_0px_#2B2438]',
    md: 'shadow-[3px_3px_0px_#2B2438]',
    lg: 'shadow-[4px_4px_0px_#2B2438]',
    lavender: 'shadow-[3px_3px_0px_#C2B3E4]',
    mint: 'shadow-[3px_3px_0px_#8ED6B2]',
  }[shadow];

  const accentStyles = {
    mint: 'border-t-4 border-t-[#5ABF8F]',
    lavender: 'border-t-4 border-t-[#7E65B7]',
    none: '',
  }[accentBorderTop];

  return (
    <div
      className={`
        rounded-none relative
        ${bgStyles}
        ${borderStyles}
        ${shadowStyles}
        ${accentStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// ==========================================
// PIXEL BADGE
// ==========================================

export interface PixelBadgeProps {
  variant?: 'lavender' | 'mint' | 'cream' | 'amber' | 'red' | 'dark';
  size?: 'sm' | 'md';
  pixelFont?: boolean;
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  variant = 'lavender',
  size = 'md',
  pixelFont = false,
  className = '',
  icon,
  children,
}) => {
  const colorStyles = {
    lavender: 'bg-[#EFEAF8] text-[#543E82] border-[#C2B3E4]',
    mint: 'bg-[#E0F4EA] text-[#1D5E40] border-[#8ED6B2]',
    cream: 'bg-[#FAF8F5] text-[#231E2C] border-[#2B2438]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border-[#D97706]',
    red: 'bg-[#FEE2E2] text-[#991B1B] border-[#F87171]',
    dark: 'bg-[#2B2438] text-white border-[#2B2438]',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  return (
    <span
      className={`
        inline-flex items-center font-semibold border rounded-none whitespace-nowrap
        ${pixelFont ? 'font-pixel tracking-wider' : 'font-sans'}
        ${colorStyles}
        ${sizeStyles}
        ${className}
      `}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

// ==========================================
// PIXEL FORM CONTROLS
// ==========================================

export const PixelInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input
    className={`
      w-full text-xs sm:text-sm px-3 py-2 bg-white text-[#231E2C]
      border-2 border-[#2B2438] rounded-none shadow-[2px_2px_0px_#DDD4F0]
      focus:outline-none focus:border-[#7E65B7] focus:shadow-[2px_2px_0px_#7E65B7]
      placeholder:text-[#8E84A3] transition-colors
      ${className}
    `}
    {...props}
  />
);

export const PixelTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...props
}) => (
  <textarea
    className={`
      w-full text-xs sm:text-sm p-3 bg-white text-[#231E2C]
      border-2 border-[#2B2438] rounded-none shadow-[2px_2px_0px_#DDD4F0]
      focus:outline-none focus:border-[#7E65B7] focus:shadow-[2px_2px_0px_#7E65B7]
      placeholder:text-[#8E84A3] transition-colors
      ${className}
    `}
    {...props}
  />
);
