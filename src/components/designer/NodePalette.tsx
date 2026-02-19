const PALETTE_ITEMS = [
  { type: "startEvent", label: "Start Event", color: "bg-node-start/15 border-node-start/40 text-node-start", dot: "bg-node-start" },
  { type: "endEvent", label: "End Event", color: "bg-node-end/15 border-node-end/40 text-node-end", dot: "bg-node-end" },
  { type: "userTask", label: "User Task", color: "bg-node-task/10 border-node-task/40 text-node-task", dot: "bg-node-task" },
  { type: "xorGateway", label: "XOR Gateway", color: "bg-node-gateway-xor/15 border-node-gateway-xor/40 text-node-gateway-xor", dot: "bg-node-gateway-xor" },
  { type: "andGateway", label: "AND Gateway", color: "bg-node-gateway-and/10 border-node-gateway-and/40 text-node-gateway-and", dot: "bg-node-gateway-and" },
  { type: "timerEvent", label: "Timer Event", color: "bg-node-timer/15 border-node-timer/40 text-node-timer", dot: "bg-node-timer" },
  { type: "messageEvent", label: "Message Event", color: "bg-node-message/15 border-node-message/40 text-node-message", dot: "bg-node-message" },
  { type: "signalEvent", label: "Signal Event", color: "bg-warning/15 border-warning/40 text-warning", dot: "bg-warning" },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, type: string, label: string) => {
    event.dataTransfer.setData("application/bpmn-node-type", type);
    event.dataTransfer.setData("application/bpmn-node-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex w-52 flex-col border-r border-border bg-card overflow-y-auto">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">BPMN Elements</p>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Events</p>
        {PALETTE_ITEMS.filter(i => i.type.includes("Event")).map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className={`flex cursor-grab items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 active:cursor-grabbing ${item.color}`}
          >
            <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.dot}`} />
            {item.label}
          </div>
        ))}

        <p className="mt-3 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Tasks</p>
        {PALETTE_ITEMS.filter(i => i.type.includes("Task")).map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className={`flex cursor-grab items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 active:cursor-grabbing ${item.color}`}
          >
            <div className={`h-2.5 w-2.5 rounded flex-shrink-0 ${item.dot}`} />
            {item.label}
          </div>
        ))}

        <p className="mt-3 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Gateways</p>
        {PALETTE_ITEMS.filter(i => i.type.includes("Gateway")).map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className={`flex cursor-grab items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 active:cursor-grabbing ${item.color}`}
          >
            <div className={`h-3 w-3 rotate-45 flex-shrink-0 ${item.dot}`} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-border p-3">
        <p className="text-[10px] text-muted-foreground">Drag elements onto the canvas</p>
      </div>
    </div>
  );
}
