import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthed } = useAuth();

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
