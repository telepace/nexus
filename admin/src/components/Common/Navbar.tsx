import { Flex, Heading, Image, useBreakpointValue } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"

import Logo from "/assets/images/fastapi-logo.svg"
import UserMenu from "./UserMenu"

interface NavbarProps {
  isAdmin?: boolean;
}

function Navbar({ isAdmin = false }: NavbarProps) {
  const display = useBreakpointValue({ base: "none", md: "flex" })

  return (
    <Flex
      display={display}
      justify="space-between"
      position="sticky"
      color="white"
      align="center"
      bg={isAdmin ? "purple.700" : "bg.muted"}
      w="100%"
      top={0}
      p={4}
    >
      <Flex align="center">
        <Link to={isAdmin ? "/admin" : "/"}>
          <Image src={Logo} alt="Logo" maxW="3xs" p={2} />
        </Link>
        {isAdmin && (
          <Heading size="md" ml={2}>
            Admin Panel
          </Heading>
        )}
      </Flex>
      <Flex gap={2} alignItems="center">
        <UserMenu isAdmin={isAdmin} />
      </Flex>
    </Flex>
  )
}

export default Navbar
