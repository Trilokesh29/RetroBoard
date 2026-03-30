import React, { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

function getMostCommonValue(values) {
  const counts = values.reduce((accumulator, value) => {
    if (!value) {
      return accumulator;
    }

    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  const sortedEntries = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  return sortedEntries.length ? sortedEntries[0][0] : "None yet";
}

function buildSummary(items, settings) {
  const totalVotes = items.reduce((sum, item) => sum + Number(item.votes || 0), 0);
  const actionPoints = items.reduce(
    (sum, item) => sum + ((item.actionPoints || []).length || 0),
    0
  );
  const contributors = Array.from(new Set(items.map((item) => item.name).filter(Boolean)));
  const topItem = [...items].sort((left, right) => Number(right.votes || 0) - Number(left.votes || 0))[0];
  const busiestColumnKey = getMostCommonValue(items.map((item) => item.type));
  const busiestColumnName = settings && settings[busiestColumnKey] ? settings[busiestColumnKey] : busiestColumnKey;
  const topContributor = getMostCommonValue(items.map((item) => item.name));

  return {
    totalVotes,
    actionPoints,
    contributors: contributors.length,
    busiestColumnName,
    topContributor,
    topItem,
    markdown: [
      "## Retro snapshot",
      `- Contributors: ${contributors.length}`,
      `- Total cards: ${items.length}`,
      `- Total votes: ${totalVotes}`,
      `- Action points: ${actionPoints}`,
      `- Most active lane: ${busiestColumnName}`,
      `- Top contributor: ${topContributor}`,
      topItem ? `- Most voted item: ${topItem.message}` : "- Most voted item: None yet",
    ].join("\n"),
  };
}

function RetroInsights({ items, settings }) {
  const [copyState, setCopyState] = useState("Copy recap");
  const summary = useMemo(() => buildSummary(items, settings), [items, settings]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary.markdown);
      setCopyState("Copied");
      window.setTimeout(() => setCopyState("Copy recap"), 2000);
    } catch (error) {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState("Copy recap"), 2000);
    }
  }

  return (
    <Card className="panel-card">
      <Card.Header>Retro insights</Card.Header>
      <Card.Body>
        <div className="insights-grid">
          <div className="insight-stat">
            <strong>{items.length}</strong>
            <span>Ideas captured</span>
          </div>
          <div className="insight-stat">
            <strong>{summary.totalVotes}</strong>
            <span>Total votes</span>
          </div>
          <div className="insight-stat">
            <strong>{summary.actionPoints}</strong>
            <span>Action points</span>
          </div>
          <div className="insight-stat">
            <strong>{summary.contributors}</strong>
            <span>Contributors</span>
          </div>
        </div>

        <div className="insight-story">
          <h4>Facilitator readout</h4>
          <p>
            {summary.topItem
              ? `The loudest signal right now is "${summary.topItem.message}" with ${summary.topItem.votes} votes.`
              : "Start collecting items and votes to generate a live readout."}
          </p>
          <p>
            The conversation is currently most active in <strong>{summary.busiestColumnName}</strong>,
            and <strong>{summary.topContributor}</strong> has contributed the most items.
          </p>
        </div>

        <Button variant="info" size="sm" onClick={handleCopy}>
          {copyState}
        </Button>
      </Card.Body>
    </Card>
  );
}

export default RetroInsights;
