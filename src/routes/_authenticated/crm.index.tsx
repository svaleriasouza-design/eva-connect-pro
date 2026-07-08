import { createFileRoute } from "@tanstack/react-router";
import { CrmList } from "./crm";

export const Route = createFileRoute("/_authenticated/crm/")({ component: CrmList });