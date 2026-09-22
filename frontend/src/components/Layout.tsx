import { NavLink } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { useSettingsModal } from './SettingsModal';

const NAV: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Overview', icon: 'grid' },
  { to: '/transactions', label: 'Transactions', icon: 'swap' },
  { to: '/accounts', label: 'Accounts', icon: 'wallet' },
  { to: '/budgets', label: 'Budgets', icon: 'piggy' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/analytics', label: 'Analytics', icon: 'chart' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { openSettings } = useSettingsModal();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${collapsed ? 'rail' : ''}`}>
        <NavLink to="/" className="brand">
          <span className="brand-mark">$</span>
          <span className="brand-name">ledgerly</span>
        </NavLink>
        <button type="button" className="collapse-btn" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name="collapse" size={18} />
          <span>Collapse</span>
        </button>

        <nav className="side-nav" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-ico"><Icon name={item.icon} size={20} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <div className="side-status"><span className="pulse" /> Local &amp; private</div>
          <div className="user-row">
            <button type="button" className="user-gear" onClick={openSettings} aria-label="Open settings">
              <Icon name="gear" size={19} />
            </button>
            <span className="avatar">JD</span>
            <div className="user-meta">
              <div className="user-name">Jordan Davis</div>
              <div className="user-sub">Personal workspace</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
