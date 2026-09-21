import { Container, Text, Group, Anchor, Box } from '@mantine/core';

export default function Footer() {
  return (
    <Box
      component="footer"
      py="lg"
      style={{
        borderTop: '1px solid var(--pt-line)',
        background: 'rgba(255,255,255,0.5)',
      }}
    >
      <Container size="xl">
        <Group position="apart" align="flex-start">
          <div>
            <Text
              className="pt-display"
              fw={700}
              size="sm"
              style={{ color: 'var(--pt-ink)' }}
            >
              Portfolio Tracker
            </Text>
            <Text size="xs" mt={4} style={{ color: 'var(--pt-ink-soft)' }}>
              Family-first portfolio tracking for Indian investors.
            </Text>
          </div>
          <Group spacing="lg">
            <Anchor
              href="https://finance.yahoo.com/"
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              style={{ color: 'var(--pt-ink-soft)' }}
            >
              Market data via Yahoo Finance
            </Anchor>
            <Text size="xs" style={{ color: 'var(--pt-ink-soft)' }}>
              © {new Date().getFullYear()}
            </Text>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
