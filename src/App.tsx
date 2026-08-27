import { useState } from 'react';
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';
import Login, { type AuthUser } from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import ComposeBroadcast from './components/compose/ComposeBroadcast';
import FeeTracker from './components/fees/FeeTracker';
import StudentList from './components/students/StudentList';
import MessageHistory from './components/history/MessageHistory';
import Settings from './components/settings/Settings';
import SystemStatus from './components/shared/SystemStatus';
import TeacherDashboard from './components/teacher/TeacherDashboard';

type Screen = 'compose' | 'fees' | 'students' | 'dashboard' | 'history' | 'settings';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex">
      <Sidebar active={screen} onNavigate={setScreen} isAdmin={isAdmin} />
      <div className="flex-1">
        <Header title={screen.charAt(0).toUpperCase() + screen.slice(1)} />
        <main className="p-4 md:p-6 pb-20 md:pb-6">
  {isAdmin ? (
    <>
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'compose' && <ComposeBroadcast />}
      {screen === 'fees' && <FeeTracker />}
      {screen === 'students' && <StudentList />}
      {screen === 'history' && <MessageHistory />}
      {screen === 'settings' && <Settings />}
    </>
  ) : (
    <TeacherDashboard assignedClasses={user.assignedClasses} />
  )}
</main>
      </div>
      {isAdmin && <SystemStatus />}
    </div>
  );
}

export default App;