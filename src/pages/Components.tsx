import { useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { NodePalette } from "@/components/designer/NodePalette";
import { PropertiesPanel } from "@/components/designer/PropertiesPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ComponentGroup = "designer" | "ui";

interface UnusedComponentRecord {
  name: string;
  path: string;
  group: ComponentGroup;
}

const CHART_DATA = [
  { name: "Mon", value: 12 },
  { name: "Tue", value: 19 },
  { name: "Wed", value: 7 },
  { name: "Thu", value: 15 },
];

const CHART_CONFIG: ChartConfig = {
  value: {
    label: "Items",
    color: "hsl(var(--primary))",
  },
};

function AlertDialogPreview() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">Open Alert Dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete draft?</AlertDialogTitle>
          <AlertDialogDescription>This is a static preview dialog.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CalendarPreview() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />;
}

function CollapsiblePreview() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">Toggle Details</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-xs text-muted-foreground">Hidden content area inside Collapsible.</CollapsibleContent>
    </Collapsible>
  );
}

function DrawerPreview() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer Preview</DrawerTitle>
          <DrawerDescription>Vaul-based bottom drawer component.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button size="sm">Confirm</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function FormPreview() {
  return (
    <div className="space-y-2">
      <Label htmlFor="components-form-preview">Sample Input</Label>
      <Input id="components-form-preview" placeholder="Form primitive preview" />
    </div>
  );
}

function PopoverPreview() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">Popover content preview.</p>
      </PopoverContent>
    </Popover>
  );
}

function PropertiesPanelPreview() {
  const [node, setNode] = useState<Node | null>({
    id: "sample-user-task",
    type: "userTask",
    position: { x: 120, y: 80 },
    data: { label: "Capture Vitals", role: "Triage Nurse" },
  } as Node);

  return (
    <div className="h-[360px] overflow-hidden rounded-md border">
      <PropertiesPanel
        node={node}
        onLabelChange={(id, label) => setNode((prev) => (prev && prev.id === id ? ({ ...prev, data: { ...prev.data, label } } as Node) : prev))}
        onRoleChange={(id, role) => setNode((prev) => (prev && prev.id === id ? ({ ...prev, data: { ...prev.data, role } } as Node) : prev))}
        onTypeChange={(id, type) => setNode((prev) => (prev && prev.id === id ? ({ ...prev, type } as Node) : prev))}
      />
    </div>
  );
}

function UnusedPreview({ name }: { name: string }) {
  if (name === "NodePalette") return <div className="h-[360px] overflow-hidden rounded-md border"><NodePalette /></div>;
  if (name === "PropertiesPanel") return <PropertiesPanelPreview />;
  if (name === "AlertDialog") return <AlertDialogPreview />;
  if (name === "Alert") {
    return (
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Default alert body preview.</AlertDescription>
      </Alert>
    );
  }
  if (name === "Breadcrumb") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Components</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  if (name === "Calendar") return <CalendarPreview />;
  if (name === "Chart") {
    return (
      <ChartContainer config={CHART_CONFIG} className="h-[180px] w-full">
        <BarChart accessibilityLayer data={CHART_DATA}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ChartContainer>
    );
  }
  if (name === "Collapsible") return <CollapsiblePreview />;
  if (name === "Command") {
    return (
      <Command className="rounded-md border">
        <CommandInput placeholder="Type a command..." />
        <CommandList>
          <CommandGroup heading="Quick Actions">
            <CommandItem>Open Designer</CommandItem>
            <CommandItem>Go to Tasks</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }
  if (name === "ContextMenu") {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="rounded-md border border-dashed p-4 text-sm">Right click this box</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Menu</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem>Open</ContextMenuItem>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
  if (name === "Drawer") return <DrawerPreview />;
  if (name === "Form") return <FormPreview />;
  if (name === "HoverCard") {
    return (
      <HoverCard>
        <HoverCardTrigger asChild><Button variant="link" className="px-0">Hover me</Button></HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm">Hover card content preview.</p>
        </HoverCardContent>
      </HoverCard>
    );
  }
  if (name === "Pagination") {
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
          <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationNext href="#" /></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }
  if (name === "Popover") return <PopoverPreview />;
  if (name === "Progress") return <Progress value={62} />;
  if (name === "Resizable") {
    return (
      <div className="h-28 rounded-md border">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50}><div className="flex h-full items-center justify-center text-xs">Left</div></ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}><div className="flex h-full items-center justify-center text-xs">Right</div></ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }
  if (name === "Table") {
    return (
      <Table>
        <TableCaption>Sample rows</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Task A</TableCell>
            <TableCell>Open</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Task B</TableCell>
            <TableCell>Closed</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }
  return <p className="text-xs text-muted-foreground">Non-visual helper; no direct UI preview.</p>;
}

const UNUSED_COMPONENTS: UnusedComponentRecord[] = [
  { name: "NodePalette", path: "src/components/designer/NodePalette.tsx", group: "designer" },
  { name: "PropertiesPanel", path: "src/components/designer/PropertiesPanel.tsx", group: "designer" },
  { name: "AlertDialog", path: "src/components/ui/alert-dialog.tsx", group: "ui" },
  { name: "Alert", path: "src/components/ui/alert.tsx", group: "ui" },
  { name: "Breadcrumb", path: "src/components/ui/breadcrumb.tsx", group: "ui" },
  { name: "Calendar", path: "src/components/ui/calendar.tsx", group: "ui" },
  { name: "Chart", path: "src/components/ui/chart.tsx", group: "ui" },
  { name: "Collapsible", path: "src/components/ui/collapsible.tsx", group: "ui" },
  { name: "Command", path: "src/components/ui/command.tsx", group: "ui" },
  { name: "ContextMenu", path: "src/components/ui/context-menu.tsx", group: "ui" },
  { name: "Drawer", path: "src/components/ui/drawer.tsx", group: "ui" },
  { name: "Form", path: "src/components/ui/form.tsx", group: "ui" },
  { name: "HoverCard", path: "src/components/ui/hover-card.tsx", group: "ui" },
  { name: "Pagination", path: "src/components/ui/pagination.tsx", group: "ui" },
  { name: "Popover", path: "src/components/ui/popover.tsx", group: "ui" },
  { name: "Progress", path: "src/components/ui/progress.tsx", group: "ui" },
  { name: "Resizable", path: "src/components/ui/resizable.tsx", group: "ui" },
  { name: "Table", path: "src/components/ui/table.tsx", group: "ui" },
  { name: "useToast (UI helper)", path: "src/components/ui/use-toast.ts", group: "ui" },
];

export default function Components() {
  const [activeGroup, setActiveGroup] = useState<ComponentGroup | "all">("all");

  const components = useMemo(
    () => UNUSED_COMPONENTS.filter((component) => activeGroup === "all" || component.group === activeGroup),
    [activeGroup],
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Live Preview</Badge>
            <Badge variant="secondary">Admin Only</Badge>
          </div>
          <CardTitle>Unused Components Gallery</CardTitle>
          <CardDescription>Rendered previews of currently unused components.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant={activeGroup === "all" ? "default" : "outline"} onClick={() => setActiveGroup("all")}>All</Button>
          <Button size="sm" variant={activeGroup === "ui" ? "default" : "outline"} onClick={() => setActiveGroup("ui")}>UI</Button>
          <Button size="sm" variant={activeGroup === "designer" ? "default" : "outline"} onClick={() => setActiveGroup("designer")}>Designer</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {components.map((component) => (
          <Card key={component.path} className="border-border/70">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{component.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{component.group}</Badge>
              </div>
              <CardDescription className="font-mono text-[11px]">{component.path}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/70 p-3">
                <UnusedPreview name={component.name} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
