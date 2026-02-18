import { createClient } from '@/lib/supabase/server';
import OnboardingWizard from '@/components/brand-kit/OnboardingWizard';
import LogoutButton from '@/components/auth/LogoutButton';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function OnboardingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="relative min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 md:px-10 md:py-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 space-y-5 md:mb-12">
                    <div className="flex items-center justify-between gap-3">
                        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-gray-400 transition-colors hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="hidden text-sm font-bold uppercase tracking-widest sm:inline-block">Back to Home</span>
                        </Link>
                        <LogoutButton className="min-h-11 px-3 text-xs sm:text-sm" />
                    </div>

                    <div className="text-center">
                    <h1 className="text-[clamp(2.2rem,10vw,3.75rem)] font-black uppercase tracking-tighter">
                        Build Your Empire
                    </h1>
                    <p className="mt-3 text-[clamp(1rem,4vw,1.25rem)] text-gray-400">
                        Complete your brand profile to unlock the factory.
                    </p>
                    </div>
                </header>

                <OnboardingWizard />
            </div>
        </div>
    );
}
