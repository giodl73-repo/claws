import { readFileSync, writeFileSync, existsSync } from "node:fs";

export interface SeenState {
  [prKey: string]: {
    lastSeenUpdatedAt: string;
    lastReviewedSha: string | null;
  };
}

export class SeenStore {
  private path: string;
  private state: SeenState;

  constructor(path: string) {
    this.path = path;
    this.state = existsSync(path)
      ? (JSON.parse(readFileSync(path, "utf8")) as SeenState)
      : {};
  }

  get(repo: string, num: number): SeenState[string] | undefined {
    return this.state[`${repo}#${num}`];
  }

  set(
    repo: string,
    num: number,
    record: { lastSeenUpdatedAt: string; lastReviewedSha: string | null }
  ): void {
    this.state[`${repo}#${num}`] = record;
    this.flush();
  }

  private flush(): void {
    writeFileSync(this.path, JSON.stringify(this.state, null, 2), "utf8");
  }
}
