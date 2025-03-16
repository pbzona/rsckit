import { createDependency, Dependency } from "./dependencies";

describe("@/file-objects/dependencies.ts", () => {
  describe("createDependency", () => {
    it("should create dependencies for .ts and .tsx files", () => {
      const ts = "/my/regular/typescript/dependency.ts"
      const resTs = createDependency(ts);
      expect(resTs).toBeInstanceOf(Dependency);

      const tsx = "/some/path/to/component.tsx";
      const resTsx = createDependency(tsx)
      expect(resTsx).toBeInstanceOf(Dependency);
    })

    it("should return undefined for declaration files", () => {
      const dts = "/some/declaration/file.d.ts"
      const resDts = createDependency(dts);
      expect(resDts).toBeUndefined()

      const dmts = "/path/to/module/index.d.mts";
      const resDmts = createDependency(dmts);
      expect(resDmts).toBeUndefined();
    })
  })
})
