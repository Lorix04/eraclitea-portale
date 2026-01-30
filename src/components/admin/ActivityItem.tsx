import { formatItalianDateTime } from "@/lib/date-utils";
﻿export default function ActivityItem({
  log,
}: {
  log: {
    id: string;
    action: string;
    createdAt: string;
    user: { email: string };
  };
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">{log.action}</p>
        <p className="text-xs text-muted-foreground">{log.user.email}</p>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatItalianDateTime(log.createdAt)}
      </span>
    </div>
  );
}
