import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import Layout from '../../../components/Layout';
import { updatePortfolio, fetchPortfolioDetails } from '../../../store/portfolioSlice';

export default function EditPortfolioPage() {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch();
  const { currentPortfolio } = useSelector(state => state.portfolio);
  const [formData, setFormData] = useState({
    name: '',
    isFamilyPortfolio: false,
    familyMemberId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchPortfolioDetails(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentPortfolio) {
      setFormData({
        name: currentPortfolio.name,
        isFamilyPortfolio: currentPortfolio.isFamilyPortfolio,
        familyMemberId: currentPortfolio.familyMember?._id || ''
      });
    }
  }, [currentPortfolio]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dispatch(updatePortfolio({
        portfolioId: id,
        ...formData
      })).unwrap();
      
      router.push(`/portfolio/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to update portfolio');
      setLoading(false);
    }
  };

  if (!currentPortfolio) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Edit ${currentPortfolio.name}`}>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Edit Portfolio</h2>
        
        {error && (
          <div className="mb-4 p-2 text-red-600 bg-red-100 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="name">Portfolio Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isFamilyPortfolio"
                checked={formData.isFamilyPortfolio}
                onChange={handleChange}
                className="mr-2"
              />
              <span>This is a family portfolio</span>
            </label>
          </div>

          {formData.isFamilyPortfolio && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="familyMemberId">Family Member</label>
              <input
                type="text"
                id="familyMemberId"
                name="familyMemberId"
                value={formData.familyMemberId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
                placeholder="Family member ID"
              />
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/portfolio/${id}`)}
              className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition ${
                loading ? 'opacity-50' : ''
              }`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}