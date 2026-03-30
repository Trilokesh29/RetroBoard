export const retroTemplates = [
  {
    id: "gbu",
    name: "Good / Bad / Ugly",
    description: "Classic retrospective framing for wins, pain points, and risks.",
    columns: {
      Good: "Good",
      Bad: "Bad",
      Ugly: "Ugly",
    },
  },
  {
    id: "rose-thorn-bud",
    name: "Rose / Thorn / Bud",
    description: "A softer facilitation frame for wins, pain points, and promising ideas.",
    columns: {
      Good: "Rose",
      Bad: "Thorn",
      Ugly: "Bud",
    },
  },
  {
    id: "ssc",
    name: "Start / Stop / Continue",
    description: "Great when the team wants actionable behavior changes quickly.",
    columns: {
      Good: "Start",
      Bad: "Stop",
      Ugly: "Continue",
    },
  },
  {
    id: "msg",
    name: "Mad / Sad / Glad",
    description: "Useful for surfacing emotion and team sentiment.",
    columns: {
      Good: "Glad",
      Bad: "Sad",
      Ugly: "Mad",
    },
  },
  {
    id: "kpt",
    name: "Keep / Problem / Try",
    description: "Balances what is working with experiments for the next sprint.",
    columns: {
      Good: "Keep",
      Bad: "Problem",
      Ugly: "Try",
    },
  },
  {
    id: "campfire",
    name: "Campfire Stories",
    description: "Capture what warmed the team, what smoked up the room, and what to spark next.",
    columns: {
      Good: "Campfire",
      Bad: "Smoke",
      Ugly: "Spark",
    },
  },
  {
    id: "pirate",
    name: "Pirate Retro",
    description: "A quirky frame for treasure, storms, and the next island worth chasing.",
    columns: {
      Good: "Treasure",
      Bad: "Storms",
      Ugly: "Next Island",
    },
  },
  {
    id: "spaceship",
    name: "Spaceship",
    description: "Useful when the team wants to talk about boosters, drag, and new trajectories.",
    columns: {
      Good: "Boosters",
      Bad: "Space Junk",
      Ugly: "Next Orbit",
    },
  },
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    description: "Lightweight and human: what energized us, what tasted bitter, and what to brew next.",
    columns: {
      Good: "Espresso Shots",
      Bad: "Bitter Sips",
      Ugly: "Brew Next",
    },
  },
  {
    id: "garden",
    name: "Garden",
    description: "A growth-oriented retro for things that bloomed, weeds to pull, and seeds to plant.",
    columns: {
      Good: "Blooms",
      Bad: "Weeds",
      Ugly: "Seeds",
    },
  },
  {
    id: "arcade",
    name: "Arcade",
    description: "Great for high-energy teams reflecting on power-ups, glitches, and bonus levels.",
    columns: {
      Good: "Power-Ups",
      Bad: "Glitches",
      Ugly: "Bonus Levels",
    },
  },
  {
    id: "detective",
    name: "Detective Board",
    description: "Frame the sprint like a case file: clues, suspects, and the next lead to follow.",
    columns: {
      Good: "Clues",
      Bad: "Suspects",
      Ugly: "Next Lead",
    },
  },
  {
    id: "weather",
    name: "Weather Report",
    description: "Helpful for surfacing mood and momentum through sunshine, storms, and forecasts.",
    columns: {
      Good: "Sunny",
      Bad: "Stormy",
      Ugly: "Forecast",
    },
  },
  {
    id: "alchemy",
    name: "Alchemy Lab",
    description: "For teams experimenting often: what turned to gold, what fizzled, and the next formula.",
    columns: {
      Good: "Gold",
      Bad: "Fizzle",
      Ugly: "Next Formula",
    },
  },
  {
    id: "heist",
    name: "Heist Movie",
    description: "A playful template for what went to plan, what tripped the crew, and the next move.",
    columns: {
      Good: "Smooth Moves",
      Bad: "Tripwires",
      Ugly: "Next Move",
    },
  },
];

export function findTemplateForSettings(settings) {
  if (!settings) {
    return retroTemplates[0];
  }

  const normalized = {
    Good: String(settings.Good || "").trim().toLowerCase(),
    Bad: String(settings.Bad || "").trim().toLowerCase(),
    Ugly: String(settings.Ugly || "").trim().toLowerCase(),
  };

  return (
    retroTemplates.find((template) =>
      normalized.Good === template.columns.Good.toLowerCase() &&
      normalized.Bad === template.columns.Bad.toLowerCase() &&
      normalized.Ugly === template.columns.Ugly.toLowerCase()
    ) || retroTemplates[0]
  );
}
