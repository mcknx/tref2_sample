'use server';

import { createClient } from '@/lib/supabase/server';
import { BrandProfile } from '@/types/brand';
import { redirect } from 'next/navigation';

export async function saveBrand(profile: Partial<BrandProfile>) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    // 1. Prepare data for insertion
    // Ensure all required fields are present or have defaults
    const brandData = {
        user_id: user.id,
        business_name: profile.business_name,
        tagline: profile.tagline,
        description: profile.description,
        industry: profile.industry,
        logo_url: profile.logo_url,
        colors: profile.colors,
        typography: profile.typography, // { heading, body }
        contact_info: profile.contact_info, // jsonb
        social_links: profile.social_links, // jsonb
    };

    // 2. Insert into 'brands' table
    // Using upsert in case user is updating (though mostly for initial creation)
    const { error } = await supabase
        .from('brands')
        .upsert(brandData, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) {
        console.error('Error saving brand:', error);
        throw new Error('Failed to save brand profile');
    }

    // 3. Redirect to dashboard
    redirect('/dashboard');
}
