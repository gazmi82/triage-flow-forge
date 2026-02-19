import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesignerCanvas } from "@/components/designer/DesignerCanvas";

const screenToFlowPosition = vi.fn(({ x, y }: { x: number; y: number }) => ({ x, y }));

interface MockReactFlowProps {
  children?: React.ReactNode;
  onInit?: (instance: { screenToFlowPosition: typeof screenToFlowPosition }) => void;
  onDrop?: (event: {
    preventDefault: () => void;
    clientX: number;
    clientY: number;
    dataTransfer: { getData: (key: string) => string };
  }) => void;
  onDragOver?: (event: { preventDefault: () => void; dataTransfer: { dropEffect: string } }) => void;
  nodes: unknown[];
}

vi.mock("@xyflow/react", async () => {
  const React = await import("react");

  const ReactFlow = ({ children, onInit, onDrop, onDragOver, nodes }: MockReactFlowProps) => {
    React.useEffect(() => {
      onInit?.({ screenToFlowPosition });
    }, [onInit]);

    return (
      <div data-testid="react-flow" onDrop={onDrop} onDragOver={onDragOver}>
        <span data-testid="node-count">{nodes.length}</span>
        <button
          data-testid="trigger-drop"
          onClick={() =>
            onDrop?.({
              preventDefault: () => {},
              clientX: 240,
              clientY: 180,
              dataTransfer: {
                getData: (key: string) => {
                  if (key === "application/bpmn-node-type") return "userTask";
                  if (key === "application/bpmn-node-label") return "New Task";
                  return "";
                },
              },
            })
          }
        >
          drop
        </button>
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
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = React.useState(initial);
      return [nodes, setNodes, vi.fn()];
    },
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = React.useState(initial);
      return [edges, setEdges, vi.fn()];
    },
  };
});

describe("DesignerCanvas", () => {
  beforeEach(() => {
    screenToFlowPosition.mockClear();
  });

  it("converts drop coordinates using screenToFlowPosition", () => {
    render(<DesignerCanvas />);
    expect(screen.getByTestId("node-count")).toHaveTextContent("10");

    fireEvent.click(screen.getByTestId("trigger-drop"));

    expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 240, y: 180 });
    expect(screen.getByTestId("node-count")).toHaveTextContent("11");
  });
});
