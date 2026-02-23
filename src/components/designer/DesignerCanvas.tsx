import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_TYPES } from "./BpmnNodes";
import { DesignerToolbar } from "./DesignerToolbar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  bootstrapWorkflowThunk,
} from "@/store/slices/workflowSlice";

export function DesignerCanvas() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector((state) => state.workflow.designerNodes) as Node[];
  const edges = useAppSelector((state) => state.workflow.designerEdges);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const renderedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: "smoothstep",
        pathOptions: {
          borderRadius: 0,
          offset: 28,
        },
      })),
    [edges]
  );

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <DesignerToolbar />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={renderedEdges}
            nodeTypes={NODE_TYPES}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            className="h-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(218,22%,85%)" />
            <Controls />
            <MiniMap
              bgColor="hsl(210, 20%, 98%)"
              maskColor="rgba(15, 23, 42, 0.12)"
              nodeColor={(n) => {
                const nodeType = String(n.type ?? "");
                if (nodeType === "startEvent") return "hsl(142,60%,36%)";
                if (nodeType === "endEvent") return "hsl(4,86%,48%)";
                if (nodeType === "userTask") return "hsl(220,68%,30%)";
                if (nodeType === "xorGateway") return "hsl(38,90%,48%)";
                if (nodeType === "andGateway") return "hsl(278,60%,48%)";
                if (nodeType === "timerEvent") return "hsl(208,80%,46%)";
                return "hsl(178,55%,38%)";
              }}
              nodeStrokeColor={(n) => {
                const nodeType = String(n.type ?? "");
                if (nodeType === "startEvent") return "hsl(142,70%,24%)";
                if (nodeType === "endEvent") return "hsl(4,90%,36%)";
                return "hsl(220,30%,20%)";
              }}
              nodeStrokeWidth={2}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
