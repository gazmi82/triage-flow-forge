import { DesignerCanvas } from "@/components/designer/DesignerCanvas";

export default function Designer() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-lg font-bold">Process Designer</h1>
        <p className="text-xs text-muted-foreground">Design and publish BPMN process definitions</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <DesignerCanvas />
      </div>
    </div>
  );
}
