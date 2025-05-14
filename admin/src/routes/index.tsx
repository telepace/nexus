import { Box, Heading, SimpleGrid, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { FiUsers, FiSettings, FiBox, FiActivity } from "react-icons/fi"

import { Card } from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/")({
  component: AdminHome,
})

function AdminHome() {
  const { user } = useAuth(true)

  return (
    <Box>
      <Heading mb={6}>Admin Dashboard</Heading>
      <Text mb={6}>Welcome back, {user?.full_name || "Admin"}!</Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
        <Card
          title="Users"
          icon={<FiUsers size={24} />}
          value="0"
          onClick={() => window.location.href = "/admin/users"}
        />
        <Card
          title="Items"
          icon={<FiBox size={24} />}
          value="0"
          onClick={() => window.location.href = "/admin/items"}
        />
        <Card
          title="Activity"
          icon={<FiActivity size={24} />}
          value="0"
          onClick={() => window.location.href = "/admin/activity"}
        />
        <Card
          title="Settings"
          icon={<FiSettings size={24} />}
          value="Admin"
          onClick={() => window.location.href = "/admin/settings"}
        />
      </SimpleGrid>
    </Box>
  )
}

export default AdminHome 