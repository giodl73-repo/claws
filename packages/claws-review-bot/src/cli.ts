import { Command } from "commander";
import { runTick } from "./tick.js";
import { runPoll } from "./poll.js";
import { loadVoice } from "./voice.js";
import { invokeClaude } from "./claude.js";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const program = new Command();

program
  .name("claws-review-bot")
  .description(
    "Architect-style PR reviewer for microsoft.ghe.com — polling daemon + author-side modes"
  )
  .version("0.1.0");

program
  .command("tick")
  .description("Run a single review tick on one PR")
  .argument("<repo-pr>", "repo and PR number, e.g. bic/lobster#634")
  .option("--dry-run", "do not post comment, print verdict to stdout", false)
  .option("--post", "post the verdict to the PR (default: false)", false)
  .action(async (repoPr: string, opts: { dryRun: boolean; post: boolean }) => {
    const match = repoPr.match(/^([^#]+)#(\d+)$/);
    if (!match || !match[1] || !match[2]) {
      console.error(
        `[cli] expected <owner>/<repo>#<number>, got: ${repoPr}`
      );
      process.exit(2);
    }

    const repo = match[1];
    const num = parseInt(match[2], 10);

    const result = await runTick({
      repo,
      num,
      dryRun: opts.dryRun,
      postComment: opts.post,
    });

    if (result.skipped) {
      console.log(`[tick] skip — ${result.reason}`);
      return;
    }

    if (result.postedCommentId) {
      console.log(`[tick] posted comment #${result.postedCommentId}`);
    } else {
      process.stdout.write(result.verdictBody ?? "");
    }
  });

program
  .command("poll")
  .description("Polling loop — list PRs, dedupe, tick, repeat")
  .option(
    "--repo <repo>",
    "repo to poll, can be repeated",
    (val: string, prev: string[]) => [...prev, val],
    [] as string[]
  )
  .option("--seen <path>", "path to seen.json cache", "./seen.json")
  .option(
    "--interval-min <minutes>",
    "polling interval in minutes",
    (v: string) => parseInt(v, 10),
    10
  )
  .option(
    "--post",
    "post verdict comments (also reads POST_COMMENTS env var; either enables)",
    false
  )
  .option("--once", "run one tick across all repos and exit", false)
  .option(
    "--skip-author <login>",
    "skip PRs from this GHE login (repeatable; also reads SKIP_AUTHORS env var, comma-separated)",
    (val: string, prev: string[]) => [...prev, val],
    [] as string[]
  )
  .action(
    async (opts: {
      repo: string[];
      seen: string;
      intervalMin: number;
      post: boolean;
      once: boolean;
      skipAuthor: string[];
    }) => {
      if (opts.repo.length === 0) {
        console.error(
          "[cli] --repo is required, e.g. --repo bic/lobster"
        );
        process.exit(2);
      }

      const envPost = (process.env["POST_COMMENTS"] ?? "")
        .toLowerCase()
        .match(/^(1|true|yes|on)$/);
      const postComments = opts.post || envPost !== null;

      const envSkip = (process.env["SKIP_AUTHORS"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const skipAuthors = [...opts.skipAuthor, ...envSkip];

      await runPoll({
        repos: opts.repo,
        seenPath: resolve(opts.seen),
        intervalMs: opts.intervalMin * 60 * 1000,
        postComments,
        onceOnly: opts.once,
        skipAuthors,
      });
    }
  );

program
  .command("preflight")
  .description("Run preflight self-review on the current branch")
  .option("--base <ref>", "merge base to diff against", "main")
  .action(async (opts: { base: string }) => {
    const diff = spawnSync(
      "git",
      ["diff", `${opts.base}...HEAD`],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );

    if (diff.status !== 0) {
      console.error(`[preflight] git diff failed: ${diff.stderr}`);
      process.exit(1);
    }

    if (diff.stdout.trim().length === 0) {
      console.log(`[preflight] no diff vs ${opts.base} — nothing to review`);
      return;
    }

    const systemPrompt = loadVoice("preflight");
    const userPrompt = [
      `## Branch diff (vs ${opts.base})`,
      "",
      "```diff",
      diff.stdout,
      "```",
      "",
      "## Instructions",
      "",
      "Run preflight per modes/preflight.md. Output the punch list to stdout. No PR comment — this is private to the author.",
    ].join("\n");

    const out = await invokeClaude({ systemPrompt, userPrompt });
    process.stdout.write(out);
  });

program
  .command("voice")
  .description("Print the concatenated voice files for a given mode")
  .option(
    "--mode <mode>",
    "reviewer | preflight | reply",
    "reviewer"
  )
  .action((opts: { mode: string }) => {
    if (
      opts.mode !== "reviewer" &&
      opts.mode !== "preflight" &&
      opts.mode !== "reply"
    ) {
      console.error(`[cli] invalid --mode: ${opts.mode}`);
      process.exit(2);
    }
    process.stdout.write(loadVoice(opts.mode));
  });

program.parseAsync(process.argv).catch((e: unknown) => {
  console.error(`[cli] error:`, e);
  process.exit(1);
});
