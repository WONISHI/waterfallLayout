import babel from "rollup-plugin-babel";
import serve from "rollup-plugin-serve";

export default {
  input: "./src/index.js", //打包的入口文件
  output: {
    file: "dist/waterfalllayout.js",
    format: "umd", //打包的模块，可以在window上 Vue
    name: "Waterfalllayout", //全局的Vue
    sourcemap: true, //映射
  },
  plugins: [
    babel({
      exclude: "node_modules/**", //排除不需要转化
    }),
    serve({
      port: 3000, //设置端口号
      contentBase: "", //如果是''表示当前目录
      openPage: "/index.html", //打开的文件
    }),
  ],
};