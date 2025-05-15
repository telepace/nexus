import { Box, Container, Text, Grid, Heading, Link, Flex, Icon, Badge } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { FiDatabase, FiServer, FiMonitor, FiCpu, FiExternalLink } from "react-icons/fi"
import { useColorModeValue } from "@/components/ui/color-mode"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const cardBg = useColorModeValue("white", "gray.800")
  const borderColor = useColorModeValue("gray.200", "gray.700")
  const statBg = useColorModeValue("blue.50", "blue.900")
  const domain = import.meta.env.VITE_DOMAIN || 'localhost.nip.io'
  const protocol = import.meta.env.VITE_USE_HTTPS === 'false' ? 'http' : 'https'

  // Deployment information from environment - updated format
  const deploymentTools = [
    { name: "Admin Dashboard", subdomain: "admin", description: "Admin management interface" },
    { name: "User Dashboard", subdomain: "dashboard", description: "User-facing dashboard" },
    { name: "API Backend", subdomain: "api", description: "Backend API server" },
    { name: "Adminer", subdomain: "adminer", description: "Database management" },
    { name: "PG Admin", subdomain: "pgadmin", description: "PostgreSQL administration" },
    { name: "LiteLLM", subdomain: "llm", description: "LLM proxy service" },
    { name: "Prometheus", subdomain: "prometheus", description: "Monitoring and metrics" },
  ]

  // System information
  const systemInfo = [
    { 
      name: "Project Name", 
      value: import.meta.env.VITE_PROJECT_NAME || "Nexus", 
      icon: FiMonitor 
    },
    { 
      name: "Environment", 
      value: import.meta.env.VITE_ENVIRONMENT || "Local", 
      icon: FiServer
    },
    { 
      name: "Database", 
      value: "PostgreSQL", 
      icon: FiDatabase 
    },
    { 
      name: "LLM Proxy", 
      value: "LiteLLM", 
      icon: FiCpu 
    }
  ]

  return (
    <>
      <Container maxW="full">
        <Box pt={12} m={4}>
          <Text fontSize="2xl" truncate maxW="sm">
            Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
          </Text>
          <Text mb={8}>Welcome back, nice to see you again!</Text>
          
          {/* System Overview Section */}
          <Heading size="md" mb={4}>System Overview</Heading>
          <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4} mb={8}>
            {systemInfo.map((stat) => (
              <Box key={stat.name} px={4} py={3} bg={statBg} borderRadius="lg">
                <Flex alignItems="center" mb={2}>
                  <Icon as={stat.icon} mr={2} />
                  <Text fontWeight="medium">{stat.name}</Text>
                </Flex>
                <Text fontSize="lg" fontWeight="bold">{stat.value}</Text>
              </Box>
            ))}
          </Grid>
          
          <Box h="1px" bg={borderColor} my={6} />
          
          <Heading size="md" mb={4}>
            Project Deployment Resources
            <Badge ml={2} colorScheme={domain === 'localhost.nip.io' ? 'yellow' : 'green'}>
              {domain === 'localhost.nip.io' ? 'Local' : 'Production'}
            </Badge>
          </Heading>
          
          <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
            {deploymentTools.map((tool) => {
              const url = `${protocol}://${tool.subdomain}.${domain}`;
              return (
                <Box 
                  key={tool.name}
                  p={4}
                  borderWidth="1px"
                  borderRadius="lg"
                  borderColor={borderColor}
                  bg={cardBg}
                  boxShadow="sm"
                  transition="all 0.2s"
                  _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                >
                  <Heading size="sm" mb={2}>{tool.name}</Heading>
                  <Text fontSize="sm" color="gray.500" mb={3}>{tool.description}</Text>
                  <Box title={url}>
                    <Link 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="blue.500" 
                      fontSize="sm"
                      display="flex"
                      alignItems="center"
                      _hover={{ textDecoration: "underline", color: "blue.600" }}
                    >
                      {tool.subdomain}.{domain}
                      <Icon as={FiExternalLink} ml={1} />
                    </Link>
                  </Box>
                </Box>
              );
            })}
          </Grid>
        </Box>
      </Container>
    </>
  )
}
