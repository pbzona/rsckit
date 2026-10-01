import { withPropInspector } from "./with-prop-inspector";
import { isPropLarge } from "@/lib/prop-checks";

it("keeps notifications isolated between renders without copying prop values", () => {
  function Card(_props: { first?: string; second?: string }) {
    return null;
  }
  const notify = jest.fn();
  const Inspected = withPropInspector(Card, notify, { threshold: 5 });
  Inspected({ first: "large-value" });
  Inspected({ second: "another-large-value" });
  Inspected({ first: "x" });
  expect(notify).toHaveBeenCalledTimes(2);
  expect(Object.keys(notify.mock.calls[0][0].props)).toEqual(["first"]);
  expect(Object.keys(notify.mock.calls[1][0].props)).toEqual(["second"]);
  expect(JSON.stringify(notify.mock.calls)).not.toContain("large-value");
});

it("reports unavailable estimates and validates thresholds", () => {
  const check = isPropLarge({ name: "action", value: () => {} }, "Card");
  expect(check.result).toBe(false);
  expect(check.estimate.bytes).toBeNull();
  expect(check.message).toContain("unavailable");
  expect(() => isPropLarge({ name: "data", value: "x" }, "Card", -1)).toThrow(
    "threshold",
  );
});
