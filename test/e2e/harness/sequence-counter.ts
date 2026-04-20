export class SequenceCounter {
  private value: number;

  constructor(start = 0) {
    if (!Number.isInteger(start) || start < 0) {
      throw new Error('sequence-counter: start must be a non-negative integer');
    }
    this.value = start;
  }

  next(): number {
    this.value += 1;
    return this.value;
  }

  current(): number {
    return this.value;
  }

  accept(n: number): boolean {
    if (!Number.isInteger(n) || n <= this.value) {
      return false;
    }
    this.value = n;
    return true;
  }
}
