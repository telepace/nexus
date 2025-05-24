import MainLayout from "@/components/layout/MainLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout pageTitle="Dashboard">
      {children}
    </MainLayout>
  );
}
