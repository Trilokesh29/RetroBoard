import React from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

function BoardToolbar({
  filters,
  onFiltersChange,
  selectedTemplateId,
  templates,
  onTemplateChange,
  onApplyTemplate,
}) {
  return (
    <div className="toolbar-grid">
      <div className="toolbar-card">
        <div className="toolbar-title">Focus board</div>
        <InputGroup>
          <Form.Control
            value={filters.query}
            onChange={(event) => onFiltersChange({ query: event.target.value })}
            placeholder="Search comments, authors, or action points"
          />
        </InputGroup>
        <div className="toolbar-inline">
          <Form.Control
            as="select"
            value={filters.scope}
            onChange={(event) => onFiltersChange({ scope: event.target.value })}
          >
            <option value="all">All cards</option>
            <option value="mine">My cards</option>
            <option value="voted">Cards with votes</option>
          </Form.Control>
          <Form.Control
            as="select"
            value={filters.column}
            onChange={(event) => onFiltersChange({ column: event.target.value })}
          >
            <option value="all">All columns</option>
            <option value="Good">Column 1</option>
            <option value="Bad">Column 2</option>
            <option value="Ugly">Column 3</option>
          </Form.Control>
        </div>
        <Form.Check
          type="switch"
          id="action-ready-filter"
          label="Show only cards with action points"
          checked={filters.actionOnly}
          onChange={(event) => onFiltersChange({ actionOnly: event.target.checked })}
          style={{ marginTop: 12 }}
        />
      </div>

      <div className="toolbar-card">
        <div className="toolbar-title">Switch retro format</div>
        <Form.Control
          as="select"
          value={selectedTemplateId}
          onChange={(event) => onTemplateChange(event.target.value)}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Form.Control>
        <p className="toolbar-copy">
          {templates.find((template) => template.id === selectedTemplateId)?.description}
        </p>
        <Button variant="secondary" onClick={onApplyTemplate}>
          Apply template
        </Button>
      </div>
    </div>
  );
}

export default BoardToolbar;
