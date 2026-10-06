/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4: point the plugin at the CSS entry that holds the theme.
  tailwindStylesheet: "./src/app/globals.css",
  tailwindFunctions: ["cva", "cn"],
};

export default config;
