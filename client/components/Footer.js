import Link from 'next/link';
import {
  Footer as MantineFooter,
  Container,
  Text,
  Group,
  Anchor,
  Divider,
  Center,
  Stack,
  useMantineTheme,
  Box
} from '@mantine/core';
import { IconExternalLink, IconHeart } from '@tabler/icons-react';

export default function Footer() {
  const theme = useMantineTheme();
  
  return (
    <Box mt={60}>
      <MantineFooter 
        height="auto" 
        p="md" 
        sx={{ 
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
          borderTop: `1px solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
          }`,
        }}
      >
        <Container size="xl">
          <Stack spacing="sm">
            <Group position="apart" align="flex-start">
              <div>
                <Text size="sm" weight={500} color={theme.colorScheme === 'dark' ? 'gray.3' : 'gray.7'}>
                  © {new Date().getFullYear()}{' '}
                  <Text component="span" color="indigo" weight={600}>
                    Portfolio Tracker
                  </Text>
                </Text>
                <Text size="xs" color="dimmed" mt={4}>
                  Market data provided by{' '}
                  <Anchor 
                    href="https://www.screener.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    size="xs"
                    color={theme.colorScheme === 'dark' ? 'blue.4' : 'blue.6'}
                  >
                    Screener <IconExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </Anchor>
                </Text>
              </div>

              <Group spacing="lg">
                <Anchor 
                  component={Link} 
                  href="/" 
                  size="sm"
                  color={theme.colorScheme === 'dark' ? 'gray.5' : 'gray.7'}
                  sx={{ '&:hover': { color: theme.colors.indigo[5] } }}
                >
                  About
                </Anchor>
                <Anchor 
                  component={Link} 
                  href="/" 
                  size="sm"
                  color={theme.colorScheme === 'dark' ? 'gray.5' : 'gray.7'}
                  sx={{ '&:hover': { color: theme.colors.indigo[5] } }}
                >
                  Privacy Policy
                </Anchor>
                <Anchor 
                  component={Link} 
                  href="/" 
                  size="sm"
                  color={theme.colorScheme === 'dark' ? 'gray.5' : 'gray.7'}
                  sx={{ '&:hover': { color: theme.colors.indigo[5] } }}
                >
                  Contact
                </Anchor>
              </Group>
            </Group>

            <Divider 
              color={theme.colorScheme === 'dark' ? 'dark.5' : 'gray.3'} 
              my="xs" 
            />

            <Center>
              <Group spacing={4}>
                <Text size="xs" color="dimmed">
                  Made with
                </Text>
                <IconHeart size={14} color={theme.colors.red[6]} fill={theme.colors.red[6]} />
                <Text size="xs" color="dimmed">
                  for smart investors
                </Text>
              </Group>
            </Center>
          </Stack>
        </Container>
      </MantineFooter>
    </Box>
  );
}