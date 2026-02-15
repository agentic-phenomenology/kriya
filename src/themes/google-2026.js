// Google 2026 Theme - Material Design 3 inspired
// Clean, light, spacious with tonal surfaces

export const google2026Theme = {
  name: 'Google 2026',
  colors: {
    // Backgrounds - light with subtle tonal tints
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
    bgSurface: '#ffffff',
    bgSurfaceVariant: '#e8eef4',
    bgHover: '#f1f5f9',
    bgSelected: '#e0f2fe',
    
    // Borders - subtle, almost invisible
    borderPrimary: '#e2e8f0',
    borderSecondary: '#cbd5e1',
    borderFocus: '#1a73e8',
    
    // Text
    textPrimary: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textDim: '#9ca3af',
    textOnPrimary: '#ffffff',
    
    // Primary - Google Blue
    primary: '#1a73e8',
    primaryHover: '#1557b0',
    primaryContainer: '#d3e3fd',
    onPrimaryContainer: '#041e49',
    
    // Secondary - Teal
    secondary: '#00796b',
    secondaryContainer: '#b2dfdb',
    
    // Tertiary - soft violet
    tertiary: '#7c4dff',
    tertiaryContainer: '#e8def8',
    
    // Status colors
    success: '#34a853',
    successContainer: '#ceead6',
    warning: '#f9ab00',
    warningContainer: '#fef7e0',
    error: '#d93025',
    errorContainer: '#fce8e6',
    
    // Surface tones
    surfaceTint: '#1a73e8',
    outline: '#79747e',
    outlineVariant: '#c4c7c5',
    
    // Shadows use real shadows, not colors
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    lg: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    xl: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    floating: '0 8px 24px rgba(0,0,0,0.15)',
  },
  
  typography: {
    fontFamily: "'Google Sans', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "'Google Sans Mono', 'Roboto Mono', monospace",
    
    // Type scale
    displayLarge: { size: 57, weight: 400, lineHeight: 64 },
    displayMedium: { size: 45, weight: 400, lineHeight: 52 },
    headlineLarge: { size: 32, weight: 400, lineHeight: 40 },
    headlineMedium: { size: 28, weight: 400, lineHeight: 36 },
    titleLarge: { size: 22, weight: 500, lineHeight: 28 },
    titleMedium: { size: 16, weight: 500, lineHeight: 24 },
    titleSmall: { size: 14, weight: 500, lineHeight: 20 },
    bodyLarge: { size: 16, weight: 400, lineHeight: 24 },
    bodyMedium: { size: 14, weight: 400, lineHeight: 20 },
    bodySmall: { size: 12, weight: 400, lineHeight: 16 },
    labelLarge: { size: 14, weight: 500, lineHeight: 20 },
    labelMedium: { size: 12, weight: 500, lineHeight: 16 },
    labelSmall: { size: 11, weight: 500, lineHeight: 16 },
  },
  
  spacing: {
    borderRadius: 12,
    borderRadiusSm: 8,
    borderRadiusLg: 16,
    borderRadiusXl: 28,
    borderRadiusFull: 9999,
  },
  
  motion: {
    durationShort: '100ms',
    durationMedium: '250ms',
    durationLong: '400ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  
  sidebar: {
    width: 280,
    collapsedWidth: 72,
  },
};

export default google2026Theme;
