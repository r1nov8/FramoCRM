/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './{App,types,constants,index,vite}.tsx',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
