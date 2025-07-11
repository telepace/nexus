"use client";
// DeleteTagButton component for deleting a tag with confirmation
import * as React from "react";
import { Button, ButtonGroup } from "@/components/ui/button";
import { useTranslation } from "next-i18next";
import { toast } from "@/components/ui/use-toast";

interface DeleteTagButtonProps {
  tagId: string;
  onDelete?: (tagId: string) => void;
  disabled?: boolean;
}

export const DeleteTagButton: React.FC<DeleteTagButtonProps> = ({
  tagId,
  onDelete,
  disabled,
}) => {
  const [confirming, setConfirming] = React.useState(false);
  const { t } = useTranslation();

  const handleDelete = () => {
    setConfirming(false);
    if (onDelete) {
      onDelete(tagId);
    } else {
      // 如果没有提供 onDelete 回调，显示一个提示
      toast({
        title: "功能未实现",
        description: "删除标签功能尚未实现",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        {t("delete")}
      </Button>
      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 z-50 p-4">
          <div className="bg-background dark:bg-card rounded-lg shadow-xl border max-w-md w-full mx-4 elevation-highest">
            <div className="p-6">
              <div className="mb-6 text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  确认删除标签
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("delete_tag_confirm_message")}
                </p>
              </div>
              <ButtonGroup justify="end" responsive className="modal-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  className="w-full sm:w-auto"
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="w-full sm:w-auto"
                >
                  {t("confirm_delete")}
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
