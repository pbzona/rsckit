import { estimateBytes, parseBytes, formatBytes } from "./bytes";

describe("@/lib/bytes.ts", () => {
  describe("estimateBytes", () => {
    it("should correctly estimate bytes for a string", () => {
      const s = "This is my test string";
      const b = estimateBytes(s);
      expect(b).toEqual(24);
    });

    it("should correctly estimate bytes for an object", () => {
      const p = { a: 1, b: 2 };
      const b = estimateBytes(p);
      expect(b).toEqual(13);
    });

    it("should return 0 for a non-serializable value", () => {
      const f = () => {
        return "some value";
      };
      const b = estimateBytes(f);
      expect(b).toEqual(0);
    });
  });

  describe("formatBytes", () => {
    it("should return 0 Bytes", () => {
      const n = 0;
      const f = formatBytes(n);
      expect(f).toEqual("0 Bytes");
    });

    it("should return formatted bytes", () => {
      const n = 450;
      const f = formatBytes(n);
      expect(f).toEqual("450 Bytes");
    });

    it("should return formatted kilobytes", () => {
      const n = 2099;
      const f = formatBytes(n);
      expect(f).toEqual("2.05 KB");
    });

    it("should return formatted megabytes", () => {
      const n = 2_000_000;
      const f = formatBytes(n);
      expect(f).toEqual("1.91 MB");
    });
  });

  describe("parseBytes", () => {
    it("should parse bytes", () => {
      const s = "30 B";
      const p = parseBytes(s);
      expect(p).toEqual(30);
    });

    it("should parse kilobytes", () => {
      const s = "1.45 KB";
      const p = parseBytes(s);
      expect(p).toEqual(1485);
    });

    it("should parse bytes", () => {
      const s = "3 MB";
      const p = parseBytes(s);
      expect(p).toEqual(3145728);
    });

    it("should error on invalid unit", () => {
      function badValueFn() {
        const s = "30 YB";
        return parseBytes(s);
      }
      expect(badValueFn).toThrow();
    });
  });
});
