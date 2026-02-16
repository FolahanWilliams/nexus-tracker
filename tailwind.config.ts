
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--bg-app)",
                foreground: "var(--text-primary)",
                primary: "var(--accent-blue)",
                success: "var(--accent-green)",
                warning: "var(--accent-yellow)",
                danger: "var(--accent-red)",
            },
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
            },
        },
    },
    plugins: [],
};
export default config;
