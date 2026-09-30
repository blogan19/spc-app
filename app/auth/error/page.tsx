import Link from 'next/link';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  const message =
    error === 'Configuration'
      ? 'There is a problem with the server configuration. Please contact support.'
      : error === 'AccessDenied'
        ? 'Access was denied. You may not have permission to sign in.'
        : error === 'Verification'
          ? 'The sign-in link has expired or has already been used. Please request a new one.'
          : 'An unexpected error occurred. Please try signing in again.';

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-4xl">⚠️</div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Sign-in error</h1>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003087] hover:bg-[#001f5c] text-white text-sm font-medium rounded-xl transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
