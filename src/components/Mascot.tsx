'use client';

interface MascotProps {
  emotion?: 'happy' | 'excited' | 'sad' | 'thinking' | 'celebrating';
  size?: 'sm' | 'md' | 'lg';
}

export default function Mascot({ emotion = 'happy', size = 'md' }: MascotProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const getFace = () => {
    switch (emotion) {
      case 'happy':
        return (
          <>
            <ellipse cx="35" cy="45" rx="5" ry="7" fill="#2d2d2d" />
            <ellipse cx="65" cy="45" rx="5" ry="7" fill="#2d2d2d" />
            <path d="M 40 60 Q 50 68 60 60" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case 'excited':
        return (
          <>
            <ellipse cx="35" cy="42" rx="6" ry="8" fill="#2d2d2d" />
            <ellipse cx="65" cy="42" rx="6" ry="8" fill="#2d2d2d" />
            <path d="M 38 58 Q 50 72 62 58" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 28 38 L 20 32" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
            <path d="M 72 38 L 80 32" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'sad':
        return (
          <>
            <ellipse cx="35" cy="48" rx="5" ry="6" fill="#2d2d2d" />
            <ellipse cx="65" cy="48" rx="5" ry="6" fill="#2d2d2d" />
            <path d="M 42 62 Q 50 55 58 62" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case 'thinking':
        return (
          <>
            <ellipse cx="35" cy="45" rx="5" ry="7" fill="#2d2d2d" />
            <ellipse cx="65" cy="45" rx="5" ry="7" fill="#2d2d2d" />
            <circle cx="75" cy="30" r="4" fill="#9e9e9e" opacity="0.5" />
            <circle cx="82" cy="22" r="3" fill="#9e9e9e" opacity="0.3" />
          </>
        );
      case 'celebrating':
        return (
          <>
            <ellipse cx="35" cy="42" rx="5" ry="7" fill="#2d2d2d" />
            <ellipse cx="65" cy="42" rx="5" ry="7" fill="#2d2d2d" />
            <path d="M 38 60 Q 50 70 62 60" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 15 30 L 25 35" stroke="#ffc800" strokeWidth="3" strokeLinecap="round" />
            <path d="M 85 30 L 75 35" stroke="#ffc800" strokeWidth="3" strokeLinecap="round" />
            <circle cx="15" cy="25" r="4" fill="#ffc800" />
            <circle cx="85" cy="25" r="4" fill="#ffc800" />
          </>
        );
    }
  };

  return (
    <div className={`${sizeClasses[size]} animate-float`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Body */}
        <ellipse cx="50" cy="55" rx="45" ry="40" fill="#58cc02" />
        
        {/* Wings */}
        <ellipse cx="15" cy="55" rx="12" ry="20" fill="#3c9c01" transform="rotate(-20 15 55)" />
        <ellipse cx="85" cy="55" rx="12" ry="20" fill="#3c9c01" transform="rotate(20 85 55)" />
        
        {/* Face */}
        {getFace()}
        
        {/* Blush */}
        <ellipse cx="25" cy="52" rx="6" ry="3" fill="#ff7eb9" opacity="0.5" />
        <ellipse cx="75" cy="52" rx="6" ry="3" fill="#ff7eb9" opacity="0.5" />
      </svg>
    </div>
  );
}
