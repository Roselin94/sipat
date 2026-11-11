/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        congo: {
          green: '#007A3D',  // Vert républicain du drapeau congolais
          yellow: '#FFD100', // Jaune républicain
          red: '#DC241F',    // Rouge républicain
          dark: '#0A2540',   // Bleu nuit étatique pour les tableaux de bord
        },
      },
    },
  },
  plugins: [],
}

