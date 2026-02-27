import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, Mail, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TASK_PORT_PERCENTS = [16, 33, 50, 67, 84];

// ── Start Event ───────────────────────────────────────────────────────────────
export function StartEventNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full border-4 border-node-start bg-node-start/10 transition-shadow",
      selected && "ring-2 ring-node-start ring-offset-2",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <div className="h-4 w-4 rounded-full bg-node-start" />
      <Handle id="right" type="source" position={Position.Right} className="!bg-node-start !border-node-start" />
      {data.label && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground">
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

// ── End Event ─────────────────────────────────────────────────────────────────
export function EndEventNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full border-4 border-node-end bg-node-end/10 transition-shadow",
      selected && "ring-2 ring-node-end ring-offset-2",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <div className="h-5 w-5 rounded-full bg-node-end" />
      <Handle id="left" type="target" position={Position.Left} className="!bg-node-end !border-node-end" />
      {data.label && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground">
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

// ── User Task ─────────────────────────────────────────────────────────────────
export function UserTaskNode({ data, selected }: NodeProps) {
  const taskStatus = String(data.taskStatus || "pending");
  const runtimeActive = data.runtimeActive === true;
  const statusClass =
    taskStatus === "completed"
      ? "bg-success/15 text-success border-success/30"
      : taskStatus === "claimed"
        ? "bg-accent/15 text-accent border-accent/30"
        : "bg-info/15 text-info border-info/30";

  return (
    <div className={cn(
      "user-task-node relative flex min-w-[140px] flex-col rounded-md border-2 border-node-task bg-card shadow-sm transition-shadow",
      selected && "ring-2 ring-node-task ring-offset-2 shadow-md",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <div className="flex items-center gap-1.5 rounded-t-md bg-node-task/10 px-3 py-1.5 border-b border-node-task/30">
        <User className="h-3 w-3 text-node-task flex-shrink-0" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-node-task">User Task</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-foreground leading-tight">{String(data.label || "Task")}</p>
        {data.role && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{String(data.role)}</p>
        )}
        <span className={cn("mt-1 inline-flex rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase", statusClass)}>
          {taskStatus}
        </span>
        {runtimeActive && (
          <span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-success align-middle" />
        )}
      </div>
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-left-t-${idx}`}
          id={`left-${idx + 1}`}
          type="target"
          position={Position.Left}
          style={{ top: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-right-t-${idx}`}
          id={`right-${idx + 1}`}
          type="target"
          position={Position.Right}
          style={{ top: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-top-t-${idx}`}
          id={`top-${idx + 1}`}
          type="target"
          position={Position.Top}
          style={{ left: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-bottom-t-${idx}`}
          id={`bottom-${idx + 1}`}
          type="target"
          position={Position.Bottom}
          style={{ left: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-left-s-${idx}`}
          id={`left-${idx + 1}`}
          type="source"
          position={Position.Left}
          style={{ top: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-right-s-${idx}`}
          id={`right-${idx + 1}`}
          type="source"
          position={Position.Right}
          style={{ top: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-top-s-${idx}`}
          id={`top-${idx + 1}`}
          type="source"
          position={Position.Top}
          style={{ left: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {TASK_PORT_PERCENTS.map((pct, idx) => (
        <Handle
          key={`task-bottom-s-${idx}`}
          id={`bottom-${idx + 1}`}
          type="source"
          position={Position.Bottom}
          style={{ left: `${pct}%` }}
          className="!bg-node-task !border-node-task"
        />
      ))}
      {/* Backward compatibility for existing edges persisted with legacy side-only handle IDs. */}
      <Handle id="left" type="target" position={Position.Left} className="!bg-node-task !border-node-task" />
      <Handle id="top" type="target" position={Position.Top} className="!bg-node-task !border-node-task" />
      <Handle id="bottom" type="target" position={Position.Bottom} className="!bg-node-task !border-node-task" />
      <Handle id="right" type="target" position={Position.Right} className="!bg-node-task !border-node-task" />
      <Handle id="left" type="source" position={Position.Left} className="!bg-node-task !border-node-task" />
      <Handle id="top" type="source" position={Position.Top} className="!bg-node-task !border-node-task" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-node-task !border-node-task" />
      <Handle id="right" type="source" position={Position.Right} className="!bg-node-task !border-node-task" />
    </div>
  );
}

// ── XOR Gateway ───────────────────────────────────────────────────────────────
export function XorGatewayNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className="relative flex h-12 w-12 items-center justify-center" style={{ transform: "rotate(45deg)" }}>
      <div className={cn(
        "h-full w-full border-2 border-node-gateway-xor bg-node-gateway-xor/10 transition-shadow",
        selected && "ring-2 ring-node-gateway-xor ring-offset-2",
        runtimeActive && "ring-2 ring-success ring-offset-2"
      )} />
      <span className="absolute text-base font-bold text-node-gateway-xor" style={{ transform: "rotate(-45deg)" }}>✕</span>
      <Handle id="left" type="target" position={Position.Left} style={{ transform: "rotate(-45deg) translate(-8px, 0)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle id="top" type="target" position={Position.Top} style={{ transform: "rotate(-45deg) translate(0, -8px)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ transform: "rotate(-45deg) translate(0, 8px)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle id="right" type="target" position={Position.Right} style={{ transform: "rotate(-45deg) translate(8px, 0)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle id="right" type="source" position={Position.Right} style={{ transform: "rotate(-45deg) translate(8px, 0)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle id="left" type="source" position={Position.Left} style={{ transform: "rotate(-45deg) translate(-8px, 0)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ transform: "rotate(-45deg) translate(0, 8px)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      <Handle type="source" id="top" position={Position.Top} style={{ transform: "rotate(-45deg) translate(0, -8px)" }} className="!bg-node-gateway-xor !border-node-gateway-xor" />
      {data.label && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground" style={{ transform: "rotate(-45deg) translateX(-50%)" }}>
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

// ── AND Gateway ───────────────────────────────────────────────────────────────
export function AndGatewayNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className="relative flex h-12 w-12 items-center justify-center" style={{ transform: "rotate(45deg)" }}>
      <div className={cn(
        "h-full w-full border-2 border-node-gateway-and bg-node-gateway-and/10 transition-shadow",
        selected && "ring-2 ring-node-gateway-and ring-offset-2",
        runtimeActive && "ring-2 ring-success ring-offset-2"
      )} />
      <span className="absolute text-lg font-bold text-node-gateway-and" style={{ transform: "rotate(-45deg)" }}>+</span>
      <Handle id="left" type="target" position={Position.Left} style={{ transform: "rotate(-45deg) translate(-8px, 0)" }} className="!bg-node-gateway-and !border-node-gateway-and" />
      <Handle id="top" type="target" position={Position.Top} style={{ transform: "rotate(-45deg) translate(0, -8px)" }} className="!bg-node-gateway-and !border-node-gateway-and" />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ transform: "rotate(-45deg) translate(0, 8px)" }} className="!bg-node-gateway-and !border-node-gateway-and" />
      <Handle id="right" type="target" position={Position.Right} style={{ transform: "rotate(-45deg) translate(8px, 0)" }} className="!bg-node-gateway-and !border-node-gateway-and" />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        style={{ transform: "rotate(-45deg) translate(8px, 0)" }}
        className="!bg-node-gateway-and !border-node-gateway-and"
      />
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        style={{ transform: "rotate(-45deg) translate(-8px, 0)" }}
        className="!bg-node-gateway-and !border-node-gateway-and"
      />
      <Handle
        type="source"
        id="top"
        position={Position.Top}
        style={{ transform: "rotate(-45deg) translate(0, -8px)" }}
        className="!bg-node-gateway-and !border-node-gateway-and"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        style={{ transform: "rotate(-45deg) translate(0, 8px)" }}
        className="!bg-node-gateway-and !border-node-gateway-and"
      />
    </div>
  );
}

// ── Timer Event ───────────────────────────────────────────────────────────────
export function TimerEventNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full border-2 border-node-timer bg-node-timer/10 transition-shadow",
      selected && "ring-2 ring-node-timer ring-offset-2",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <Clock className="h-5 w-5 text-node-timer" />
      <Handle type="target" position={Position.Left} className="!bg-node-timer !border-node-timer" />
      <Handle type="source" position={Position.Right} className="!bg-node-timer !border-node-timer" />
      {data.label && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground">
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

// ── Message Event ─────────────────────────────────────────────────────────────
export function MessageEventNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full border-2 border-node-message bg-node-message/10 transition-shadow",
      selected && "ring-2 ring-node-message ring-offset-2",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <Mail className="h-5 w-5 text-node-message" />
      <Handle type="target" position={Position.Left} className="!bg-node-message !border-node-message" />
      <Handle type="source" position={Position.Right} className="!bg-node-message !border-node-message" />
      {data.label && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground">
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

// ── Signal Event ──────────────────────────────────────────────────────────────
export function SignalEventNode({ data, selected }: NodeProps) {
  const runtimeActive = data.runtimeActive === true;
  return (
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full border-2 border-warning bg-warning/10 transition-shadow",
      selected && "ring-2 ring-warning ring-offset-2",
      runtimeActive && "ring-2 ring-success ring-offset-2"
    )}>
      <AlertCircle className="h-5 w-5 text-warning" />
      <Handle type="target" position={Position.Left} className="!bg-warning !border-warning" />
      <Handle type="source" position={Position.Right} className="!bg-warning !border-warning" />
      {data.label && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground">
          {String(data.label)}
        </div>
      )}
    </div>
  );
}

export const NODE_TYPES = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  userTask: UserTaskNode,
  xorGateway: XorGatewayNode,
  andGateway: AndGatewayNode,
  timerEvent: TimerEventNode,
  messageEvent: MessageEventNode,
  signalEvent: SignalEventNode,
};
