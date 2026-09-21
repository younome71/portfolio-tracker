import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { logout, fetchReceivedInvites } from '../store/authSlice';
import {
  Group,
  Text,
  Button,
  Avatar,
  Box,
  Burger,
  Drawer,
  Stack,
  Divider,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

export default function AppHeader() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [opened, { open, close }] = useDisclosure(false);
  const { isAuthenticated, user, receivedInvites, hydrated } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      dispatch(fetchReceivedInvites());
    }
  }, [hydrated, isAuthenticated, dispatch]);

  const pendingInviteCount = (receivedInvites || []).length;

  const handleLogout = () => {
    dispatch(logout());
    close();
    router.push('/auth/login');
  };

  const displayName = user?.name || user?.email || 'User';

  const familyLinkStyles = {
    root: {
      color: 'var(--pt-ink)',
      fontWeight: 600,
      '&:hover': { background: 'rgba(11, 18, 32, 0.04)' },
    },
  };

  return (
    <Box component="header" className="pt-nav">
      <Group
        position="apart"
        px="md"
        py="sm"
        style={{ maxWidth: 1120, margin: '0 auto', minHeight: 64 }}
      >
        <Group spacing="sm">
          <Burger
            opened={opened}
            onClick={open}
            size="sm"
            color="var(--pt-ink)"
            sx={{ display: 'none', '@media (max-width: 768px)': { display: 'block' } }}
          />
          <Box
            component={Link}
            href="/"
            className="pt-mark"
            style={{ color: 'var(--pt-ink)', textDecoration: 'none' }}
          >
            <span
              className="pt-mark-badge"
              style={{
                background: 'var(--pt-teal-soft)',
                border: '1px solid rgba(15, 118, 110, 0.25)',
                color: 'var(--pt-teal-deep)',
              }}
            >
              PT
            </span>
            Portfolio Tracker
          </Box>
        </Group>

        <Group
          spacing="md"
          sx={{ display: 'flex', '@media (max-width: 768px)': { display: 'none' } }}
        >
          {isAuthenticated ? (
            <>
              <Button
                component={Link}
                href="/family"
                variant="subtle"
                size="sm"
                radius="md"
                styles={familyLinkStyles}
                rightIcon={
                  pendingInviteCount > 0 ? (
                    <Badge size="sm" color="teal" variant="filled" circle>
                      {pendingInviteCount}
                    </Badge>
                  ) : null
                }
              >
                Family
              </Button>
              <Group spacing="xs">
                <Avatar
                  alt={displayName}
                  radius="md"
                  size={36}
                  styles={{
                    root: {
                      background: 'var(--pt-teal-soft)',
                      color: 'var(--pt-teal-deep)',
                      fontWeight: 700,
                    },
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Text fw={600} size="sm" style={{ color: 'var(--pt-ink)' }}>
                    {displayName}
                  </Text>
                  <Text size="xs" style={{ color: 'var(--pt-ink-soft)' }}>
                    {user?.role === 'parent' ? 'Family manager' : 'Investor'}
                  </Text>
                </div>
              </Group>
              <Button
                variant="outline"
                size="sm"
                radius="md"
                onClick={handleLogout}
                styles={{
                  root: {
                    borderColor: 'rgba(11, 18, 32, 0.15)',
                    color: 'var(--pt-ink)',
                    fontWeight: 600,
                    '&:hover': { background: 'rgba(11, 18, 32, 0.04)' },
                  },
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button
                component={Link}
                href="/auth/login"
                variant="subtle"
                size="sm"
                radius="md"
                styles={{ root: { color: 'var(--pt-ink)', fontWeight: 600 } }}
              >
                Sign in
              </Button>
              <Button
                component={Link}
                href="/auth/register"
                size="sm"
                radius="md"
                styles={{
                  root: {
                    background: 'var(--pt-teal)',
                    fontWeight: 700,
                    '&:hover': { background: 'var(--pt-teal-deep)' },
                  },
                }}
              >
                Get started
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        padding="md"
        title={
          <Text className="pt-display" fw={700}>
            Menu
          </Text>
        }
        size="xs"
      >
        <Stack spacing="sm">
          {isAuthenticated ? (
            <>
              <Text size="sm" fw={600}>
                {displayName}
              </Text>
              <Text size="xs" color="dimmed">
                {user?.role === 'parent' ? 'Family manager' : 'Investor'}
              </Text>
              <Divider my="xs" />
              <Button component={Link} href="/" variant="light" onClick={close}>
                Dashboard
              </Button>
              <Button
                component={Link}
                href="/family"
                variant="light"
                onClick={close}
                rightIcon={
                  pendingInviteCount > 0 ? (
                    <Badge size="sm" color="teal" variant="filled" circle>
                      {pendingInviteCount}
                    </Badge>
                  ) : null
                }
              >
                Family
              </Button>
              <Button color="red" variant="outline" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button component={Link} href="/auth/login" onClick={close}>
                Sign in
              </Button>
              <Button
                component={Link}
                href="/auth/register"
                variant="filled"
                onClick={close}
                styles={{ root: { background: 'var(--pt-teal)' } }}
              >
                Get started
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </Box>
  );
}
