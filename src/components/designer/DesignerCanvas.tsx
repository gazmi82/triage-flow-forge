import { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type ReactFlowInstance,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_TYPES } from "./BpmnNodes";
import { NodePalette } from "./NodePalette";
import { PropertiesPanel } from "./PropertiesPanel";
import { DesignerToolbar } from "./DesignerToolbar";

const INITIAL_NODES: Node[] = [
  { id: "start1", type: "startEvent", position: { x: 80, y: 200 }, data: { label: "Patient Arrival" } },
  { id: "task1", type: "userTask", position: { x: 220, y: 175 }, data: { label: "Registration", role: "Reception" } },
  { id: "task2", type: "userTask", position: { x: 420, y: 175 }, data: { label: "Triage Assessment", role: "Triage Nurse" } },
  { id: "gw1", type: "xorGateway", position: { x: 620, y: 188 }, data: { label: "Severity?" } },
  { id: "task3", type: "userTask", position: { x: 730, y: 120 }, data: { label: "Fast Track", role: "Triage Nurse" } },
  { id: "task4", type: "userTask", position: { x: 730, y: 260 }, data: { label: "Physician Assessment", role: "Physician" } },
  { id: "timer1", type: "timerEvent", position: { x: 620, y: 350 }, data: { label: "SLA 30min" } },
  { id: "msg1", type: "messageEvent", position: { x: 880, y: 200 }, data: { label: "Lab Result" } },
  { id: "gw2", type: "andGateway", position: { x: 980, y: 190 }, data: { label: "" } },
  { id: "end1", type: "endEvent", position: { x: 1100, y: 200 }, data: { label: "Discharged" } },
];

const INITIAL_EDGES = [
  { id: "e1", source: "start1", target: "task1", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
  { id: "e2", source: "task1", target: "task2", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
  { id: "e3", source: "task2", target: "gw1", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
  { id: "e4", source: "gw1", target: "task3", label: "Minor", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(38,90%,48%)" } },
  { id: "e5", source: "gw1", target: "task4", label: "Critical", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(38,90%,48%)" } },
  { id: "e6", source: "timer1", target: "task4", label: "Escalate", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(208,80%,46%)", strokeDasharray: "4 4" } },
  { id: "e7", source: "task3", target: "gw2", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
  { id: "e8", source: "task4", target: "gw2", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
  { id: "e9", source: "msg1", target: "gw2", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(178,55%,38%)" } },
  { id: "e10", source: "gw2", target: "end1", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } },
];

export function DesignerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(220,68%,30%)" } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/bpmn-node-type");
      const label = event.dataTransfer.getData("application/bpmn-node-label");
      if (!type || !flowInstance) return;

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position: flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        data: { label },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [flowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, label } } : prev);
  }, [setNodes]);

  const updateNodeRole = useCallback((id: string, role: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, role } } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, role } } : prev);
  }, [setNodes]);

  const updateNodeType = useCallback((id: string, type: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, type } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, type } : prev);
  }, [setNodes]);

  return (
    <div className="flex h-full">
      {/* Left Palette */}
      <NodePalette />

      {/* Canvas */}
      <div className="flex flex-1 flex-col">
        <DesignerToolbar />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPES}
            fitView
            className="h-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(218,22%,85%)" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === "startEvent") return "hsl(142,60%,36%)";
                if (n.type === "endEvent") return "hsl(4,86%,48%)";
                if (n.type === "userTask") return "hsl(220,68%,30%)";
                if (n.type === "xorGateway") return "hsl(38,90%,48%)";
                if (n.type === "andGateway") return "hsl(278,60%,48%)";
                if (n.type === "timerEvent") return "hsl(208,80%,46%)";
                return "hsl(178,55%,38%)";
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right Properties */}
      <PropertiesPanel
        node={selectedNode}
        onLabelChange={updateNodeLabel}
        onRoleChange={updateNodeRole}
        onTypeChange={updateNodeType}
      />
    </div>
  );
}
