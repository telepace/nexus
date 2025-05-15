import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchItems } from "@/components/actions/items-action";
import { DeleteButton } from "./deleteButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// 定义Item类型
interface Item {
  id: string;
  title: string;
  description: string;
  quantity?: number;
  owner_id?: string;
}

export default async function DashboardPage() {
  const itemsResponse = await fetchItems();

  // 处理错误或空结果
  let itemsList: Item[] = [];
  let errorMessage: string | null = null;

  if (Array.isArray(itemsResponse)) {
    itemsList = itemsResponse;
    console.log("Dashboard received items:", itemsList.length);
  } else if (itemsResponse && typeof itemsResponse === "object") {
    // 处理可能的错误响应格式
    if ("message" in itemsResponse) {
      errorMessage = String(itemsResponse.message);
    } else if ("error" in itemsResponse) {
      errorMessage = String(itemsResponse.error);
    } else if (itemsResponse.meta && "message" in itemsResponse.meta) {
      errorMessage = String(itemsResponse.meta.message);
    }
    console.error("Dashboard received error:", errorMessage);
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Welcome to your Dashboard</h2>
      <p className="text-lg mb-6">
        Here, you can see the overview of your items and manage them.
      </p>

      <div className="mb-6">
        <Link href="/dashboard/add-item">
          <Button variant="outline" className="text-lg px-4 py-2">
            Add New Item
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md text-red-600">
          {errorMessage}
        </div>
      )}

      <section className="p-6 bg-white rounded-lg shadow-lg mt-8">
        <h2 className="text-xl font-semibold mb-4">Items</h2>
        {/* 调试信息 */}
        {itemsList.length > 0 && (
          <div className="mb-4 p-2 bg-gray-100 text-xs overflow-auto max-h-24">
            <pre>数据示例: {JSON.stringify(itemsList[0], null, 2)}</pre>
          </div>
        )}
        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              itemsList.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="cursor-pointer p-1 text-gray-600 hover:text-gray-800">
                        <span className="text-lg font-semibold">...</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="p-2">
                        <DropdownMenuItem disabled={true}>
                          Edit
                        </DropdownMenuItem>
                        <DeleteButton itemId={item.id} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
