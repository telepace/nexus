import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiBriefcase, FiHome, FiSettings, FiUsers, FiActivity, FiShield } from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"

const userItems = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: FiBriefcase, title: "Items", path: "/items" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

const adminItems = [
  { icon: FiHome, title: "Dashboard", path: "/admin" },
  { icon: FiUsers, title: "Users", path: "/admin/users" },
  { icon: FiBriefcase, title: "Items", path: "/admin/items" },
  { icon: FiActivity, title: "Activity", path: "/admin/activity" },
  { icon: FiShield, title: "Permissions", path: "/admin/permissions" },
  { icon: FiSettings, title: "Settings", path: "/admin/settings" },
]

interface SidebarItemsProps {
  isAdmin?: boolean;
  onClose?: () => void;
}

interface Item {
  icon: IconType
  title: string
  path: string
}

const SidebarItems = ({ isAdmin = false, onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>([
    "currentUser", 
    isAdmin ? "admin" : "user"
  ])

  const items = isAdmin ? adminItems : userItems

  const finalItems: Item[] = !isAdmin && currentUser?.is_superuser
    ? [...items, { icon: FiShield, title: "Admin", path: "/admin" }]
    : items

  const listItems = finalItems.map(({ icon, title, path }) => (
    <RouterLink key={title} to={path} onClick={onClose}>
      <Flex
        gap={4}
        px={4}
        py={2}
        _hover={{
          background: isAdmin ? "purple.700" : "gray.subtle",
        }}
        alignItems="center"
        fontSize="sm"
      >
        <Icon as={icon} alignSelf="center" />
        <Text ml={2}>{title}</Text>
      </Flex>
    </RouterLink>
  ))

  return (
    <>
      <Text fontSize="xs" px={4} py={2} fontWeight="bold">
        {isAdmin ? "Admin Menu" : "Menu"}
      </Text>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
