import SharedProjectView from './SharedProjectView';

export default function SharePage({ params }: { params: { token: string } }) {
  return <SharedProjectView token={params.token} />;
}
