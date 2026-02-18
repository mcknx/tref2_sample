export interface BrandColors {
  primaryText: string;   // Primary brand color (dominant logo color)
  text?: string;         // Secondary text color (secondary logo color)
  background: string;    // Background color (default white)
}

export interface BrandContactInfo {
  phone?: string;
  website?: string;
  address?: string;
  email?: string;
}

export interface BrandSocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
}

export interface BrandProfile {
  id?: string;
  user_id?: string;
  business_name: string;
  tagline?: string;
  description?: string;
  logo_url: string;
  colors: BrandColors;
  contact_info?: BrandContactInfo; // stored as jsonb
  social_links?: BrandSocialLinks; // stored as jsonb
  industry?: string; // New field
  typography?: {
    heading: string;
    body: string;
  };
}
