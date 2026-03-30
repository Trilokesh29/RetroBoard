import { describe, expect, it } from "vitest";

import { findTemplateForSettings, retroTemplates } from "./retroTemplates";

describe("retroTemplates", () => {
  it("includes the newer quirky templates", () => {
    const templateIds = retroTemplates.map((template) => template.id);

    expect(templateIds).toContain("pirate");
    expect(templateIds).toContain("spaceship");
    expect(templateIds).toContain("heist");
  });

  it("matches templates by normalized column names", () => {
    const template = findTemplateForSettings({
      Good: "  treasure ",
      Bad: "storms",
      Ugly: "NEXT ISLAND",
    });

    expect(template.id).toBe("pirate");
  });

  it("falls back to the default template when settings are missing", () => {
    expect(findTemplateForSettings(null).id).toBe(retroTemplates[0].id);
    expect(
      findTemplateForSettings({
        Good: "One",
        Bad: "Two",
        Ugly: "Three",
      }).id
    ).toBe(retroTemplates[0].id);
  });
});
