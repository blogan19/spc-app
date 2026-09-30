import Link from 'next/link';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const callbackUrl = searchParams.callbackUrl ?? '/dashboard';
  const error = searchParams.error;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-[#003087]">NHS</span>
            <span className="text-slate-300 text-xl">|</span>
            <span className="text-xl font-semibold text-slate-800">SPC Dashboard</span>
          </div>
          <p className="text-sm text-slate-500">Statistical Process Control for quality improvement</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
          <h1 className="text-base font-semibold text-slate-900 mb-6">Sign in to your account</h1>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error === 'OAuthSignin' || error === 'OAuthCallback'
                ? 'There was a problem signing in with that provider. Please try again.'
                : error === 'EmailSignin'
                  ? 'The sign-in link could not be sent. Check your email address and try again.'
                  : 'An error occurred. Please try again.'}
            </div>
          )}

          {/* Microsoft — primary for NHS */}
          <form
            action={async () => {
              'use server';
              try {
                await signIn('microsoft-entra-id', { redirectTo: callbackUrl });
              } catch (e) {
                if (e instanceof AuthError) throw e;
                throw e;
              }
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#003087] hover:bg-[#001f5c] text-white font-medium text-sm rounded-xl transition-colors"
            >
              <svg viewBox="0 0 21 21" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Sign in with Microsoft
            </button>
          </form>

          {/* Google */}
          <form
            action={async () => {
              'use server';
              try {
                await signIn('google', { redirectTo: callbackUrl });
              } catch (e) {
                if (e instanceof AuthError) throw e;
                throw e;
              }
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email magic link */}
          <form
            action={async (formData: FormData) => {
              'use server';
              try {
                await signIn('resend', { ...Object.fromEntries(formData), redirectTo: callbackUrl });
              } catch (e) {
                if (e instanceof AuthError) throw e;
                throw e;
              }
            }}
            className="space-y-3"
          >
            <label htmlFor="email" className="block text-xs font-medium text-slate-600">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@nhs.net"
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005EB8] focus:border-transparent"
            />
            <button
              type="submit"
              className="w-full px-4 py-2.5 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
            >
              Send magic link
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <Link
            href="/dashboard"
            className="block text-sm text-[#005EB8] hover:underline"
          >
            Continue without signing in →
          </Link>
          <p className="text-xs text-slate-400">
            For aggregate, anonymised NHS data only. Do not upload patient-identifiable information.
          </p>
        </div>
      </div>
    </main>
  );
}
