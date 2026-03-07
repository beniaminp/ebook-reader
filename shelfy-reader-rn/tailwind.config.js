/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#2C5F8A',
        'primary-dark': '#1E4060',
        accent: '#4A90D9',
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#1A1A2E',
        },
        surface: {
          DEFAULT: '#F5F5F5',
          dark: '#252540',
        },
        text: {
          DEFAULT: '#1A1A1A',
          secondary: '#666666',
          dark: '#E8E8E8',
        },
        sepia: {
          bg: '#F4ECD8',
          text: '#5B4636',
        },
        reader: {
          highlight: {
            yellow: '#FFF176',
            green: '#A5D6A7',
            blue: '#90CAF9',
            pink: '#F48FB1',
          },
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
    },
  },
  plugins: [],
};
