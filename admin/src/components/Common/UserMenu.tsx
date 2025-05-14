import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiSettings, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

interface UserMenuProps {
  isAdmin?: boolean;
}

const UserMenu = ({ isAdmin = false }: UserMenuProps) => {
  const { user, logout } = useAuth(isAdmin)

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <Flex>
        <MenuRoot>
          <MenuTrigger asChild p={2}>
            <Button 
              data-testid="user-menu" 
              variant="solid" 
              maxW="sm" 
              truncate
              colorScheme={isAdmin ? "purple" : "blue"}
            >
              <FaUserAstronaut fontSize="18" />
              <Text>{user?.full_name || (isAdmin ? "Admin" : "User")}</Text>
            </Button>
          </MenuTrigger>

          <MenuContent>
            <Link to={isAdmin ? "/admin/settings" : "/settings"}>
              <MenuItem
                closeOnSelect
                value="user-settings"
                gap={2}
                py={2}
                style={{ cursor: "pointer" }}
              >
                <FiUser fontSize="18px" />
                <Box flex="1">{isAdmin ? "Admin Profile" : "My Profile"}</Box>
              </MenuItem>
            </Link>

            {isAdmin && (
              <Link to="/admin/system-settings">
                <MenuItem
                  closeOnSelect
                  value="system-settings"
                  gap={2}
                  py={2}
                  style={{ cursor: "pointer" }}
                >
                  <FiSettings fontSize="18px" />
                  <Box flex="1">System Settings</Box>
                </MenuItem>
              </Link>
            )}

            <MenuItem
              value="logout"
              gap={2}
              py={2}
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <FiLogOut />
              Log Out
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </>
  )
}

export default UserMenu
