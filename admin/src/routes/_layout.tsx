import { Flex } from "@chakra-ui/react"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import Navbar from "@/components/Common/Navbar"
import Sidebar from "@/components/Common/Sidebar"
import { isAdminLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: AdminLayout,
  beforeLoad: async () => {
    if (!isAdminLoggedIn()) {
      throw redirect({
        to: "/admin/login",
      })
    }
  },
})

function AdminLayout() {
  return (
    <Flex direction="column" h="100vh">
      <Navbar isAdmin={true} />
      <Flex flex="1" overflow="hidden">
        <Sidebar isAdmin={true} />
        <Flex flex="1" direction="column" p={4} overflowY="auto">
          <Outlet />
        </Flex>
      </Flex>
    </Flex>
  )
}

export default AdminLayout
