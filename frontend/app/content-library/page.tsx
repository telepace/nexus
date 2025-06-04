"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  FileText,
  Link,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";

// Define the ContentItemPublic type based on backend schema
interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title?: string | null;
  summary?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

// Content type icons mapping
const getContentIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "url":
      return <Link className="h-4 w-4" />;
    case "text":
      return <BookOpen className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// Status badge variant mapping
const getStatusVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "pending":
      return "secondary";
    case "processing":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function ContentLibraryPage() {
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(
    null,
  );

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Handle Open Reader
  const handleOpenReader = (item: ContentItemPublic) => {
    router.push(`/content-library/reader/${item.id}`);
  };

  // Handle Download
  const handleDownload = async (item: ContentItemPublic) => {
    try {
      const token = user?.token || getCookie("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/content/${item.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.title || "content"}.${item.type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      // You could add a toast notification here
    }
  };

  useEffect(() => {
    // Wait for auth to complete
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);

        // Get token from user object or cookie
        const token = user?.token || getCookie("accessToken");

        if (!token) {
          setError("No authentication token found. Please log in again.");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Use the correct API endpoint with authentication
        const response = await fetch(`${apiUrl}/api/v1/content/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Authentication failed. Please log in again.");
            router.push("/login");
            return;
          }

          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        setItems(data);
      } catch (e: unknown) {
        console.error("Error fetching content items:", e);
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred while fetching content items.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [user, authLoading, router]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <MainLayout pageTitle="Content Library">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show loading while fetching content
  if (loading) {
    return (
      <MainLayout pageTitle="Content Library">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading content library...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout pageTitle="Content Library">
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Content Library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content Library</h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content List */}
          <div className="lg:col-span-2">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No content found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your content library by adding your first
                      item
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-muted/30 ${
                      selectedItem?.id === item.id
                        ? "ring-1 ring-primary shadow-md"
                        : ""
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <CardContent className="py-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3 rounded-lg">
                            {getContentIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate mb-2">
                              {item.title || "Untitled"}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {item.summary || "No summary available"}
                            </p>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={getStatusVariant(
                                  item.processing_status,
                                )}
                              >
                                {item.processing_status}
                              </Badge>
                              <Badge variant="outline">
                                {item.type.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Content Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 py-6">
              <CardHeader>
                <CardTitle>Content Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 text-lg">
                        {selectedItem.title || "Untitled"}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        {getContentIcon(selectedItem.type)}
                        <Badge variant="outline">
                          {selectedItem.type.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={getStatusVariant(
                            selectedItem.processing_status,
                          )}
                        >
                          {selectedItem.processing_status}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Summary
                        </label>
                        <p className="text-sm mt-1 leading-relaxed">
                          {selectedItem.summary || "No summary available"}
                        </p>
                      </div>

                      {selectedItem.source_uri && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Source
                          </label>
                          <p className="text-sm mt-1 break-all">
                            <a
                              href={selectedItem.source_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {selectedItem.source_uri}
                            </a>
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="text-muted-foreground">
                            Created
                          </label>
                          <p>
                            {new Date(
                              selectedItem.created_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">
                            Updated
                          </label>
                          <p>
                            {new Date(
                              selectedItem.updated_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={() => handleOpenReader(selectedItem)}
                        disabled={
                          selectedItem.processing_status !== "completed"
                        }
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Open Reader
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleDownload(selectedItem)}
                        disabled={
                          selectedItem.processing_status !== "completed"
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Select a content item to preview
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
