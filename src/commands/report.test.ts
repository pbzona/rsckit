import { report } from "./report";
import { readSnapshot } from "@/analysis";
import { testSnapshot } from "@/analysis/test-snapshot";
jest.mock("@/analysis");
afterEach(() => {
  jest.restoreAllMocks();
});

it("prints saved JSON verbatim and propagates missing snapshot errors", async () => {
  const snapshot = testSnapshot();
  jest.mocked(readSnapshot).mockResolvedValueOnce(snapshot);
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  await report({ json: true, root: "/project" });
  expect(log).toHaveBeenCalledTimes(1);
  expect(JSON.parse(log.mock.calls[0][0])).toEqual(snapshot);
  jest
    .mocked(readSnapshot)
    .mockRejectedValueOnce(new Error("snapshot missing"));
  await expect(report()).rejects.toThrow("snapshot missing");
});
