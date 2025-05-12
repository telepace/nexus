import {
  Container,
  EmptyState,
  Flex,
  Heading,
  Table,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FiSearch } from "react-icons/fi"
import { z } from "zod"

import { ItemPublic, ItemsPublic, ItemsService } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import AddItem from "@/components/Items/AddItem"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"

const itemsSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getItemsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      ItemsService.readItems({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["items", { page }],
  }
}

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

function ItemsTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getItemsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: { [key: string]: string }) => ({ ...prev, page }),
    })

  // 处理API响应数据结构
  let itemsData: ItemsPublic;
  
  if (data) {
    // 检查data是否直接就是ItemsPublic类型
    if ('data' in data && 'count' in data && Array.isArray(data.data)) {
      // data直接是ItemsPublic类型
      itemsData = data as ItemsPublic;
    } 
    // 检查data是否是新的API响应格式
    else if (data && typeof data === 'object' && 'data' in data) {
      // data.data是否已经是ItemsPublic类型
      if (data.data && typeof data.data === 'object' && 'data' in data.data && 'count' in data.data) {
        // data.data已经是ItemsPublic对象
        itemsData = data.data as ItemsPublic;
      } 
      // data.data可能是ItemPublic[]数组
      else if (Array.isArray(data.data)) {
        // 将ItemPublic[]数组包装为ItemsPublic对象
        itemsData = {
          data: data.data as ItemPublic[],
          count: data.data.length
        };
      }
      else {
        // 兜底情况
        itemsData = { data: [], count: 0 };
      }
    } 
    else {
      // 兜底情况
      itemsData = { data: [], count: 0 };
    }
  } else {
    // 没有数据的情况
    itemsData = { data: [], count: 0 };
  }
    
  const items = itemsData.data.slice(0, PER_PAGE) ?? [];
  const count = itemsData.count ?? 0;

  if (isLoading) {
    return <PendingItems />
  }

  if (items.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>You don't have any items yet</EmptyState.Title>
            <EmptyState.Description>
              Add a new item to get started
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="sm">ID</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Title</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Description</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items?.map((item: ItemPublic) => (
            <Table.Row key={item.id} opacity={isPlaceholderData ? 0.5 : 1}>
              <Table.Cell truncate maxW="sm">
                {item.id}
              </Table.Cell>
              <Table.Cell truncate maxW="sm">
                {item.title}
              </Table.Cell>
              <Table.Cell
                color={!item.description ? "gray" : "inherit"}
                truncate
                maxW="30%"
              >
                {item.description || "N/A"}
              </Table.Cell>
              <Table.Cell>
                <ItemActionsMenu item={item} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function Items() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Items Management
      </Heading>
      <AddItem />
      <ItemsTable />
    </Container>
  )
}
