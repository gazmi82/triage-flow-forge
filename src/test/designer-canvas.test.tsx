import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { DesignerCanvas } from "@/components/designer/DesignerCanvas";
import { createAppStore } from "@/store";

interface ReactFlowStubProps {
  children?: React.ReactNode;
  nodes: unknown[];
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  elementsSelectable?: boolean;
}

vi.mock("@xyflow/react", async () => {
  const ReactFlow = ({ children, nodes, nodesDraggable, nodesConnectable, elementsSelectable }: ReactFlowStubProps) => {
    return (
      <div
        data-testid="react-flow"
        data-draggable={String(nodesDraggable)}
        data-connectable={String(nodesConnectable)}
        data-selectable={String(elementsSelectable)}
      >
        <span data-testid="node-count">{nodes.length}</span>
        {children}
      </div>
    );
  };

  return {
    ReactFlow,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    BackgroundVariant: { Dots: "Dots" },
    MarkerType: { ArrowClosed: "arrowclosed" },
    Handle: () => null,
    Position: { Left: "left", Right: "right", Bottom: "bottom" },
    addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
  };
});

describe("DesignerCanvas", () => {
  it("renders read-only flow state from store", async () => {
    const store = createAppStore();
    render(
      <Provider store={store}>
        <DesignerCanvas />
      </Provider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent("0");
    });
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-draggable", "false");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-connectable", "false");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-selectable", "false");
  });
});
