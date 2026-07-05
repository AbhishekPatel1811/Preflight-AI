import { Gauge, ListChecks, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_NAME } from "@/lib/brand";

const previewItems = [
  {
    title: "Readiness overview",
    body: "Score, module health, and the strongest next recommendation.",
    icon: <Gauge className="h-4 w-4" aria-hidden="true" />
  },
  {
    title: "Fixes board",
    body: "P0, P1, and P2 lanes with the next work ordered clearly.",
    icon: <ScanSearch className="h-4 w-4" aria-hidden="true" />
  },
  {
    title: "Launch pack",
    body: "Plan, risks, owners, copy, and questions kept compact.",
    icon: <ListChecks className="h-4 w-4" aria-hidden="true" />
  }
];

export function PendingResultPreview({ isRunning = false }: { isRunning?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          {isRunning ? "Generating" : "Output preview"}
        </Badge>
        <CardTitle className="mt-3">
          {isRunning ? `Building your ${PRODUCT_NAME} report` : `Your ${PRODUCT_NAME} report will appear here`}
        </CardTitle>
        <CardDescription>
          {isRunning ? "The overview, fixes board, and launch pack are being assembled." : "Run a preflight to generate the overview, fixes board, and launch pack."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {previewItems.map((item) => (
            <article key={item.title} className="rounded-lg border border-dashed border-border bg-muted p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-info">{item.icon}</span>
              <h3 className="mt-4 text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
