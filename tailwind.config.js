/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    'bg-blue-100',
    'bg-yellow-100',
    'bg-green-100',
    'text-blue-800',
    'text-yellow-800',
    'text-green-800',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};