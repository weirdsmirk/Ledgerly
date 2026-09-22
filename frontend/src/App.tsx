import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { TxModalProvider } from './components/TxFormModal';
import { SettingsModalProvider } from './components/SettingsModal';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <SettingsModalProvider>
      <TxModalProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<Navigate to="/transactions" replace />} />
            <Route path="/transactions/:id/edit" element={<Navigate to="/transactions" replace />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TxModalProvider>
    </SettingsModalProvider>
  );
}
