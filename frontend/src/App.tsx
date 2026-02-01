import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProvinceDetail from './pages/Dashboard/ProvinceDetail';
import PersonList from './pages/PersonList';
import PersonDetail from './pages/PersonDetail';
import KeyPersonLibrary from './pages/KeyPersonLibrary';
import SituationAwareness from './pages/SituationAwareness';
import NewsDetail from './pages/SituationAwareness/NewsDetail';
import Workspace from './pages/Workspace';
import WorkspaceImportDetail from './pages/Workspace/ImportDetail';
import ModelManagement from './pages/ModelManagement';
import SystemConfig from './pages/SystemConfig';
import Login from './pages/Login';

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.auth?.user);
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/province/:provinceName" element={<ProvinceDetail />} />
        <Route path="persons" element={<PersonList />} />
        <Route path="persons/:personId" element={<PersonDetail />} />
        <Route path="situation" element={<SituationAwareness />} />
        <Route path="situation/news/:newsId" element={<NewsDetail />} />
        <Route path="key-person-library" element={<KeyPersonLibrary />} />
        <Route path="workspace" element={<Workspace />} />
        <Route path="workspace/fusion/:taskId" element={<WorkspaceImportDetail />} />
        <Route path="model-management" element={<ModelManagement />} />
        <Route path="system-config" element={<AdminOnlyRoute><SystemConfig /></AdminOnlyRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
