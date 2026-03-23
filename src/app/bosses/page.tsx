import { redirect } from 'next/navigation';

export default function BossesRedirect() {
  redirect('/quests?tab=bosses');
}
