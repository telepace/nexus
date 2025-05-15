"use server";

import { cookies } from "next/headers";
import { readItems, readItem, deleteItem, createItem } from "@/app/clientService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { itemSchema } from "@/lib/definitions";
import type { ApiResponse_ItemPublic_, ApiResponse_ItemsPublic_ } from "@/app/openapi-client/types.gen";

interface ItemData {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
}

// 创建一个通用的ApiResponse类型
type ApiResponse<T> = {
  data?: T | null;
  meta?: {
    [key: string]: unknown;
  } | null;
  error?: string | null;
};

type DataResponse = {
  data?: ItemData[] | { data?: ItemData[] } | unknown;
  meta?: { message?: string } | null;
  error?: string | null;
};

export async function fetchItems() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    console.error("No access token found in cookies");
    redirect('/login');
  }

  try {
    console.log("Fetching items with token", token.substring(0, 5) + "...");
    
    const { data, error } = await readItems({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });


    if (error) {
      console.error("API error:", error);
      return { message: error };
    }

    // 处理三层嵌套的数据结构
    const responseData = data as ApiResponse<ItemData[]>;
    
    if (responseData && responseData.data && typeof responseData.data === 'object' && 'data' in responseData.data && Array.isArray(responseData.data.data)) {
      return responseData.data.data;
    } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
      return responseData.data;
    } else if (Array.isArray(responseData)) {
      return responseData;
    }

    console.warn("Unexpected API response format:", data);
    return [];
  } catch (error) {
    console.error("Fetch items error:", error);
    return { message: "Failed to fetch items" };
  }
}

export async function fetchItem(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect('/login');
  }

  const { data, error } = await readItem({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      id: id,
    },
  });

  if (error) {
    return { message: error };
  }

  return data?.data;
}

export async function removeItem(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const { data, error } = await deleteItem({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        id: id,
      },
    });

    if (error) {
      console.error("Delete item error:", error);
      return { message: error };
    }

    console.log("Delete response:", data);
    
    revalidatePath("/dashboard");
    
    // 处理嵌套结构
    const responseData = data as DataResponse;
    
    if (responseData && responseData.meta && typeof responseData.meta === 'object' && 'message' in responseData.meta) {
      return responseData.meta.message;
    } else if (responseData && responseData.data && typeof responseData.data === 'object') {
      const nestedData = responseData.data as DataResponse;
      if (nestedData.meta && typeof nestedData.meta === 'object' && 'message' in nestedData.meta) {
        return nestedData.meta.message;
      }
    }
    
    return "Item deleted successfully";
  } catch (error) {
    console.error("Error deleting item:", error);
    return { message: "Failed to delete item" };
  }
}

export async function addItem(prevState: {}, formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect('/login');
  }

  const validatedFields = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description } = validatedFields.data;

  const input = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      title,
      description,
    },
  };
  
  const { data, error } = await createItem(input);
  
  if (error) {
    return { message: typeof error === 'string' ? error : JSON.stringify(error) };
  }
  
  // 检查有没有响应中的错误信息
  if (data?.error) {
    return { message: data.error };
  }
  
  redirect(`/dashboard`);
}
