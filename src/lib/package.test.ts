import { findParentPackage } from "./package"

const mockParentPredicate = (dir: string) => {
  return dir.endsWith("/target");
}

describe('@/lib/package.ts', () => {
  describe('findParentPackage', () => {
    it('should find package.json in current directory', () => {
      const currentDir = "/path/to/target";
      const packageDir = findParentPackage(currentDir, mockParentPredicate)
      expect(packageDir).toEqual(currentDir);
    })

    it('should find package.json in ancestor directory', () => {
      const currentDir = "/long/path/to/target/with/nested/dirs";
      const packageDir = findParentPackage(currentDir, mockParentPredicate)
      expect(packageDir).toEqual("/long/path/to/target");
    })
  })
})
