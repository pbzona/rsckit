import { Stack } from "./stack";
describe("@/lib/stack", () => {
  it("should push", () => {
    const s = new Stack(0);
    s.push(1);
    s.push(2);
    s.push(100);

    expect(s.size()).toEqual(4);
    expect(s.values).toEqual([0, 1, 2, 100]);
  });

  it("should pop", () => {
    const s = new Stack(0);
    s.values = [0, 1, 2, 3, 4, 5];

    const first = s.pop();
    expect(first).toEqual(5);
    expect(s.size()).toEqual(5);

    const second = s.pop();
    expect(second).toEqual(4);
    expect(s.size()).toEqual(4);
  });

  it("should peek", () => {
    const s = new Stack(0);
    s.push(40);
    const v = s.peek();

    expect(v).toEqual(40);
    expect(s.size()).toEqual(2);
  });
});
