import { useState, useEffect } from 'react';
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
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
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setScreen('dashboard');
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex min-w-0">
      <Sidebar active={screen} onNavigate={setScreen} isAdmin={isAdmin} />
      <div className="flex-1 min-w-0">
        <Header title={screen.charAt(0).toUpperCase() + screen.slice(1)} userName={user.name} onLogout={handleLogout} />
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
        <Footer />
      </div>
      {isAdmin && showDebug && <SystemStatus />}
    </div>
  );
}

export default App;