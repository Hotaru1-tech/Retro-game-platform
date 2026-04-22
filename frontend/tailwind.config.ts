import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'retro-bg': '#008080',
        'retro-taskbar': '#c0c0c0',
        'retro-window': '#c0c0c0',
        'retro-title': '#000080',
        'retro-title-text': '#ffffff',
        'retro-border-light': '#ffffff',
        'retro-border-dark': '#808080',
        'retro-border-darker': '#000000',
        'retro-button': '#c0c0c0',
        'retro-desktop': '#008080',
        'retro-highlight': '#000080',
        'retro-text': '#000000',
        'retro-accent': '#ff0000',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'retro': ['"MS Sans Serif"', '"Microsoft Sans Serif"', 'Tahoma', 'Geneva', 'sans-serif'],
      },
      boxShadow: {
        'retro-out': 'inset 1px 1px 0px #ffffff, inset -1px -1px 0px #000000, inset 2px 2px 0px #dfdfdf, inset -2px -2px 0px #808080',
        'retro-in': 'inset -1px -1px 0px #ffffff, inset 1px 1px 0px #000000, inset -2px -2px 0px #dfdfdf, inset 2px 2px 0px #808080',
        'retro-button': 'inset 1px 1px 0px #ffffff, inset -1px -1px 0px #000000, inset 2px 2px 0px #dfdfdf, inset -2px -2px 0px #808080',
        'retro-button-pressed': 'inset -1px -1px 0px #ffffff, inset 1px 1px 0px #000000, inset -2px -2px 0px #dfdfdf, inset 2px 2px 0px #808080',
      },
    },
  },
  plugins: [],
};

export default config;
