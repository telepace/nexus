import MainLayout from "@/components/layout/MainLayout";

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout pageTitle="Favorites">{children}</MainLayout>;
}
