import { filterEmptyPaths, filterNonEcmaPaths } from "./filters";

describe("@/parser/filters.ts", () => {
  describe("filterEmptyPaths", () => {
    it("should remove empty paths", () => {
      const paths = ["a", "b", "c", "", "d", ""];
      const filtered = filterEmptyPaths(paths);
      expect(filtered).toEqual(["a", "b", "c", "d"]);
    });
  });

  describe("filterNonEcmaPaths", () => {
    it("should remove paths that contain non-JS/TS extensions", () => {
      const paths = [
        "script.js",
        "react.jsx",
        "script.ts",
        "react.tsx",
        "styles.css",
        "types.d.ts",
      ];
      const filtered = filterNonEcmaPaths(paths);
      const expected = ["script.js", "react.jsx", "script.ts", "react.tsx"];
      expect(filtered).toEqual(expected);
    });
  });
});
