/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ed',
          100: '#fdecd4',
          200: '#fbd8a9',
          300: '#f8be73',
          400: '#B1C29E', // Main orange
          500: '#B1C29E',
          600: '#d8862e',
          700: '#b36823',
          800: '#925220',
          900: '#78441f',
        },
        sage: {
          50: '#f5f7f2',
          100: '#e8ede0',
          200: '#d1dbc1',
          300: '#B1C29E', // Main sage green
          400: '#9ba886',
          500: '#7d8f68',
          600: '#647154',
          700: '#515844',
          800: '#44493b',
          900: '#3a3e33',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#FADA7A', // Main light yellow/gold
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        peach: {
          50: '#FCE7C8', // Main light peach/beige
          100: '#fae0b8',
          200: '#f7d4a0',
          300: '#f4c788',
          400: '#f1ba70',
          500: '#edad58',
          600: '#ea9f40',
          700: '#c88536',
          800: '#a66b2c',
          900: '#845122',
        },
        olive: {
          50: '#f4f6ef',
          100: '#e8ecdf',
          200: '#d1d9bf',
          300: '#b3c095',
          400: '#9da875',
          500: '#808a5c', // Main olive green
          600: '#6b8e23', // Olive green
          700: '#556b2f', // Dark olive
          800: '#465528',
          900: '#3c4824',
        }
      }
    },
  },
  plugins: [],
}