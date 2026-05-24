import ProjectShell from './ProjectShell';

export default function ProjectByIdPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProjectShell projectId={params.id} />;
}
