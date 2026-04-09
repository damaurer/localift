import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
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
import {AppProvider} from "./contexts/AppProvider.tsx";

export default function App() {
  return (
    <Router>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/plans/:planId" element={<PlanDetail />} />
            <Route path="/plans/:planId/exercise/:planExerciseId" element={<ExerciseConfigurator />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:sessionId" element={<History />} />
            <Route path="/calories" element={<Calories />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
          <Route path="/workout" element={<ActiveWorkout />} />
        </Routes>
        <InstallPrompt />
        <PWABadge />
      </AppProvider>
    </Router>
  );
}
