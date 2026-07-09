import { describe, expect, it } from "vitest";

import { loadVoice } from "../src/voice.js";

describe("reviewer voice", () => {
  it("requires an explicit human maintainer decision before approval for architectural gates", () => {
    const voice = loadVoice("reviewer");

    expect(voice).toContain("## Maintainer-decision gate");
    expect(voice).toContain("[Major | block | maintainer-decision]");
    expect(voice).toContain("never emit `<!-- claws-lobster-architect:approve -->`");
    expect(voice).toContain("maintainer with authority on the repo comments the decision");
  });
});
