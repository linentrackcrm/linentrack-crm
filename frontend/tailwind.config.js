/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF3FB',
          100: '#D6E4F0',
          200: '#A8C8E3',
          300: '#7AADD4',
          400: '#4C91C4',
          500: '#2E75B6',
          600: '#1B4F8A',
          700: '#163F6E',
          800: '#102E52',
          900: '#0B1F37',
        },
        success: { 50:'#D4EDDA', 500:'#1E7B45', 700:'#155B31' },
        warning: { 50:'#FFF0E0', 500:'#C45E00', 700:'#8B4200' },
        danger:  { 50:'#FCE4EC', 500:'#C0392B', 700:'#8C1F15' },
        purple:  { 50:'#EDE7F6', 500:'#5B2D8E', 700:'#3E1C63' },
        teal:    { 50:'#E0F4F4', 500:'#0D7377', 700:'#084F52' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
