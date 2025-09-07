import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import postcssMinify from "postcss-minify";

export default {
  plugins: [tailwindcss, autoprefixer, postcssMinify],
};
