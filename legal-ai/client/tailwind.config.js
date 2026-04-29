/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-inter)', 'sans-serif'] },
      colors: {
        primary: '#7c3aed',
        accent: '#06b6d4',
      },
    },
  },
  plugins: [],
};
