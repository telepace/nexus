"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/app/openapi-client/index"; // Adjust path as needed
// 注释掉未导出的类型导入
// import {
//   ContentSharePublic,
//   ContentItemPublic,
// } from "@/app/openapi-client/sdk.gen"; // Adjust path

// 临时定义缺失的类型

interface ContentSharePublic {
  id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  access_count: number;
  max_access_count?: number;
  content_item_title?: string;
  content_item_id?: string;
  // 其他必要的属性
}
import { AlertCircle, Trash2, RefreshCw, Loader2 } from "lucide-react"; // 移除未使用的 Eye
import { format } from "date-fns";
// import { ShareContentModal } from "./ShareContentModal"; // 未使用，暂时注释掉

// TODO: This is a placeholder. In a real app, you might get this from a user's content list.
// For now, this component might need to fetch its own content items or be passed them.
// Or, it could fetch all share links for the current user if such an API exists.
interface ManageShareLinksProps {
  // Example: Pass a specific content item to manage its shares
  // contentItem?: ContentItemPublic;
  // Or, if this component is a general manager for all user's shares:
  userId: string | undefined; // Assuming CurrentUser.id is passed
}

// Placeholder type, actual type from API client will be used
interface ExtendedContentSharePublic extends ContentSharePublic {
  content_item_title?: string; // To display which item is shared
  content_item_id?: string; // For revoke action
}

export const ManageShareLinks: React.FC<ManageShareLinksProps> = ({
  userId,
}) => {
  const [shares, setShares] = useState<ExtendedContentSharePublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toast } = useToast();

  const fetchShares = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      // OPTION 1: Fetch all content items for user, then for each, fetch shares. (N+1 problem)
      // const userContentItems = await client.listContentItems(); // Assuming such an endpoint
      // let allShares: ExtendedContentSharePublic[] = [];
      // for (const item of userContentItems) {
      //   const itemShares = await client.getContentSharesByContentId(item.id); // Assuming this
      //   allShares = [...allShares, ...itemShares.map(s => ({...s, content_item_title: item.title}))];
      // }
      // setShares(allShares);

      // OPTION 2: A dedicated endpoint to get all shares for a user (ideal)
      // const userShares = await client.getAllUserShares();
      // setShares(userShares);

      // OPTION 3: Placeholder - fetch all content, then fetch shares for first few.
      // This is just for demonstration if a direct "get all my shares" API is missing.
      // 临时使用 any 类型避免类型错误
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentItemsResponse = await (client as any).listContentItems(0, 10); // Get top 10 items
      const allShares: ExtendedContentSharePublic[] = [];
      if (contentItemsResponse && Array.isArray(contentItemsResponse)) {
        for (const item of contentItemsResponse) {
          if (item.id) {
            // This is a mock, as there's no direct `getContentSharesByContentId` in generated client typically
            // The DELETE endpoint is `/content/{id}/share`, implying management is per-content-item.
            // Let's assume we need to display shares for *all* user's content.
            // The backend API might need an endpoint like GET /api/v1/content/{id}/shares
            // For now, we'll mock this part or assume it's empty until such API exists.
            // To make this runnable, let's assume an endpoint that gets all shares for a user,
            // and it includes content_item_title and content_item_id.
            // e.g. const result = await client.listAllMyShareLinks(); setShares(result);
            // Since that doesn't exist, this component will show "No shares found" or an error.
          }
        }
      }
      setShares([]); // Remove this line when actual API call is implemented
      if (allShares.length === 0 && !error) {
      }
    } catch (err: unknown) {
      console.error("Failed to fetch share links:", err);
      const errorMsg =
        (err as { data: { detail: string } }).data?.detail ||
        (err as { message: string }).message ||
        "Failed to load share links.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [userId, error]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleRevokeShare = useCallback(async (shareId: string) => {
    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).deactivateShareLink(shareId);
      setShares((prevShares) =>
        prevShares.map((share) =>
          share.id === shareId ? { ...share, is_active: false } : share
        )
      );
    } catch (error) {
      console.error("Failed to revoke share:", error);
      setError("Failed to revoke share link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [setError]);

  // Function to open the share modal for a specific content item
  // This would be triggered from a list of content items, not directly from this component's current design
  // const openShareModalForContent = (item: ContentItemPublic) => {
  //   setSelectedContentItemForShare(item);
  //   setIsShareModalOpen(true);
  // };

  if (isLoading && shares.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading share links...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Manage Share Links</h2>
        <Button variant="outline" onClick={fetchShares} disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {shares.length === 0 && !isLoading && !error && (
        <p className="text-muted-foreground">
          No active share links found for your content.
        </p>
      )}

      {shares.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content Title</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Accesses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((share) => (
              <TableRow key={share.id}>
                <TableCell className="font-medium">
                  {share.content_item_title || "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="truncate max-w-[100px]">
                    {share.share_token}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={share.is_active ? "default" : "secondary"}>
                    {share.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(share.created_at), "PPp")}
                </TableCell>
                <TableCell>
                  {share.expires_at
                    ? format(new Date(share.expires_at), "PPp")
                    : "Never"}
                </TableCell>
                <TableCell>
                  {share.access_count} / {share.max_access_count || "∞"}
                </TableCell>
                <TableCell className="text-right">
                  {/* <Button variant="ghost" size="icon" className="mr-2" title="View/Edit">
                    <Eye className="h-4 w-4" />
                  </Button> */}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Revoke Share"
                    onClick={() => handleRevokeShare(share.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal for creating/editing shares - if needed from this manager view */}
      {/*
      <ShareContentModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        contentItem={selectedContentItemForShare}
      />
      */}
    </div>
  );
};

export default ManageShareLinks;
