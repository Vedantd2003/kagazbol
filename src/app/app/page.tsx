import type { Metadata } from "next";
import { Workspace } from "@/components/app/Workspace";

export const metadata: Metadata = { title: "KagazBol — Your document" };

export default function AppPage() {
  return <Workspace />;
}
