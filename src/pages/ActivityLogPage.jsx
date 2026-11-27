import { PageHeader } from '@/components/shared/PageHeader';
import { ActivityTable } from '@/components/team/Logs';

export default function ActivityLogPage() {
  return (
    <div>
      <PageHeader title="Activity Log" description="Who did what on the platform" />
      <ActivityTable />
    </div>
  );
}
