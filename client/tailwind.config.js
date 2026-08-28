/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF4F7',
          100: '#FBE8EE',
          200: '#F7D4E0',
          300: '#F0B3C7',
          400: '#E785A4',
          500: '#D9527D',
          600: '#C23563',
          700: '#A2254E',
          800: '#872143',
          900: '#2A1824',
          950: '#1A0E17',
        },
        plum: {
          50: '#FBF8FA',
          100: '#F3ECF2',
          200: '#E4D5E2',
          300: '#CFB8CC',
          400: '#AC87A8',
          500: '#6B4355',
          600: '#553443',
          700: '#432835',
          800: '#321D27',
          900: '#23131B',
          950: '#160B11',
        },
        roseTint: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
        slateDark: '#0F172A',
        charcoal: '#1E293B',
        mutedText: '#64748B',
        bgCanvas: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(107, 67, 85, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        card: '0 10px 35px -5px rgba(45, 35, 41, 0.05), 0 2px 10px -2px rgba(107, 67, 85, 0.03)',
        glass: '0 20px 40px -15px rgba(107, 67, 85, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8)',
        glow: '0 0 30px -5px rgba(224, 83, 112, 0.35)',
        'plum-glow': '0 10px 30px -5px rgba(107, 67, 85, 0.4)',
      },
    },
  },
  plugins: [],
};
