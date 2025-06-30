export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
} 