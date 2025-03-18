import { Metadata } from 'next';
import { AttendanceConfigForm } from '@/components/settings/AttendanceConfigForm';

export const metadata: Metadata = {
  title: 'Settings | Attendance Admin',
  description: 'Manage attendance settings',
};

export default function SettingsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Attendance Settings</h1>
      <AttendanceConfigForm />
    </div>
  );
}
