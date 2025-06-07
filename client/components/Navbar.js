import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  Group,
  Text,
  Button,
  Avatar,
  Box,
  Burger,
  MediaQuery,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

export default function AppHeader() {
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useMantineTheme();
  const [opened, { toggle }] = useDisclosure(false);
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/auth/login');
  };

  return (
    <Box component="header" sx={{ height: 70, padding: theme.spacing.md }}>
      <Group position="apart" sx={{ height: '100%' }}>
        <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            color={theme.colors.gray[6]}
            mr="xl"
          />
        </MediaQuery>

        <Box
          component={Link}
          href="/"
          sx={{
            textDecoration: 'none',
            '&:hover': { textDecoration: 'none' },
          }}
        >
          <Text size="xl" fw={700} c="blue">
            Portfolio Tracker
          </Text>
        </Box>

        <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
          <Group spacing="md">
            {isAuthenticated ? (
              <>
                <Group spacing="xs">
                  <Avatar
                    src={user?.avatar}
                    alt={user?.name}
                    radius="xl"
                    size="md"
                  />
                  <Text fw={500}>{user?.name}</Text>
                </Group>
                <Button
                  variant="outline"
                  color="red"
                  size="sm"
                  radius="xl"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" passHref legacyBehavior>
                  <Button
                    component="a"
                    variant="light"
                    color="gray"
                    size="sm"
                    radius="xl"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register" passHref legacyBehavior>
                  <Button
                    component="a"
                    variant="filled"
                    color="blue"
                    size="sm"
                    radius="xl"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </Group>
        </MediaQuery>

        <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
          <Group spacing="xs">
            {isAuthenticated && (
              <Avatar
                src={user?.avatar}
                alt={user?.name}
                radius="xl"
                size="md"
              />
            )}
          </Group>
        </MediaQuery>
      </Group>
    </Box>
  );
}
