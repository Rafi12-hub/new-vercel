export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          white: '#F8FAFC',
          lavender: '#EEF2FF',
          sky: '#E0F2FE',
          purple: '#DDD6FE',
          darkPurple: '#C4B5FD',
          indigo: '#F5F3FF',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)',
        'glass-dark': 'linear-gradient(135deg, rgba(17, 24, 39, 0.4) 0%, rgba(17, 24, 39, 0.1) 100%)',
      },
      backdropBlur: {
        md: '12px',
        lg: '16px',
      }
    },
  },
  plugins: [],
}
