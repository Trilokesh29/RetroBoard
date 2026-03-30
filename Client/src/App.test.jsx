import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./Components/App";

test("renders loading state", () => {
  render(<App />);
  expect(screen.getByText(/Preparing your workspace/i)).toBeInTheDocument();
});
