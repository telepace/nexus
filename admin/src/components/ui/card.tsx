import { Box, Flex, Heading, Text, useColorModeValue } from "@chakra-ui/react"
import { ReactNode } from "react"

interface CardProps {
  title: string
  value: string
  icon: ReactNode
  onClick?: () => void
}

export const Card = ({ title, value, icon, onClick }: CardProps) => {
  const bgColor = useColorModeValue("white", "gray.800")
  const borderColor = useColorModeValue("gray.200", "gray.700")

  return (
    <Box
      bg={bgColor}
      p={5}
      borderRadius="md"
      boxShadow="sm"
      border="1px solid"
      borderColor={borderColor}
      cursor={onClick ? "pointer" : "default"}
      transition="all 0.2s"
      _hover={{
        transform: onClick ? "translateY(-2px)" : "none",
        boxShadow: onClick ? "md" : "sm",
      }}
      onClick={onClick}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Box>
          <Heading size="md" mb={2}>
            {title}
          </Heading>
          <Text fontSize="2xl" fontWeight="bold">
            {value}
          </Text>
        </Box>
        <Box
          p={3}
          borderRadius="full"
          bg={useColorModeValue("blue.50", "blue.900")}
          color={useColorModeValue("blue.500", "blue.200")}
        >
          {icon}
        </Box>
      </Flex>
    </Box>
  )
} 