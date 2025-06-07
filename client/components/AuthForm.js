import { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { loginUser, registerUser } from '../store/authSlice';
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Alert,
  Container,
  Divider,
  Box,
  Group,
  rem
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconAt, IconLock, IconUser } from '@tabler/icons-react';

export default function AuthForm({ isLogin = true }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      name: ''
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length >= 6 ? null : 'Password must be at least 6 characters'),
      ...(!isLogin ? {
        name: (val) => (val.trim().length >= 2 ? null : 'Name must be at least 2 characters')
      } : {})
    }
  });

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');
      
      if (isLogin) {
        await dispatch(loginUser({ email: values.email, password: values.password })).unwrap();
      } else {
        await dispatch(registerUser(values)).unwrap();
      }
      
      router.push('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={460} my={40}>
      <Box mb="xl" ta="center">
        <Title order={1} fw={700} color="indigo">
          {isLogin ? 'Welcome Back' : 'Get Started'}
        </Title>
        <Text c="dimmed" fz="sm" mt={5}>
          {isLogin ? 'Sign in to continue to your account' : 'Create an account to get started'}
        </Text>
      </Box>

      <Card withBorder shadow="sm" radius="md" p="lg">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500} ta="center">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Text>
        </Card.Section>
        
        <Box mt="md">
          {error && (
            <Alert 
              icon={<IconAlertCircle size="1rem" />} 
              title="Error" 
              color="red" 
              mb="md"
              variant="light"
            >
              {error}
            </Alert>
          )}
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              {!isLogin && (
                <TextInput
                  label="Full Name"
                  placeholder="Your name"
                  icon={<IconUser size="1rem" />}
                  radius="md"
                  {...form.getInputProps('name')}
                />
              )}
              
              <TextInput
                label="Email Address"
                placeholder="hello@example.com"
                icon={<IconAt size="1rem" />}
                radius="md"
                {...form.getInputProps('email')}
              />
              
              <PasswordInput
                label="Password"
                placeholder="Your password"
                icon={<IconLock size="1rem" />}
                radius="md"
                {...form.getInputProps('password')}
                description={!isLogin && "Minimum 6 characters"}
              />
              
              {isLogin && (
                <Box ta="right">
                  <Anchor component="button" type="button" size="sm" c="indigo">
                    Forgot password?
                  </Anchor>
                </Box>
              )}
              
              <Button 
                type="submit" 
                loading={loading}
                fullWidth 
                mt="lg"
                size="md"
                radius="md"
                color="indigo"
              >
                {isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </Stack>
          </form>
          
          <Divider 
            my="lg" 
            labelPosition="center" 
            label={
              <Text c="dimmed" fz="sm">
                {isLogin ? 'New to our platform?' : 'Already have an account?'}
              </Text>
            } 
          />
          
          <Group position="center" spacing="xs">
            <Text fz="sm" c="dimmed">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <Anchor 
              component="button" 
              type="button" 
              onClick={() => router.push(isLogin ? '/auth/register' : '/auth/login')}
              fw={600}
              c="indigo"
              fz="sm"
            >
              {isLogin ? 'Register' : 'Login'}
            </Anchor>
          </Group>
        </Box>
      </Card>
      
      {!isLogin && (
        <Text c="dimmed" fz="xs" mt="xl" ta="center">
          By registering, you agree to our Terms of Service and Privacy Policy
        </Text>
      )}
    </Container>
  );
}