import { redirect } from 'next/navigation';

export default function InventoryRedirect() {
  redirect('/character?tab=inventory');
}
