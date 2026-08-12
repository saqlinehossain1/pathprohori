/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: {
          50: '#FBF8FA',
          100: '#F5ECF1',
          200: '#EAD9E3',
          300: '#D5B6C6',
          400: '#AA7492',
          500: '#6B4355',
          600: '#5C3A48',
          700: '#4C2F3C',
          800: '#3D2530',
          900: '#2D1B24',
        },
        roseTint: {
          50: '#FFF5F7',
          100: '#FDE8EC',
          500: '#E05370',
          600: '#D93856',
        },
        darkCharcoal: '#2D2329',
        mutedPlum: '#6E656B',
        bgLight: '#F9F8FA',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(107, 67, 85, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        card: '0 8px 30px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
