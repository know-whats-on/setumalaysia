import './polyfill';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PwaHead } from './components/pwa-head';

export default function App() {
  return (
    <>
      <PwaHead />
      <RouterProvider router={router} />
    </>
  );
}