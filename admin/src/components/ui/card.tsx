import { Box, Flex, Heading, Text } from "@chakra-ui/react"
import { ReactNode } from "react"

interface CardProps {
  title: string
  value: string
  icon: ReactNode
  onClick?: () => void
}

export const Card = ({ title, value, icon, onClick }: CardProps) => {
  // 使用固定颜色而不是依赖于颜色模式
  const bgColor = "white"
  const borderColor = "gray.200"

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
          bg="blue.50"
          color="blue.500"
        >
          {icon}
        </Box>
      </Flex>
    </Box>
  )
} 