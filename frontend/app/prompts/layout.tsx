import { ReactNode } from "react";
import MainLayout from "@/components/layout/MainLayout";

export default function PromptsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MainLayout pageTitle="Prompt Library">{children}</MainLayout>;
}
