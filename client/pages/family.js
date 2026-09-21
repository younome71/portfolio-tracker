import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import {
  Container,
  Title,
  Text,
  Stack,
  TextInput,
  Button,
  Group,
  Alert,
  Paper,
  Badge,
  Loader,
  Center,
  Divider,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconUsers, IconMail } from '@tabler/icons-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  fetchFamilyMembers,
  fetchSentInvites,
  fetchReceivedInvites,
  inviteFamilyMember,
  acceptFamilyInvite,
  declineFamilyInvite,
  cancelFamilyInvite,
  removeFamilyMember,
  clearError,
} from '../store/authSlice';

function FamilyPageContent() {
  const dispatch = useDispatch();
  const {
    user,
    familyMembers,
    sentInvites,
    receivedInvites,
    familyLoading,
    familyError,
    hydrated,
    isAuthenticated,
  } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const isParent = user?.role === 'parent';

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      setPageLoading(true);
      dispatch(clearError());
      const tasks = [dispatch(fetchReceivedInvites())];
      if (isParent) {
        tasks.push(dispatch(fetchFamilyMembers()), dispatch(fetchSentInvites()));
      }
      await Promise.all(tasks);
      if (!cancelled) setPageLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, isParent, dispatch]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      await dispatch(inviteFamilyMember(email.trim())).unwrap();
      setActionSuccess(`Invite sent to ${email.trim()}`);
      setEmail('');
      dispatch(fetchSentInvites());
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Failed to send invite');
    }
  };

  const runInviteAction = async (id, action, successMsg) => {
    setActionError('');
    setActionSuccess('');
    setBusyId(id);
    try {
      await dispatch(action(id)).unwrap();
      setActionSuccess(successMsg);
      if (action === acceptFamilyInvite || action === declineFamilyInvite) {
        dispatch(fetchReceivedInvites());
      }
      if (action === cancelFamilyInvite) {
        dispatch(fetchSentInvites());
      }
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (memberId) => {
    setActionError('');
    setActionSuccess('');
    setBusyId(memberId);
    try {
      await dispatch(removeFamilyMember(memberId)).unwrap();
      setActionSuccess('Family member removed');
      dispatch(fetchFamilyMembers());
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Failed to remove member');
    } finally {
      setBusyId(null);
    }
  };

  const pendingSent = (sentInvites || []).filter((i) => i.status === 'pending');
  const displayError = actionError || familyError;

  if (pageLoading) {
    return (
      <Center py={80}>
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Group spacing="sm" mb="xs">
        <IconUsers size={28} color="var(--pt-teal)" />
        <Title
          order={1}
          className="pt-display"
          style={{
            fontSize: '1.75rem',
            color: 'var(--pt-ink)',
            letterSpacing: '-0.03em',
          }}
        >
          Family
        </Title>
      </Group>
      <Text size="sm" mb="xl" style={{ color: 'rgba(36, 48, 68, 0.7)' }}>
        {isParent
          ? 'Invite people who already have an account. They must accept before you can create a portfolio for them.'
          : 'Accept or decline invitations from a family manager.'}
      </Text>

      {displayError && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="red"
          mb="md"
          variant="light"
          onClose={() => {
            setActionError('');
            dispatch(clearError());
          }}
          withCloseButton
        >
          {displayError}
        </Alert>
      )}

      {actionSuccess && (
        <Alert color="teal" mb="md" variant="light" withCloseButton onClose={() => setActionSuccess('')}>
          {actionSuccess}
        </Alert>
      )}

      {/* Received invites — everyone */}
      <Paper
        p="lg"
        mb="lg"
        radius="md"
        style={{
          border: '1px solid rgba(11, 18, 32, 0.08)',
          background: '#fff',
        }}
      >
        <Title order={3} mb="xs" style={{ fontSize: '1.1rem', color: 'var(--pt-ink)' }}>
          Invitations for you
        </Title>
        {(receivedInvites || []).length === 0 ? (
          <Text size="sm" color="dimmed">
            No pending invitations.
          </Text>
        ) : (
          <Stack spacing="sm" mt="md">
            {receivedInvites.map((invite) => (
              <Group key={invite.id} position="apart" noWrap align="flex-start">
                <div>
                  <Text size="sm" fw={600}>
                    {invite.from?.name || 'Someone'}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {invite.from?.email}
                  </Text>
                </div>
                <Group spacing="xs">
                  <Button
                    size="xs"
                    color="teal"
                    loading={busyId === invite.id}
                    onClick={() =>
                      runInviteAction(invite.id, acceptFamilyInvite, 'Invite accepted')
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    color="gray"
                    disabled={busyId === invite.id}
                    onClick={() =>
                      runInviteAction(invite.id, declineFamilyInvite, 'Invite declined')
                    }
                  >
                    Decline
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      {isParent && (
        <>
          <Paper
            p="lg"
            mb="lg"
            radius="md"
            style={{
              border: '1px solid rgba(11, 18, 32, 0.08)',
              background: '#fff',
            }}
          >
            <Title order={3} mb="xs" style={{ fontSize: '1.1rem', color: 'var(--pt-ink)' }}>
              Invite by email
            </Title>
            <Text size="xs" color="dimmed" mb="md">
              They must already have registered on Portfolio Tracker.
            </Text>
            <form onSubmit={handleInvite}>
              <Group align="flex-end" grow>
                <TextInput
                  label="Email"
                  placeholder="family@example.com"
                  icon={<IconMail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                  type="email"
                />
                <Button
                  type="submit"
                  loading={familyLoading}
                  styles={{
                    root: {
                      background: 'var(--pt-teal)',
                      flex: '0 0 auto',
                      '&:hover': { background: 'var(--pt-teal-deep)' },
                    },
                  }}
                >
                  Send invite
                </Button>
              </Group>
            </form>
          </Paper>

          <Paper
            p="lg"
            mb="lg"
            radius="md"
            style={{
              border: '1px solid rgba(11, 18, 32, 0.08)',
              background: '#fff',
            }}
          >
            <Title order={3} mb="md" style={{ fontSize: '1.1rem', color: 'var(--pt-ink)' }}>
              Linked members
            </Title>
            {(familyMembers || []).length === 0 ? (
              <Text size="sm" color="dimmed">
                No linked members yet. After they accept, they appear here and you can create a
                family portfolio for them.
              </Text>
            ) : (
              <Stack spacing="sm">
                {familyMembers.map((member) => {
                  const id = member._id || member.id;
                  return (
                    <Group key={id} position="apart">
                      <div>
                        <Text size="sm" fw={600}>
                          {member.name}
                        </Text>
                        <Text size="xs" color="dimmed">
                          {member.email}
                        </Text>
                      </div>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        loading={busyId === id}
                        onClick={() => handleRemove(id)}
                      >
                        Remove
                      </Button>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper
            p="lg"
            mb="lg"
            radius="md"
            style={{
              border: '1px solid rgba(11, 18, 32, 0.08)',
              background: '#fff',
            }}
          >
            <Title order={3} mb="md" style={{ fontSize: '1.1rem', color: 'var(--pt-ink)' }}>
              Sent invites
            </Title>
            {pendingSent.length === 0 ? (
              <Text size="sm" color="dimmed">
                No pending sent invites.
              </Text>
            ) : (
              <Stack spacing="sm">
                {pendingSent.map((invite) => (
                  <Group key={invite.id} position="apart">
                    <div>
                      <Text size="sm" fw={600}>
                        {invite.to?.name || invite.to?.email}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {invite.to?.email}
                      </Text>
                    </div>
                    <Group spacing="xs">
                      <Badge color="yellow" variant="light">
                        Pending
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        loading={busyId === invite.id}
                        onClick={() =>
                          runInviteAction(invite.id, cancelFamilyInvite, 'Invite cancelled')
                        }
                      >
                        Cancel
                      </Button>
                    </Group>
                  </Group>
                ))}
              </Stack>
            )}

            {(sentInvites || []).some((i) => i.status !== 'pending') && (
              <>
                <Divider my="md" label="Earlier" labelPosition="center" />
                <Stack spacing="xs">
                  {sentInvites
                    .filter((i) => i.status !== 'pending')
                    .slice(0, 10)
                    .map((invite) => (
                      <Group key={invite.id} position="apart">
                        <Text size="sm" color="dimmed">
                          {invite.to?.email}
                        </Text>
                        <Badge
                          variant="outline"
                          color={
                            invite.status === 'accepted'
                              ? 'teal'
                              : invite.status === 'declined'
                                ? 'red'
                                : 'gray'
                          }
                        >
                          {invite.status}
                        </Badge>
                      </Group>
                    ))}
                </Stack>
              </>
            )}
          </Paper>

          {(familyMembers || []).length > 0 && (
            <Text size="sm" mb="xl">
              Ready to track holdings?{' '}
              <Anchor component={Link} href="/portfolio/new" fw={600} style={{ color: 'var(--pt-teal)' }}>
                Create a family portfolio
              </Anchor>
            </Text>
          )}
        </>
      )}
    </Container>
  );
}

export default function FamilyPage() {
  return (
    <ProtectedRoute>
      <Layout title="Family — Portfolio Tracker">
        <FamilyPageContent />
      </Layout>
    </ProtectedRoute>
  );
}
