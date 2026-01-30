type CourseCardProps = {
  title: string;
  description?: string;
  badge?: string;
};

export default function CourseCard({ title, description, badge }: CourseCardProps) {
  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
