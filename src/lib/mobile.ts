// Mobile-specific utilities and responsive helpers

// Breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Check if device is touch-enabled
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Check if viewport is mobile
export const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.md;
};

// Safe area insets for mobile devices with notches
export const safeAreaInsets = {
  top: 'env(safe-area-inset-top)',
  right: 'env(safe-area-inset-right)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
};

// Prevent zoom on input focus for iOS
export const preventIOSZoom = (): void => {
  if (typeof document === 'undefined') return;
  
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'
    );
  }
};

// Handle virtual keyboard appearance
export const handleVirtualKeyboard = (callback: (visible: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handleResize = () => {
    const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.75;
    callback(isKeyboardVisible);
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
};
