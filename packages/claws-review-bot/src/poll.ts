import { listOpenPulls } from "./gh.js";
import { runTick } from "./tick.js";
import { SeenStore } from "./seen.js";

export interface PollOptions {
  repos: string[];
  seenPath: string;
  intervalMs?: number;
  postComments?: boolean;
  onceOnly?: boolean;
}

export async function runPoll(opts: PollOptions): Promise<void> {
  const seen = new SeenStore(opts.seenPath);
  const interval = opts.intervalMs ?? 10 * 60 * 1000;

  const tickAll = async (): Promise<void> => {
    for (const repo of opts.repos) {
      let pulls;
      try {
        pulls = listOpenPulls(repo);
      } catch (e) {
        console.error(`[poll] list ${repo} failed:`, e);
        continue;
      }

      for (const pull of pulls) {
        if (pull.draft) continue;

        const cached = seen.get(repo, pull.number);
        if (cached && cached.lastSeenUpdatedAt >= pull.updated_at) continue;

        try {
          const result = await runTick({
            repo,
            num: pull.number,
            postComment: opts.postComments ?? false,
          });

          seen.set(repo, pull.number, {
            lastSeenUpdatedAt: pull.updated_at,
            lastReviewedSha: result.skipped ? null : pull.head.sha,
          });

          if (result.skipped) {
            console.log(
              `[poll] ${repo}#${pull.number} skip — ${result.reason}`
            );
          } else {
            console.log(
              `[poll] ${repo}#${pull.number} reviewed @ ${pull.head.sha.slice(0, 9)}${
                result.postedCommentId ? ` (posted #${result.postedCommentId})` : " (dry-run)"
              }`
            );
          }
        } catch (e) {
          console.error(`[poll] tick ${repo}#${pull.number} failed:`, e);
        }
      }
    }
  };

  if (opts.onceOnly) {
    await tickAll();
    return;
  }

  // continuous polling — run once immediately, then on interval
  await tickAll();
  while (true) {
    await new Promise((r) => setTimeout(r, interval));
    await tickAll();
  }
}
