import { BrandProfile } from "@/types/brand";

/**
 * Injects user data into a Fabric.js JSON template by matching Object IDs.
 * 
 * Mappings:
 * - #name -> profile.business_name
 * - #title -> profile.tagline
 * - #phone -> profile.contact_info.phone
 * - #email -> profile.contact_info.email
 * - #website -> profile.contact_info.website
 * - #address -> profile.contact_info.address
 * - #primary (colors) -> profile.colors.background (fill)
 * - #secondary (colors) -> profile.colors.primaryText (fill)
 */
export function injectData(templateJson: any, profile: Partial<BrandProfile>) {
    // Deep clone to avoid mutating original
    const json = JSON.parse(JSON.stringify(templateJson));

    if (!json.objects) return json;

    json.objects.forEach((obj: any) => {
        if (!obj.id) return;

        // TEXT REPLACEMENTS
        if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
            if (obj.id === "#name" && profile.business_name) {
                obj.text = profile.business_name;
            }
            if (obj.id === "#title" && profile.tagline) {
                obj.text = profile.tagline;
            }
            if (obj.id === "#phone" && profile.contact_info?.phone) {
                obj.text = profile.contact_info.phone;
            }
            if (obj.id === "#email" && profile.contact_info?.email) {
                obj.text = profile.contact_info.email;
            }
            if (obj.id === "#website" && profile.contact_info?.website) {
                obj.text = profile.contact_info.website;
            }
            if (obj.id === "#address" && profile.contact_info?.address) {
                obj.text = profile.contact_info.address;
            }
            // Apply primary text color to all text
            if (profile.colors?.primaryText) {
                obj.fill = profile.colors.primaryText;
            }
        }

        // COLOR REPLACEMENTS
        if (obj.id === "#primary" && profile.colors?.background) {
            obj.fill = profile.colors.background;
        }
        if (obj.id === "#secondary" && profile.colors?.primaryText) {
            obj.fill = profile.colors.primaryText;
        }
    });

    return json;
}
