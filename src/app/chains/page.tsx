import { redirect } from 'next/navigation';

export default function ChainsRedirect() {
  redirect('/quests?tab=chains');
}
