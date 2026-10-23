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
        slack: {
          sidebar: '#1A1D21',
          active: '#1164A3',
          aubergine: '#4A154B',
          hover: '#27242C',
        },
      },
    },
  },
  plugins: [],
};

export default config;
