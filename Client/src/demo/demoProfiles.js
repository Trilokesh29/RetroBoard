export const demoProfiles = [
  {
    userName: "demo_lead",
    emailId: "demo@retroboard.local",
    password: "demo1234",
    label: "Facilitator",
    description: "Owns both demo teams and can exercise the full facilitation flow.",
    teams: ["aurora", "nebula"],
  },
  {
    userName: "guest_facilitator",
    emailId: "guest@retroboard.local",
    password: "demo1234",
    label: "Guest facilitator",
    description: "Useful for testing ownership boundaries, voting, and shared editing.",
    teams: ["aurora"],
  },
  {
    userName: "delivery_partner",
    emailId: "delivery@retroboard.local",
    password: "demo1234",
    label: "Delivery partner",
    description: "Lets you test action points and collaboration from another perspective.",
    teams: ["aurora", "nebula"],
  },
  {
    userName: "product_partner",
    emailId: "product@retroboard.local",
    password: "demo1234",
    label: "Product partner",
    description: "Good for trying alternate votes, happiness scores, and board activity.",
    teams: ["nebula"],
  },
];
