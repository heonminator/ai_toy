import TaskDetailClient from "./task-detail-client";

export const revalidate = 60;

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TaskDetailClient slug={slug} />;
}
