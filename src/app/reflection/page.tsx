import { redirect } from 'next/navigation';

export default function ReflectionRedirect() {
  redirect('/journal?tab=checkin');
}
