import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Title,
  Card,
  TextInput,
  Button,
  Group,
  Alert,
  Space,
  Select,
  Stack,
  Checkbox,
  rem
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconAlertCircle, IconUsers } from '@tabler/icons-react';
import Layout from '../components/Layout';
import { createPortfolio } from '../store/portfolioSlice';

export default function PortfolioForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    isFamilyPortfolio: false,
    familyMemberId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);

  useEffect(() => {
    if (user?.role === 'parent') {
      setLoading(true);
      // Replace with actual API call
      const mockMembers = [
        { _id: '1', name: 'Child 1' },
        { _id: '2', name: 'Child 2' },
      ];
      setTimeout(() => {
        setFamilyMembers(mockMembers);
        setLoading(false);
      }, 500); // Simulate network delay
    }
  }, [user]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dispatch(createPortfolio(formData)).unwrap();
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to create portfolio');
      setLoading(false);
    }
  };

  return (
    <Layout title="Create Portfolio">
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Title order={3} fw={600}>
                Create New Portfolio
              </Title>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => router.push('/')}
              >
                Back to Portfolios
              </Button>
            </Group>
          </Card.Section>

          <Card.Section p="md">
            <Space h="md" />
            
            {error && (
              <Alert 
                icon={<IconAlertCircle size={rem(18)} />} 
                title="Error" 
                color="red"
                mb="md"
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="lg">
                <TextInput
                  label="Portfolio Name"
                  placeholder="Enter portfolio name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  withAsterisk
                />

                {user?.role === 'parent' && (
                  <Checkbox
                    label="This is a family member's portfolio"
                    checked={formData.isFamilyPortfolio}
                    onChange={(e) => handleChange('isFamilyPortfolio', e.target.checked)}
                  />
                )}

                {formData.isFamilyPortfolio && familyMembers.length > 0 && (
                  <Select
                    label="Family Member"
                    placeholder="Select family member"
                    leftSection={<IconUsers size={16} />}
                    data={familyMembers.map(member => ({
                      value: member._id,
                      label: member.name
                    }))}
                    value={formData.familyMemberId}
                    onChange={(value) => handleChange('familyMemberId', value)}
                    required={formData.isFamilyPortfolio}
                    withAsterisk={formData.isFamilyPortfolio}
                  />
                )}

                <Group justify="flex-end" mt="xl">
                  <Button
                    type="submit"
                    leftSection={<IconPlus size={16} />}
                    loading={loading}
                    loaderProps={{ type: 'dots' }}
                    color="blue"
                    size="md"
                  >
                    Create Portfolio
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card.Section>
        </Card>
      </Container>
    </Layout>
  );
}