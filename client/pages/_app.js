import { Provider } from 'react-redux';
import { store } from '../store';
import { MantineProvider } from '@mantine/core';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          // Optional: customize your theme here
          colorScheme: 'light',
          // You can add other theme customizations
          fontFamily: 'Inter, sans-serif',
          colors: {
            // Custom color palette
            brand: ['#EBF5FF', '#D6EAF8', '#AED6F1', '#85C1E9', '#5DADE2'],
          },
          primaryColor: 'brand',
        }}
      >
        <Component {...pageProps} />
      </MantineProvider>
    </Provider>
  );
}

export default MyApp;