import GameHUD from '@/components/GameHUD';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import QuestGiver from '@/components/QuestGiver';
import LevelUpModal from '@/components/LevelUpModal';
import AchievementsList from '@/components/AchievementsList';
import Shop from '@/components/Shop';
import SoundManager from '@/components/SoundManager';
import ConfettiManager from '@/components/ConfettiManager';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-[url('/grid.svg')]">
      <LevelUpModal />
      <div className="container max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">
            NEXUS TRACKER
          </h1>
          <p className="text-gray-400">Gamify your productivity protocol</p>
        </header>

        <GameHUD />
        <QuestGiver />

        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span className="text-primary">///</span> ACTIVE QUESTS
          </h2>
          <TaskInput />
          <TaskList />
        </div>

        <Shop />
        <AchievementsList />
        <AnalyticsDashboard />
      </div>

      {/* Headless Managers */}
      <SoundManager />
      <ConfettiManager />
    </main>
  );
}
