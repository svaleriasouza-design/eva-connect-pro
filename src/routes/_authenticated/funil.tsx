import { createFileRoute } from "@tanstack/react-router";
import { FUNNEL_STAGES, PRESALE_STAGES, SALES_STAGES } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban-board";

export const Route = createFileRoute("/_authenticated/funil")({ component: Funil });

function Funil() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Funil</h1>
        <p className="text-sm text-muted-foreground">
          Arraste os cartões entre as etapas. Mover um cartão só organiza o quadro — nenhum
          disparo é feito automaticamente.
        </p>
      </div>

      <Tabs defaultValue="funil">
        <TabsList>
          <TabsTrigger value="funil">Funil (atual)</TabsTrigger>
          <TabsTrigger value="prevenda">Pré-venda</TabsTrigger>
          <TabsTrigger value="venda">Venda</TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="mt-4">
          <KanbanBoard
            field="funnel_stage"
            stages={FUNNEL_STAGES}
            queryKey="funil-por-etapa"
            includeUnset={false}
          />
        </TabsContent>

        <TabsContent value="prevenda" className="mt-4">
          <KanbanBoard field="presale_stage" stages={PRESALE_STAGES} queryKey="funil-prevenda" />
        </TabsContent>

        <TabsContent value="venda" className="mt-4">
          <KanbanBoard field="sales_stage" stages={SALES_STAGES} queryKey="funil-venda" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
