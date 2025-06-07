import PortfolioForm from '../../components/PortfolioForm';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function NewPortfolioPage() {
  return (
    <ProtectedRoute>
      <PortfolioForm />
    </ProtectedRoute>
  );
}
