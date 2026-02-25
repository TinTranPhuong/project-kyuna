export interface Theme {
  name: string
  label: string
  backgroundUrl: string        // path to video asset in /public/assets/backgrounds/
  overlayOpacity: number       // 0.0 - 1.0
  accentColor: string          // CSS color for theme-specific accents
  previewImage: string         // static preview image for Settings page
}

export const THEMES: Record<string, Theme> = {
  'night-garden': {
    name: 'night-garden',
    label: 'Night Garden',
    backgroundUrl: '/assets/backgrounds/night-garden.mp4',
    overlayOpacity: 0.4,
    accentColor: '#14b8a6',
    previewImage: '/assets/previews/night-garden.jpg',
  },
  'rainy-city': {
    name: 'rainy-city',
    label: 'Rainy City',
    backgroundUrl: '/assets/backgrounds/rainy-city.mp4',
    overlayOpacity: 0.5,
    accentColor: '#6366f1',
    previewImage: '/assets/previews/rainy-city.jpg',
  },
  'space': {
    name: 'space',
    label: 'Deep Space',
    backgroundUrl: '/assets/backgrounds/space.mp4',
    overlayOpacity: 0.3,
    accentColor: '#8b5cf6',
    previewImage: '/assets/previews/space.jpg',
  },
  'forest': {
    name: 'forest',
    label: 'Enchanted Forest',
    backgroundUrl: '/assets/backgrounds/forest.mp4',
    overlayOpacity: 0.45,
    accentColor: '#22c55e',
    previewImage: '/assets/previews/forest.jpg',
  },
}