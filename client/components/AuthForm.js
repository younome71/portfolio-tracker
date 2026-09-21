import { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { loginUser, registerUser } from '../store/authSlice';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Alert,
  Box,
  Group,
  SegmentedControl,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';

const inputStyles = {
  label: {
    fontWeight: 550,
    fontSize: 13,
    color: 'var(--pt-ink-soft)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    border: '1px solid rgba(11, 18, 32, 0.1)',
    height: 46,
    fontSize: 15,
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
    '&:focus': {
      borderColor: 'var(--pt-teal)',
      boxShadow: '0 0 0 3px rgba(15, 118, 110, 0.12)',
    },
  },
  innerInput: {
    height: 46,
  },
};

export default function AuthForm({ isLogin = true }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      name: '',
      role: 'parent',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Enter a valid email'),
      password: (val) =>
        val.length >= 6 ? null : 'Password must be at least 6 characters',
      ...(!isLogin
        ? {
            name: (val) =>
              val.trim().length >= 2 ? null : 'Name must be at least 2 characters',
          }
        : {}),
    },
  });

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      if (isLogin) {
        await dispatch(
          loginUser({ email: values.email, password: values.password })
        ).unwrap();
      } else {
        await dispatch(
          registerUser({
            name: values.name,
            email: values.email,
            password: values.password,
            role: values.role,
          })
        ).unwrap();
      }

      router.push('/');
    } catch (err) {
      setError(
        typeof err === 'string' ? err : err?.message || 'Authentication failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Title
        order={2}
        className="pt-display"
        style={{
          fontSize: '1.75rem',
          color: 'var(--pt-ink)',
          marginBottom: 6,
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: '-0.03em',
        }}
      >
        {isLogin ? 'Sign in' : 'Create your account'}
      </Title>
      <Text
        size="sm"
        mb={28}
        style={{ color: 'rgba(36, 48, 68, 0.7)', lineHeight: 1.55 }}
      >
        {isLogin
          ? 'Continue to your portfolios.'
          : 'Set up access for yourself or your family.'}
      </Text>

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Unable to continue"
          color="red"
          mb="md"
          variant="light"
          radius="md"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="lg">
          {!isLogin && (
            <TextInput
              label="Full name"
              placeholder="e.g. Priya Sharma"
              radius="sm"
              size="md"
              styles={inputStyles}
              autoComplete="name"
              {...form.getInputProps('name')}
            />
          )}

          <TextInput
            label="Email address"
            placeholder="name@company.com"
            radius="sm"
            size="md"
            styles={inputStyles}
            autoComplete="email"
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder={isLogin ? 'Enter your password' : 'Minimum 6 characters'}
            radius="sm"
            size="md"
            styles={inputStyles}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            {...form.getInputProps('password')}
          />

          {!isLogin && (
            <Box>
              <Text
                size="sm"
                mb={8}
                style={{ color: 'var(--pt-ink-soft)', fontWeight: 550, fontSize: 13 }}
              >
                Account type
              </Text>
              <SegmentedControl
                fullWidth
                radius="sm"
                value={form.values.role}
                onChange={(value) => form.setFieldValue('role', value)}
                data={[
                  { label: 'Family manager', value: 'parent' },
                  { label: 'Family member', value: 'child' },
                ]}
                styles={{
                  root: {
                    background: 'rgba(11, 18, 32, 0.04)',
                    border: '1px solid rgba(11, 18, 32, 0.06)',
                  },
                  active: {
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(11,18,32,0.06)',
                  },
                  label: { fontWeight: 600, fontSize: 13, padding: '8px 0' },
                }}
              />
            </Box>
          )}

          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="md"
            radius="sm"
            mt={4}
            styles={{
              root: {
                background: 'var(--pt-ink)',
                fontFamily: 'var(--pt-display)',
                fontWeight: 650,
                height: 48,
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
                transition: 'background 140ms ease',
                '&:hover': {
                  background: '#152238',
                },
              },
            }}
          >
            {isLogin ? 'Continue' : 'Create account'}
          </Button>
        </Stack>
      </form>

      <Divider
        my={28}
        color="rgba(11, 18, 32, 0.08)"
        labelPosition="center"
        styles={{ label: { display: 'none' } }}
      />

      <Group position="left" spacing={6}>
        <Text size="sm" style={{ color: 'rgba(36, 48, 68, 0.65)' }}>
          {isLogin ? 'Need an account?' : 'Already registered?'}
        </Text>
        <Anchor
          component="button"
          type="button"
          onClick={() =>
            router.push(isLogin ? '/auth/register' : '/auth/login')
          }
          fw={650}
          size="sm"
          style={{ color: 'var(--pt-teal-deep)' }}
        >
          {isLogin ? 'Create one' : 'Sign in'}
        </Anchor>
      </Group>
    </Box>
  );
}
