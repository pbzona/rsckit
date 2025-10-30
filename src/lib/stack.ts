export class Stack<T> {
  values: T[];

  constructor(init: T) {
    this.values = [init];
  }

  push(v: T) {
    this.values.push(v);
  }

  pop(): T {
    return this.values.pop();
  }

  size(): number {
    return this.values.length;
  }

  peek(): T {
    return this.values.slice(-1)[0];
  }
}
