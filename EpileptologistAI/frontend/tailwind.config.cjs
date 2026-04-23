module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        surface: {
          DEFAULT: '#14101c',
          light: '#1c1728',
          lighter: '#2a2438',
        },
        bg: {
          DEFAULT: '#08060d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Instrument Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'presentation-orbit': 'presentation-orbit 22s ease-in-out infinite',
        'depth-plane-a': 'depth-plane-a 19s ease-in-out infinite',
        'depth-plane-b': 'depth-plane-b 23s ease-in-out infinite',
        'depth-plane-c': 'depth-plane-c 17s ease-in-out infinite',
        'depth-shard': 'depth-shard 28s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.25)' },
          '100%': { boxShadow: '0 0 22px rgba(236, 72, 153, 0.35)' },
        },
        'presentation-orbit': {
          '0%, 100%': { transform: 'rotateX(12deg) rotateY(-6deg) rotateZ(0deg)' },
          '50%': { transform: 'rotateX(8deg) rotateY(14deg) rotateZ(4deg)' },
        },
        'depth-plane-a': {
          '0%, 100%': { transform: 'rotateX(11deg) rotateY(-34deg) translateZ(0px) translateY(0)' },
          '50%': { transform: 'rotateX(20deg) rotateY(-14deg) translateZ(72px) translateY(-10px)' },
        },
        'depth-plane-b': {
          '0%, 100%': { transform: 'rotateX(8deg) rotateY(38deg) translateZ(10px) translateY(0)' },
          '50%': { transform: 'rotateX(16deg) rotateY(18deg) translateZ(56px) translateY(12px)' },
        },
        'depth-plane-c': {
          '0%, 100%': { transform: 'rotateX(22deg) rotateY(8deg) translateZ(-20px) scale(1)' },
          '50%': { transform: 'rotateX(10deg) rotateY(-10deg) translateZ(40px) scale(1.03)' },
        },
        'depth-shard': {
          '0%, 100%': { transform: 'rotateX(60deg) rotateZ(0deg) translateZ(0)' },
          '50%': { transform: 'rotateX(52deg) rotateZ(8deg) translateZ(24px)' },
        },
      },
    },
  },
  plugins: [],
}
