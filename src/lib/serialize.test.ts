import { serializeMap, serializeSet, deserializeMap, deserializeSet } from "./serialize"

describe("@/lib/serialize.ts", () => {
  describe("serializeMap", () => {
    it("should properly serialize a Map", () => {
      const map = new Map<string, number>()
        .set("a", 1)
        .set("b", 2)
      const s = serializeMap<number>(map)
      expect(s).toEqual("{\"a\":1,\"b\":2}")
    })
  })
  describe("deserializeMap", () => {
    it("should properly deserialize a string to a Map", () => {
      const s = "{\"a\":1,\"b\":2}"
      const map = deserializeMap<number>(s);
      expect(map.get("a")).toEqual(1)
      expect(map.get("b")).toEqual(2)
    })
  })
  describe("serializeSet", () => {
    it("should properly serialize a Set", () => {
      const set = new Set<number>([1, 2, 3, 1, 2])
      set.keys
      const s = serializeSet<number>(set);
      expect(s).toEqual("[1,2,3]")
    })
  })
  describe("deserializeSet", () => {
    it("should properly derialiaze a string to a Set", () => {
      const s = "[1,2,3]"
      const set = deserializeSet<number>(s);
      expect(set.size).toEqual(3)
    })
  })
})
