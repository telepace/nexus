"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, CopyIcon, Share2Icon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"; // Assuming useToast exists for sonner
// eslint-disable-next-line @typescript-eslint/no-require-imports
const copyToClipboard = require("copy-to-clipboard");
import { client } from "@/app/openapi-client/index";

// 临时定义缺失的类型
interface ContentItemPublic {
  id: string;
  title: string;
  content?: string;
  content_text?: string;
  user_id?: string;
  type?: string;
  processing_status?: string;
  created_at?: string;
  updated_at?: string;
}

interface ContentShareCreate {
  expires_at?: string;
  password?: string;
  max_access_count?: number | null;
}

interface ShareContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem: ContentItemPublic | null; // Assuming ContentItemPublic has id and title
}

export const ShareContentModal: React.FC<ShareContentModalProps> = ({
  open,
  onOpenChange,
  contentItem,
}) => {
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [maxAccessCount, setMaxAccessCount] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Reset state when modal is closed or contentItem changes
    if (!open || !contentItem) {
      setExpiresAt(undefined);
      setMaxAccessCount("");
      setPassword("");
      setGeneratedLink(null);
      setShareToken(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open, contentItem]);

  if (!contentItem) {
    return null;
  }

  const handleGenerateLink = async () => {
    if (!contentItem?.id) {
      setError("Content item ID is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedLink(null);
    setShareToken(null);

    const shareCreateData: ContentShareCreate = {
      expires_at: expiresAt ? expiresAt.toISOString() : undefined,
      max_access_count: maxAccessCount
        ? parseInt(maxAccessCount, 10)
        : undefined,
      password: password || undefined,
    };

    try {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const response = await (client as any).createShareLink(
        contentItem.id,
        shareCreateData,
      );

      if (response.share_token && response.id) {
        const shareUrl = `${window.location.origin}/share/${response.share_token}`;
        setGeneratedLink(shareUrl);
        setShareToken(response.share_token);
        toast({ title: "Success", description: "Share link generated!" });
      } else {
        throw new Error(
          "Failed to generate share link: Invalid response from server.",
        );
      }
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (err: any) {
      console.error("Failed to generate share link:", err);
      const errorMsg =
        err.data?.detail ||
        err.message ||
        "Failed to generate share link. Please try again.";
      setError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    if (copyToClipboard(text)) {
      toast({ description: `${type} copied to clipboard!` });
    } else {
      toast({ description: `Failed to copy ${type}.`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2Icon className="mr-2 h-5 w-5" />
            Share: {contentItem.title || "Content Item"}
          </DialogTitle>
          <DialogDescription>
            Configure options and generate a shareable link for your content.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expiresAt" className="text-right">
              Expires At
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`col-span-3 justify-start text-left font-normal ${
                    !expiresAt && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? (
                    format(expiresAt, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="maxAccessCount" className="text-right">
              Max Accesses
            </Label>
            <Input
              id="maxAccessCount"
              type="number"
              placeholder="Unlimited (optional)"
              value={maxAccessCount}
              onChange={(e) => setMaxAccessCount(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="None (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md col-span-4">
              {error}
            </p>
          )}

          {generatedLink && shareToken && (
            <div className="space-y-3 pt-4">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Share link generated successfully!
              </p>
              <div className="flex items-center space-x-2">
                <Input value={generatedLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyToClipboard(generatedLink, "URL")}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  value={`Token: ${shareToken}`}
                  readOnly
                  className="flex-1 text-xs text-muted-foreground"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyToClipboard(shareToken, "Token")}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleGenerateLink}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Share Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareContentModal;
