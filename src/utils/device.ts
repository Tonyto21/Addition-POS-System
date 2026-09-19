// Device detection and environment helper
// Distinguishes between Web App (Desktop / Laptop) and Mobile App (Phone / Tablet / APK)

export type AppEnvironment = 'web' | 'mobile';

const STORAGE_KEY = 'addition_pos_app_environment_override';

export const DeviceHelper = {
  /**
   * Detects if the current device/viewport is mobile.
   */
  isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // Check user agent for mobile indicators
    const ua = navigator.userAgent || '';
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    // Check screen width and touch capability
    const isSmallScreen = window.innerWidth <= 768;
    const hasTouch = (navigator.maxTouchPoints || 0) > 0;

    return mobileUA || (isSmallScreen && hasTouch);
  },

  /**
   * Gets the active app environment: 'web' or 'mobile'.
   * Allows manual override for testing on desktop.
   */
  getEnvironment(): AppEnvironment {
    if (typeof window === 'undefined') return 'web';
    
    const override = localStorage.getItem(STORAGE_KEY) as AppEnvironment | null;
    if (override === 'web' || override === 'mobile') {
      return override;
    }

    return this.isMobileDevice() ? 'mobile' : 'web';
  },

  /**
   * Sets manual override (e.g. testing Mobile APK UI on desktop browser)
   */
  setEnvironmentOverride(env: AppEnvironment | null) {
    if (typeof window === 'undefined') return;
    if (env) {
      localStorage.setItem(STORAGE_KEY, env);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
};
