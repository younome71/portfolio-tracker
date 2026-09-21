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
  rem,
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconAlertCircle, IconUsers } from '@tabler/icons-react';
import Layout from './Layout';
import { createPortfolio } from '../store/portfolioSlice';
import { fetchFamilyMembers } from '../store/authSlice';

export default function PortfolioForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, familyMembers } = useSelector((state) => state.auth);
  const isFamilyQuery = router.query.isFamily === 'true';

  const [formData, setFormData] = useState({
    name: '',
    isFamilyPortfolio: false,
    familyMemberId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isFamilyQuery) {
      setFormData((prev) => ({ ...prev, isFamilyPortfolio: true }));
    }
  }, [isFamilyQuery]);

  useEffect(() => {
    if (user?.role === 'parent') {
      dispatch(fetchFamilyMembers());
    }
  }, [user, dispatch]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dispatch(
        createPortfolio({
          name: formData.name,
          isFamilyPortfolio: formData.isFamilyPortfolio,
          familyMemberId: formData.isFamilyPortfolio
            ? formData.familyMemberId
            : undefined,
        })
      ).unwrap();
      router.push('/');
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Failed to create portfolio');
      setLoading(false);
    }
  };

  return (
    <Layout title="Create Portfolio">
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="sm">
            <Group position="apart">
              <Title order={3} weight={600}>
                Create New Portfolio
              </Title>
              <Button
                leftIcon={<IconArrowLeft size={16} />}
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
              <Stack spacing="lg">
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
                    onChange={(e) =>
                      handleChange('isFamilyPortfolio', e.currentTarget.checked)
                    }
                  />
                )}

                {formData.isFamilyPortfolio && (
                  <Select
                    label="Family Member"
                    placeholder={
                      familyMembers?.length
                        ? 'Select family member'
                        : 'No linked family members yet'
                    }
                    icon={<IconUsers size={16} />}
                    data={(familyMembers || []).map((member) => ({
                      value: member._id,
                      label: `${member.name} (${member.email})`,
                    }))}
                    value={formData.familyMemberId}
                    onChange={(value) => handleChange('familyMemberId', value)}
                    required={formData.isFamilyPortfolio}
                    withAsterisk={formData.isFamilyPortfolio}
                    disabled={!familyMembers?.length}
                  />
                )}

                {formData.isFamilyPortfolio && !familyMembers?.length && (
                  <Alert color="yellow" title="Link a family member first">
                    Register a child account, then add them via the family
                    members API / settings before creating a family portfolio.
                  </Alert>
                )}

                <Group position="right" mt="xl">
                  <Button
                    type="submit"
                    leftIcon={<IconPlus size={16} />}
                    loading={loading}
                    color="blue"
                    size="md"
                    disabled={
                      formData.isFamilyPortfolio && !formData.familyMemberId
                    }
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
