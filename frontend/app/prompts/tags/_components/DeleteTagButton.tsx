// DeleteTagButton component for deleting a tag with confirmation
import * as React from 'react';
import { Button } from '@/components/ui/button';

interface DeleteTagButtonProps {
  tagId: string;
  onDelete: (tagId: string) => void;
  disabled?: boolean;
}

export const DeleteTagButton: React.FC<DeleteTagButtonProps> = ({ tagId, onDelete, disabled }) => {
  const [confirming, setConfirming] = React.useState(false);

  const handleDelete = () => {
    setConfirming(false);
    onDelete(tagId);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        删除
      </Button>
      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded shadow-lg p-6 w-80">
            <div className="mb-4 text-center text-sm text-gray-700">确定要删除该标签吗？此操作不可撤销。</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                取消
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 