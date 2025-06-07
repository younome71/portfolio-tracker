import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="Track your investment portfolio" />
      </Head>
      <body className="bg-gray-50">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
