import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, title = 'Portfolio Tracker' }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Track your investment portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}
