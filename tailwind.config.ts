import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-dark": "var(--primary-dark)",
        secondary: "var(--secondary)",
        "secondary-dark": "var(--secondary-dark)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        neutral: "var(--neutral)",
        "neutral-light": "var(--neutral-light)",
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "link": "var(--link)",
        "link-hover": "var(--link-hover)",
        success: "var(--success)",
        "success-bg": "var(--success-bg)",
        "success-text": "var(--success-text)",
        error: "var(--error)",
        "error-bg": "var(--error-bg)",
        "error-text": "var(--error-text)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        "warning-text": "var(--warning-text)",
        info: "var(--info)",
        "info-bg": "var(--info-bg)",
        "info-text": "var(--info-text)",
        "add-button": "var(--add-button-bg)",
        "add-button-hover": "var(--add-button-bg-hover)",
        "add-button-text": "var(--add-button-text)",
        "add-button-shadow": "var(--add-button-shadow)",
        "brand-orange": "var(--brand-orange)",
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(27 33 38 / 0.05)',
        'md': '0 4px 6px -1px rgb(27 33 38 / 0.1), 0 2px 4px -2px rgb(27 33 38 / 0.1)',
        'lg': '0 10px 15px -3px rgb(27 33 38 / 0.1), 0 4px 6px -4px rgb(27 33 38 / 0.1)',
        'xl': '0 20px 25px -5px rgb(27 33 38 / 0.1), 0 8px 10px -6px rgb(27 33 38 / 0.1)',
        '3xl': '0 35px 60px -12px rgb(27 33 38 / 0.25), 0 20px 25px -5px rgb(27 33 38 / 0.1)',
        'error': '0 0 0 3px rgba(239, 68, 68, 0.1), 0 0 0 1px rgba(239, 68, 68, 0.3)',
      },
      animation: {
        'error-pulse': 'error-pulse 0.3s ease-in-out',
      },
      keyframes: {
        'error-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.01)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
