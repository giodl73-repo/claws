import { beforeEach, describe, expect, it, vi } from "vitest";

import { spawnSync } from "node:child_process";
import { listPrReviewComments } from "../src/gh.js";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

describe("GitHub pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads inline review comments page by page without gh --paginate", () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      user: { login: "maintainer" },
      body: `comment ${index + 1}`,
      created_at: "2026-07-15T01:00:00Z",
      updated_at: "2026-07-15T01:00:00Z",
      author_association: "MEMBER",
    }));
    const secondPage = [
      {
        id: 101,
        user: { login: "maintainer" },
        body: "decision",
        created_at: "2026-07-15T02:00:00Z",
        updated_at: "2026-07-15T02:00:00Z",
        author_association: "MEMBER",
      },
    ];

    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        status: 0,
        stdout: JSON.stringify(firstPage),
        stderr: "",
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({
        status: 0,
        stdout: JSON.stringify(secondPage),
        stderr: "",
      } as ReturnType<typeof spawnSync>);

    const comments = listPrReviewComments("bic/lobster", 5000);

    expect(comments).toHaveLength(101);
    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      "gh",
      [
        "api",
        "--hostname",
        "microsoft.ghe.com",
        "repos/bic/lobster/pulls/5000/comments?per_page=100&page=1",
      ],
      expect.any(Object)
    );
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "gh",
      [
        "api",
        "--hostname",
        "microsoft.ghe.com",
        "repos/bic/lobster/pulls/5000/comments?per_page=100&page=2",
      ],
      expect.any(Object)
    );
  });
});
