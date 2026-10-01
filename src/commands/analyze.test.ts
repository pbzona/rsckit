import { analyze } from "./analyze";
import { analyzeProject, saveSnapshot } from "@/analysis";
import { testSnapshot } from "@/analysis/test-snapshot";
jest.mock("@/analysis");
afterEach(() => {
  jest.restoreAllMocks();
  process.exitCode = 0;
});

it("prints machine-readable JSON without progress noise", async () => {
  const snapshot = testSnapshot();
  jest.mocked(analyzeProject).mockResolvedValue(snapshot);
  jest.mocked(saveSnapshot).mockResolvedValue("/project/.rsckit/snapshot.json");
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  await analyze({ json: true, root: "/project" });
  expect(log).toHaveBeenCalledTimes(1);
  expect(JSON.parse(log.mock.calls[0][0])).toEqual(snapshot);
  expect(saveSnapshot).toHaveBeenCalledWith(snapshot, undefined);
});

it("propagates analysis failures and marks partial snapshots as failures", async () => {
  jest.mocked(analyzeProject).mockRejectedValueOnce(new Error("missing root"));
  await expect(analyze()).rejects.toThrow("missing root");
  jest.mocked(analyzeProject).mockResolvedValueOnce({
    ...testSnapshot(),
    diagnostics: [{ level: "error", code: "read-error", message: "failed" }],
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
  await analyze();
  expect(process.exitCode).toBe(1);
});
