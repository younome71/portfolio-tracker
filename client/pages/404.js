import Link from 'next/link';
import Layout from '../components/Layout';

export default function NotFoundPage() {
  return (
    <Layout title="Page Not Found">
      <div className="flex flex-col items-center justify-center h-96">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page Not Found</p>
        <Link href="/" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Go Back Home
        </Link>
      </div>
    </Layout>
  );
}
