import { SetupContent } from "@/components/setup/SetupContent";
import { getAuthState } from "@/lib/server-auth";
import { redirect as serverRedirect } from "next/navigation";
import { useRouter, useSearchParams } from "next/navigation"; // For client component
import { useEffect, useState, Suspense, ReactNode } from "react"; // For client component

// Make ExtensionAccessGuard a client component by placing "use client" here
// or ensure the file is treated as a client module if all components within are client components.
// For this case, let's make it explicit.

function ExtensionAccessGuardInternal({ children }: { children: ReactNode }) {
  "use client"; // This directive makes this component and any hooks it uses client-side

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const extensionCallback = searchParams.get("extension_callback");
    if (extensionCallback !== "true") {
      router.push("/dashboard");
    } else {
      setIsVerified(true);
    }
  }, [router, searchParams]);

  if (!isVerified) {
    // Return a loader or null. Using a more explicit loader.
    return <div>Verifying access...</div>;
  }

  return <>{children}</>;
}

// This is a simple wrapper to ensure Suspense is used correctly with useSearchParams
function ExtensionAccessGuard({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading page details...</div>}>
      <ExtensionAccessGuardInternal>{children}</ExtensionAccessGuardInternal>
    </Suspense>
  );
}


// This component renders the actual content of the page.
// It's a simple functional component, can be rendered by Server or Client components.
function PageView() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="w-full max-w-4xl text-center mb-8">
        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">
          This page is for setting up the browser extension.
        </p>
        <h1 className="text-3xl font-bold tracking-tight">设置向导</h1>
        <p className="text-muted-foreground mt-2">
          完成几个简单步骤，开始使用 Nexus
        </p>
        <p className="text-muted-foreground mt-4">
          Follow the steps below to configure the extension.
        </p>
      </div>
      <SetupContent />
    </main>
  );
}

/**
 * Handles the setup page logic, including user authentication and redirection.
 * This is a Server Component.
 */
export default async function SetupPage() {
  // Server-side checks:
  const authState = await getAuthState();

  if (!authState.isAuthenticated) {
    serverRedirect("/login?callbackUrl=/setup");
  }

  if (authState.user?.is_setup_complete === true) {
    serverRedirect("/dashboard");
  }

  // If server checks pass, render the page content wrapped by the client-side guard
  return (
    <ExtensionAccessGuard>
      <PageView />
    </ExtensionAccessGuard>
  );
}
