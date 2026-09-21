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
  Checkbox,
  Stack,
  Loader,
  Center,
  Select,
} from '@mantine/core';
import Layout from '../../../components/Layout';
import {
  updatePortfolio,
  fetchPortfolioDetails,
} from '../../../store/portfolioSlice';
import { fetchFamilyMembers } from '../../../store/authSlice';

export default function EditPortfolioPage() {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch();
  const { currentPortfolio, loading: portfolioLoading } = useSelector(
    (state) => state.portfolio
  );
  const { isAuthenticated, hydrated, user, familyMembers } = useSelector(
    (state) => state.auth
  );
  const [formData, setFormData] = useState({
    name: '',
    isFamilyPortfolio: false,
    familyMemberId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (id) {
      dispatch(fetchPortfolioDetails(id));
    }
    if (user?.role === 'parent') {
      dispatch(fetchFamilyMembers());
    }
  }, [id, dispatch, hydrated, isAuthenticated, router, user?.role]);

  useEffect(() => {
    if (currentPortfolio && currentPortfolio._id === id) {
      setFormData({
        name: currentPortfolio.name || currentPortfolio.portfolio || '',
        isFamilyPortfolio: Boolean(currentPortfolio.isFamilyPortfolio),
        familyMemberId:
          currentPortfolio.familyMember?._id ||
          currentPortfolio.familyMember ||
          '',
      });
    }
  }, [currentPortfolio, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dispatch(
        updatePortfolio({
          portfolioId: id,
          name: formData.name,
          isFamilyPortfolio: formData.isFamilyPortfolio,
          familyMemberId: formData.isFamilyPortfolio
            ? formData.familyMemberId
            : null,
        })
      ).unwrap();

      router.push(`/portfolio/${id}`);
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'Failed to update portfolio'
      );
      setLoading(false);
    }
  };

  if (!hydrated || portfolioLoading || !currentPortfolio) {
    return (
      <Layout>
        <Center style={{ height: '60vh' }}>
          <Loader size="xl" variant="dots" />
        </Center>
      </Layout>
    );
  }

  return (
    <Layout title={`Edit ${formData.name || 'Portfolio'}`}>
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Title order={3} mb="md">
            Edit Portfolio
          </Title>

          {error && (
            <Alert color="red" mb="md" title="Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing="md">
              <TextInput
                label="Portfolio Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              {user?.role === 'parent' && (
                <Checkbox
                  label="This is a family portfolio"
                  checked={formData.isFamilyPortfolio}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isFamilyPortfolio: e.currentTarget.checked,
                    }))
                  }
                />
              )}

              {formData.isFamilyPortfolio && (
                <Select
                  label="Family Member"
                  placeholder="Select family member"
                  data={(familyMembers || []).map((m) => ({
                    value: m._id,
                    label: `${m.name} (${m.email})`,
                  }))}
                  value={formData.familyMemberId || null}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      familyMemberId: value || '',
                    }))
                  }
                  required
                />
              )}

              <Group position="right" mt="md">
                <Button
                  variant="default"
                  onClick={() => router.push(`/portfolio/${id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Container>
    </Layout>
  );
}
