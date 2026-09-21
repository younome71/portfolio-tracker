import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, title = 'Portfolio Tracker' }) {
  return (
    <div className="pt-app-shell">
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="Track your family's investments in one place."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className="pt-app-main">{children}</main>

      <Footer />
    </div>
  );
}
