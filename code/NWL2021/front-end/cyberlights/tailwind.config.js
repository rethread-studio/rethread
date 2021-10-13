const colors = require('tailwindcss/colors')

module.exports = {
  purge: ['src/**/*.{js,jsx,ts,tsx}', 'public/index.html', 'tailwind.config.js'],
  darkMode: false, // or 'media' or 'class'
  safelist: [
    'border-neonpink-300',
    'bg-neonpink-300',
    'text-neonpink-300',
    'border-neonindigo-300',
    'bg-neonindigo-300',
    'text-neonindigo-300',
    'border-neongreen-300',
    'bg-neongreen-300',
    'text-neongreen-300',
    'border-neonred-300',
    'bg-neonred-300',
    'text-neonred-300',
    'border-neonyellow-300',
    'bg-neonyellow-300',
    'text-neonyellow-300'
  ],
  theme: {
    fontFamily: {
      'roboto': ['Roboto', 'sans-serif'],
    },
    colors: {
      black: colors.black,
      white: colors.white,
      gray: colors.coolGray,
      red: colors.red,
      yellow: colors.amber,
      green: colors.emerald,
      blue: colors.blue,
      indigo: colors.indigo,
      purple: colors.violet,
      pink: colors.pink,
      "neonindigo": {
        "50": "#32ffff",
        "100": "#28ffff",
        "200": "#1ef9ff",
        "300": "#14efff",
        "400": "#0ae5ff",
        "500": "#00dbff",
        "600": "#00d1f5",
        "700": "#00c7eb",
        "800": "#00bde1",
        "900": "#00b3d7"
      },
      "neonpink": {
        "50": "#ffb5ff",
        "100": "#ffabff",
        "200": "#ffa1ff",
        "300": "#ff97ff",
        "400": "#ff8dff",
        "500": "#ff83fa",
        "600": "#f579f0",
        "700": "#eb6fe6",
        "800": "#e165dc",
        "900": "#d75bd2"
      },
      "neongreen": {
        "50": "#a5ff7d",
        "100": "#9bff73",
        "200": "#91ff69",
        "300": "#87ff5f",
        "400": "#7dff55",
        "500": "#73f54b",
        "600": "#69eb41",
        "700": "#5fe137",
        "800": "#55d72d",
        "900": "#4bcd23"
      },
      "neonred": {
        "50": "#ff8cb0",
        "100": "#ff82a6",
        "200": "#ff789c",
        "300": "#ff6e92",
        "400": "#f56488",
        "500": "#eb5a7e",
        "600": "#e15074",
        "700": "#d7466a",
        "800": "#cd3c60",
        "900": "#c33256"
      },
      "neonyellow": {
        "50": "#ffff97",
        "100": "#fffc8d",
        "200": "#fff283",
        "300": "#ffe879",
        "400": "#ffde6f",
        "500": "#f6d465",
        "600": "#ecca5b",
        "700": "#e2c051",
        "800": "#d8b647",
        "900": "#ceac3d"
      }
    },
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
