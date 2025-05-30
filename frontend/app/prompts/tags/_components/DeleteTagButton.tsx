"use client";
// DeleteTagButton component for deleting a tag with confirmation
import * as React from "react";
import { Button } from "@/components/ui/button";
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded shadow-lg p-6 w-80">
            <div className="mb-4 text-center text-sm text-gray-700">
              {t("delete_tag_confirm_message")}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                {t("cancel")}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                {t("confirm_delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
