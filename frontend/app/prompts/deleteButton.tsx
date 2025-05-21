'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TrashIcon } from 'lucide-react';
import { removePrompt } from '@/components/actions/prompts-action';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

interface DeleteButtonProps {
  promptId: string;
}

export function DeleteButton({ promptId }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await removePrompt(promptId);
      
      if (result.error) {
        toast({
          title: "删除失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "删除成功",
          description: "提示词已成功删除",
        });
        
        // 刷新页面或重定向
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "删除出错",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        className="flex items-center w-full justify-start p-2 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <TrashIcon className="mr-2 h-4 w-4" />
        删除
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个提示词吗？此操作无法撤销，一旦删除将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 