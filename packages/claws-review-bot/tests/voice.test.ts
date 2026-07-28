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

  it("requires kill switches for dangerous features and temporary flighting", () => {
    const voice = loadVoice("reviewer");

    expect(voice).toContain(
      "No dangerous feature without an independently operable kill switch"
    );
    expect(voice).toMatch(
      /Flighting is by\s+exception, not the default\s+architecture/
    );
    expect(voice).toMatch(
      /Once the feature is stable, remove the flight\s+assignment/
    );
    expect(voice).toMatch(
      /A percentage\/cohort flag is not a\s+sufficient rollback control/
    );
  });
});
