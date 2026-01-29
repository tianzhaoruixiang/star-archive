import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PersonList from './pages/PersonList';
import PersonDetail from './pages/PersonDetail';
import Login from './pages/Login';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="persons" element={<PersonList />} />
        <Route path="persons/:personId" element={<PersonDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
