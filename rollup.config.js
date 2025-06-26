import babel from "rollup-plugin-babel";
import serve from "rollup-plugin-serve";
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: "./src/index.ts",
  output: {
    file: "dist/waterfalllayout.umd.js",
    format: "umd",
    name: "Waterfalllayout",
    sourcemap: true,
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    serve({
      port: 3001,
      contentBase: "",
      openPage: "/index.html",
    }),
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' })
  ],
};