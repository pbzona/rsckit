import { globby } from "globby";

export const findReactComponentFiles = async (fileName = "*") => {
  return await globby([`**/${fileName}.{js,jsx,tsx}`], {
    gitignore: true,
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.vercel/**",
      "**/.git/**",
    ]
  })
}
