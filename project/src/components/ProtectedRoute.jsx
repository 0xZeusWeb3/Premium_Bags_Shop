import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loading-grid"><span></span><span></span><span></span></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;
  return children;
}
