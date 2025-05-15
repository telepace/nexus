import { ReactNode } from "react";

export default function CustomersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="customers-layout">{children}</div>;
}
