import { ReactNode } from "react";
import MainLayout from "@/components/layout/MainLayout";

export default function CustomersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MainLayout pageTitle="Customers">{children}</MainLayout>;
}
