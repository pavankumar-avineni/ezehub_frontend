import { PageHeader } from '@/components/shared/PageHeader';
import { LoginHistoryTable } from '@/components/team/Logs';

export default function LoginHistoryPage() {
  return (
    <div>
      <PageHeader title="Sign-in History" description="Successful and failed employee sign-ins" />
      <LoginHistoryTable />
    </div>
  );
}
