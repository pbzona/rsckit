import { pageDisplayName } from "./utils";

describe("pageDisplayName", () => {
  it("correctly formats standard app path", () => {
    expect(pageDisplayName("/src/app/page.tsx")).toBe("/page.tsx");
  });

  it("correctly formats app path with grouping", () => {
    expect(pageDisplayName("/src/app/(main)/page.tsx")).toBe(
      "/(main)/page.tsx",
    );
  });

  it("correctly formats app path with nested 'app' string in segment", () => {
    expect(pageDisplayName("/src/app/(app)/page.tsx")).toBe("/(app)/page.tsx");
  });

  it("correctly formats app path with 'app' in filename", () => {
    expect(pageDisplayName("/src/app/apple.tsx")).toBe("/apple.tsx");
  });

  it("correctly formats path with multiple 'app' segments", () => {
    expect(pageDisplayName("/src/app/dashboard/app-settings/page.tsx")).toBe(
      "/dashboard/app-settings/page.tsx",
    );
  });

  it("correctly formats path with nested 'app' folder (first occurrence)", () => {
    // Should split at the first 'app' and keep the second one
    expect(pageDisplayName("/src/app/dashboard/app/page.tsx")).toBe(
      "/dashboard/app/page.tsx",
    );
  });

  it("correctly formats user provided example", () => {
    expect(pageDisplayName("/app/(app)/some/page.tsx")).toBe(
      "/(app)/some/page.tsx",
    );
  });

  it("falls back to display name if 'app' is not present", () => {
    expect(pageDisplayName("/src/components/button.tsx")).toBe(
      "components/button.tsx",
    );
  });
});
