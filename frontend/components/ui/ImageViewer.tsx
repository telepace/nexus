"use client";

import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, Download, X } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
  children?: React.ReactNode;
  showZoomControls?: boolean;
  showDownload?: boolean;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * ImageViewer component that provides a zoomable, full-screen image viewing experience
 * while preserving the original aspect ratio.
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt = "Image",
  className,
  thumbnailClassName,
  children,
  showZoomControls = true,
  showDownload = true,
  maxZoom = 3,
  minZoom = 0.1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.5, maxZoom));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.5, minZoom));
  }, [minZoom]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = alt || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [src, alt]);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        resetView();
      }
    },
    [resetView],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {children || (
          <div
            className={cn(
              "cursor-pointer hover:opacity-90 transition-opacity",
              thumbnailClassName,
            )}
          >
            <OptimizedImage
              src={src}
              alt={alt}
              className={cn("rounded-md border", className)}
              preserveAspectRatio={true}
              objectFit="contain"
            />
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
        <div className="relative w-full h-[95vh] flex flex-col">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            {showZoomControls && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= minZoom}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="flex items-center px-3 py-1 bg-white/10 text-white text-sm rounded">
                  {Math.round(zoom * 100)}%
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= maxZoom}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleRotate}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            {showDownload && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handleDownload}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            <div
              className="transition-all duration-300 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              <OptimizedImage
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain"
                preserveAspectRatio={true}
                objectFit="contain"
                priority
                style={{
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                }}
              />
            </div>
          </div>

          {/* Image Info */}
          <div className="absolute bottom-4 left-4 bg-white/10 text-white px-3 py-1 rounded text-sm">
            {alt}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
