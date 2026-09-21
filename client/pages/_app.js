import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../store';
import { rehydrateAuth } from '../store/authSlice';
import { MantineProvider } from '@mantine/core';
import '../styles/globals.css';

const tealScale = [
  '#f0fdfa',
  '#ccfbf1',
  '#99f6e4',
  '#5eead4',
  '#2dd4bf',
  '#14b8a6',
  '#0f766e',
  '#0b5f59',
  '#134e4a',
  '#042f2e',
];

function AuthBootstrap({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(rehydrateAuth());
  }, [dispatch]);

  return children;
}

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          colorScheme: 'light',
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          headings: {
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700,
          },
          primaryColor: 'teal',
          colors: {
            teal: tealScale,
            brand: tealScale,
          },
          defaultRadius: 'md',
          primaryShade: 6,
        }}
      >
        <AuthBootstrap>
          <Component {...pageProps} />
        </AuthBootstrap>
      </MantineProvider>
    </Provider>
  );
}

export default MyApp;
