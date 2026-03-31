import { AppProvider, useApp } from './context';
import Dashboard from './screens/Dashboard';
import Plans from './screens/Plans';
import PlanDetail from './screens/PlanDetail';
import ExerciseConfigurator from './screens/ExerciseConfigurator';
import ActiveWorkout from './screens/ActiveWorkout';
import History from './screens/History';
import Calories from './screens/Calories';
import Settings from './screens/Settings';
import PWABadge from './PWABadge.tsx';
import InstallPrompt from './components/InstallPrompt';
import './App.css';

function Router() {
  const { route } = useApp();

  switch (route.screen) {
    case 'dashboard':
      return <Dashboard />;
    case 'plans':
      return <Plans />;
    case 'plan-detail':
      return <PlanDetail planId={route.planId} />;
    case 'exercise-config':
      return <ExerciseConfigurator planId={route.planId} planExerciseId={route.planExerciseId} />;
    case 'active-workout':
      return <ActiveWorkout />;
    case 'history':
    case 'history-detail':
      return <History />;
    case 'calories':
      return <Calories />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <InstallPrompt />
      <PWABadge />
    </AppProvider>
  );
}
