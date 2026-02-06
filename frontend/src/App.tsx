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
import WorkspaceLayout from './pages/Workspace';
import WorkspaceFusion from './pages/Workspace/Fusion';
import WorkspaceTags from './pages/Workspace/Tags';
import WorkspaceFavorites from './pages/Workspace/Favorites';
import WorkspaceData from './pages/Workspace/Data';
import WorkspaceImportDetail from './pages/Workspace/ImportDetail';
import WorkspacePreview from './pages/Workspace/Preview';
import ModelManagement from './pages/ModelManagement';
import SystemConfig from './pages/SystemConfig';
import SmartQA from './pages/SmartQA';
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
        <Route path="smart-qa" element={<SmartQA />} />
        <Route path="key-person-library" element={<KeyPersonLibrary />} />
        <Route path="workspace" element={<WorkspaceLayout />}>
          <Route index element={<Navigate to="/workspace/fusion" replace />} />
          <Route path="fusion" element={<WorkspaceFusion />} />
          <Route path="tags" element={<WorkspaceTags />} />
          <Route path="favorites" element={<WorkspaceFavorites />} />
          <Route path="data" element={<WorkspaceData />} />
          <Route path="models" element={<ModelManagement />} />
          <Route path="fusion/:taskId" element={<WorkspaceImportDetail />} />
          <Route path="fusion/:taskId/preview" element={<WorkspacePreview />} />
        </Route>
        <Route path="model-management" element={<Navigate to="/workspace/models" replace />} />
        <Route path="system-config" element={<AdminOnlyRoute><SystemConfig /></AdminOnlyRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
