import AuthPage from './pages/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthPage />
    </ErrorBoundary>
  );
}
