"use client";

import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ColorExtractor from "./ColorExtractor";
import { ArrowRight, ArrowLeft, Check, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveBrand } from "@/actions/save-brand";
import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- Components ---

function NeoInput({ label, value, onChange, placeholder, type = "text", icon: Icon, required = false }: any) {
    return (
        <div className="group">
            <Label className="mb-2 block text-sm font-bold text-pop-teal uppercase tracking-wider">
                {label} {required && <span className="text-pop-pink">*</span>}
            </Label>
            <div className="relative">
                <input
                    type={type}
                    className="w-full rounded-full border-4 border-transparent bg-[#1a2438] px-6 py-4 text-lg font-bold text-white placeholder-gray-500 shadow-inner transition-all focus:border-primary focus:bg-[#1a2438] focus:outline-none focus:ring-0 group-hover:scale-[1.01]"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                />
                {Icon && <Icon className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />}
            </div>
        </div>
    );
}

function NeoTextarea({ label, value, onChange, placeholder }: any) {
    return (
        <div className="group">
            <Label className="mb-2 block text-sm font-bold text-pop-teal uppercase tracking-wider">{label}</Label>
            <textarea
                className="w-full rounded-3xl border-4 border-transparent bg-[#1a2438] px-6 py-4 text-lg font-medium text-white placeholder-gray-500 shadow-inner transition-all focus:border-primary focus:bg-[#1a2438] focus:outline-none focus:ring-0 min-h-[120px]"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    );
}

// --- Color Swatch Picker (design.com style) ---
function ColorSwatchPicker({
    label,
    description,
    extractedColors,
    selectedColor,
    onSelect,
}: {
    label: string;
    description: string;
    extractedColors: string[];
    selectedColor: string;
    onSelect: (color: string) => void;
}) {
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-black text-white">{label}</h3>
                <p className="text-sm text-gray-400 mt-1">{description}</p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                {/* Add custom color button */}
                <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                    <PopoverTrigger asChild>
                        <button className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 hover:bg-white/5 transition-all">
                            <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3 bg-[#1a2438] border-white/10 rounded-xl shadow-2xl">
                        <HexColorPicker color={selectedColor} onChange={onSelect} />
                        <div className="mt-3">
                            <input
                                type="text"
                                value={selectedColor}
                                onChange={(e) => onSelect(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono text-center uppercase"
                            />
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Extracted color swatches */}
                {extractedColors.map((color, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(color)}
                        className={cn(
                            "relative w-14 h-14 rounded-2xl border-4 transition-all transform hover:scale-110",
                            selectedColor === color
                                ? "border-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110"
                                : "border-white/10 hover:border-white/30"
                        )}
                        style={{ backgroundColor: color }}
                    >
                        {selectedColor === color && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Show selected color info */}
            {selectedColor && (
                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <div className="w-8 h-8 rounded-lg border-2 border-white/20" style={{ backgroundColor: selectedColor }}></div>
                    <span className="font-mono text-sm font-bold text-gray-300 uppercase">{selectedColor}</span>
                </div>
            )}
        </div>
    );
}

// --- Steps ---

// --- Imports ---
import FinalizedCardsGrid from "@/components/business-card/FinalizedCardsGrid";

const STEPS = [
    { id: 1, title: "Core Identity", description: "Who are you?" },
    { id: 2, title: "Visuals", description: "Look & Feel" },
    { id: 3, title: "Contact", description: "Get in touch" },
    { id: 4, title: "Socials", description: "Connect" },
    { id: 5, title: "Cards", description: "Design" },
];

export default function OnboardingWizard() {
    const { profile, updateProfile, setStep, currentStep } = useBrandStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false);

    // Extracted palette colors from logo (candidates for user to pick from)
    const [extractedColors, setExtractedColors] = useState<string[]>([]);
    // Sub-step within step 2: 'upload' | 'text-color' | 'bg-color'
    const [visualSubStep, setVisualSubStep] = useState<'upload' | 'text-color' | 'bg-color'>('upload');

    // Step 5 State
    const [activeTemplate, setActiveTemplate] = useState<any>(null);
    const [canvasInstance, setCanvasInstance] = useState<any>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const handleColorsExtracted = useCallback((colors: string[]) => {
        setExtractedColors(colors);
        // Auto-select first two as defaults if not yet set
        if (colors.length >= 2) {
            const currentColors = profile.colors;
            if (!currentColors?.primaryText || currentColors.primaryText === '#1e293b') {
                updateProfile({
                    colors: {
                        primaryText: colors[0],
                        text: colors[1] || colors[0],
                        background: '#ffffff',
                    }
                });
            }
        }
        // Auto-advance to text-color sub-step
        setVisualSubStep('text-color');
    }, [profile.colors, updateProfile]);

    const handleNext = () => {
        // Handle sub-steps within step 2
        if (currentStep === 2) {
            if (visualSubStep === 'upload') { setVisualSubStep('text-color'); return; }
            if (visualSubStep === 'text-color') { setVisualSubStep('bg-color'); return; }
            // bg-color → go to step 3
        }
        if (currentStep < 5) setStep(currentStep + 1);
    };

    const handleBack = () => {
        // Handle sub-steps within step 2
        if (currentStep === 2) {
            if (visualSubStep === 'bg-color') { setVisualSubStep('text-color'); return; }
            if (visualSubStep === 'text-color') { setVisualSubStep('upload'); return; }
            // upload → go to step 1
        }
        if (currentStep > 1) setStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await saveBrand(profile);
            setHasCompleted(true);
        } catch (error) {
            console.error(error);
            alert("Failed to save brand. Please try again.");
            setIsSubmitting(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Failed to read logo file"));
                reader.readAsDataURL(file);
            });

            updateProfile({ logo_url: dataUrl });
        } catch (error) {
            console.error("Failed to load logo", error);
        } finally {
            e.target.value = "";
        }
    };

    const router = useRouter(); // requires import from next/navigation

    if (hasCompleted) {
        return (
            <div className="relative flex min-h-[600px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white/10 bg-background-dark p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500 sm:p-6 md:rounded-[3rem] md:p-10 lg:p-14">
                <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

                <div className="z-10 bg-green-500/20 p-6 rounded-full border-4 border-green-500 mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                    <Check className="w-16 h-16 text-green-500" />
                </div>

                <h2 className="z-10 mb-4 text-[clamp(1.6rem,6vw,2.4rem)] font-black tracking-tight text-white">You're All Set!</h2>
                <p className="z-10 text-lg text-gray-400 max-w-md mb-10">
                    Your brand identity has been securely locked in. You are now ready to start generating assets.
                </p>

                <Button
                    onClick={() => router.push('/dashboard')}
                    className="z-10 h-12 w-full max-w-sm px-8 text-base font-bold rounded-full bg-primary text-white shadow-neo-primary transition-transform hover:scale-105 md:h-14 md:text-lg"
                >
                    Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        );
    }

    return (
        <div id="wizard" className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2rem] border-4 border-white/10 bg-background-dark p-4 shadow-2xl sm:p-6 md:rounded-[3rem] md:p-10 lg:p-14">
            {/* Background Grid */}
            <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

            {/* Header / Stepper */}
            <div className="relative z-10 mb-4 flex flex-wrap gap-2 sm:gap-3">
                {STEPS.map((s) => (
                    <div
                        key={s.id}
                        onClick={() => setStep(s.id)}
                        className={cn("flex min-h-11 items-center gap-2 rounded-full border-2 px-3 py-2 transition-colors cursor-pointer hover:bg-white/5 sm:px-4", currentStep === s.id ? "bg-white/10 border-primary text-white" : "border-transparent text-gray-500")}
                    >
                        <span className={cn("size-6 rounded-full flex items-center justify-center text-xs font-bold", currentStep === s.id ? "bg-primary text-white" : "bg-white/10")}>{s.id}</span>
                        <span className="text-sm font-bold uppercase hidden md:block">{s.title}</span>
                    </div>
                ))}
            </div>

            {currentStep === 5 ? (
                <div className="relative z-10 flex flex-col gap-8 flex-grow h-full animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex-grow overflow-y-auto -mx-4 px-4 pb-4 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:-mx-14 lg:px-14">
                        <FinalizedCardsGrid />
                    </div>
                </div>
            ) : (

                /* NORMAL SPLIT LAYOUT (Steps 1-4) */
                <div className="relative z-10 grid flex-grow gap-8 lg:grid-cols-2 lg:gap-12">
                    {/* Left Col: Form */}
                    <div className="flex flex-col gap-8">

                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">

                                <h2 className="text-[clamp(1.35rem,5vw,1.95rem)] font-black text-white">Let&apos;s define your core identity.</h2>
                                <NeoInput
                                    label="Business Name"
                                    placeholder="e.g. Space Penguins Inc."
                                    value={profile.business_name || ""}
                                    onChange={(e: any) => updateProfile({ business_name: e.target.value })}
                                    required
                                />
                                <NeoInput
                                    label="Tagline"
                                    placeholder="e.g. Slide into the future"
                                    value={profile.tagline || ""}
                                    onChange={(e: any) => updateProfile({ tagline: e.target.value })}
                                />
                                <div className="group">
                                    <Label className="mb-2 block text-sm font-bold text-pop-teal uppercase tracking-wider">Industry</Label>
                                    {(() => {
                                        const INDUSTRIES = ["Consumer Tech", "SaaS", "Retail / Fashion", "Food & Beverage", "Consulting"];
                                        const isCustom = (profile.industry && !INDUSTRIES.includes(profile.industry)) || false;
                                        const showInput = isCustom;

                                        if (showInput) {
                                            return (
                                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <Label className="block text-sm font-bold text-pop-teal uppercase tracking-wider">Specify Industry</Label>
                                                        <button
                                                            onClick={() => updateProfile({ industry: "" })}
                                                            className="text-xs text-gray-400 hover:text-white underline"
                                                        >
                                                            Back to List
                                                        </button>
                                                    </div>
                                                    <NeoInput
                                                        label=""
                                                        placeholder="e.g. Space Mining"
                                                        value={profile.industry || ""}
                                                        onChange={(e: any) => updateProfile({ industry: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-4">
                                                <select
                                                    className="w-full rounded-full border-4 border-transparent bg-[#1a2438] px-6 py-4 text-lg font-bold text-white shadow-inner focus:border-primary focus:outline-none appearance-none cursor-pointer hover:bg-[#232d42] transition-colors"
                                                    value={profile.industry || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "Other") {
                                                            updateProfile({ industry: " " });
                                                        } else {
                                                            updateProfile({ industry: val });
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Select your industry</option>
                                                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                                                    <option value="Other" className="font-bold text-pop-pink">Other (Type own)</option>
                                                </select>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <NeoTextarea
                                    label="Brand Description"
                                    placeholder="Briefly describe what you do..."
                                    value={profile.description || ""}
                                    onChange={(e: any) => updateProfile({ description: e.target.value })}
                                />
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                {/* Sub-step indicator */}
                                {profile.logo_url && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <span className={cn(visualSubStep === 'upload' ? 'text-primary' : 'text-gray-400')}>Upload</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span className={cn(visualSubStep === 'text-color' ? 'text-primary' : 'text-gray-400')}>Text Color</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span className={cn(visualSubStep === 'bg-color' ? 'text-primary' : 'text-gray-400')}>Background Color</span>
                                    </div>
                                )}

                                {visualSubStep === 'upload' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <h2 className="text-3xl font-black text-white">Upload Your Logo.</h2>
                                        <p className="text-gray-400">We&apos;ll extract colors from your logo so you can pick your brand colors.</p>
                                        <div className="group">
                                            <Label className="mb-2 block text-sm font-bold text-pop-pink uppercase tracking-wider">Logo Image</Label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    accept="image/*"
                                                    className="w-full rounded-full border-4 border-transparent bg-[#1a2438] px-6 py-4 text-sm font-bold text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                                                />
                                                {profile.logo_url && (
                                                    <ColorExtractor
                                                        imageSrc={profile.logo_url}
                                                        onColorsExtracted={handleColorsExtracted}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {visualSubStep === 'text-color' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                                            {profile.logo_url && (
                                                <div className="flex items-center gap-3">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={profile.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-xl bg-white/5 p-2" />
                                                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary/90">
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Replace
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-2xl font-black text-white">Primary color</h2>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Choose from the extracted colors or click the plus icon to add your own.
                                                </p>
                                            </div>
                                        </div>
                                        <ColorSwatchPicker
                                            label=""
                                            description=""
                                            extractedColors={extractedColors}
                                            selectedColor={profile.colors?.primaryText || extractedColors[0] || '#1e293b'}
                                            onSelect={(color) => updateProfile({
                                                colors: {
                                                    ...profile.colors!,
                                                    primaryText: color,
                                                    text: profile.colors?.text || extractedColors[1] || color,
                                                    background: profile.colors?.background || '#ffffff'
                                                }
                                            })}
                                        />
                                        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                                            <Button
                                                variant="ghost"
                                                className="text-gray-400 hover:text-white"
                                                onClick={() => setVisualSubStep('upload')}
                                            >
                                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                            </Button>
                                            <Button
                                                onClick={() => setVisualSubStep('bg-color')}
                                                className="h-12 w-full rounded-full bg-primary px-8 font-bold text-white hover:bg-primary/90 sm:w-auto"
                                            >
                                                Continue <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {visualSubStep === 'bg-color' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                                            {profile.logo_url && (
                                                <div className="flex items-center gap-3">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={profile.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-xl bg-white/5 p-2" />
                                                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary/90">
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Replace
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-2xl font-black text-white">Background color</h2>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Choose the background color for your business card designs.
                                                </p>
                                            </div>
                                        </div>
                                        <ColorSwatchPicker
                                            label=""
                                            description=""
                                            extractedColors={extractedColors}
                                            selectedColor={profile.colors?.background || '#ffffff'}
                                            onSelect={(color) => updateProfile({
                                                colors: {
                                                    ...profile.colors!,
                                                    primaryText: profile.colors?.primaryText || extractedColors[0] || '#1e293b',
                                                    text: profile.colors?.text || extractedColors[1] || profile.colors?.primaryText || extractedColors[0] || '#1e293b',
                                                    background: color
                                                }
                                            })}
                                        />
                                        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                                            <Button
                                                variant="ghost"
                                                className="text-gray-400 hover:text-white"
                                                onClick={() => setVisualSubStep('text-color')}
                                            >
                                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                <h2 className="text-[clamp(1.35rem,5vw,1.95rem)] font-black text-white">Contact Details.</h2>
                                <NeoInput
                                    label="Public Email"
                                    placeholder="hello@company.com"
                                    type="email"
                                    value={profile.contact_info?.email || ""}
                                    onChange={(e: any) => updateProfile({ contact_info: { ...profile.contact_info, email: e.target.value } })}
                                />
                                <NeoInput
                                    label="Phone Number"
                                    placeholder="+1 (555) 000-0000"
                                    value={profile.contact_info?.phone || ""}
                                    onChange={(e: any) => updateProfile({ contact_info: { ...profile.contact_info, phone: e.target.value } })}
                                />
                                <NeoInput
                                    label="Website"
                                    placeholder="https://..."
                                    value={profile.contact_info?.website || ""}
                                    onChange={(e: any) => updateProfile({ contact_info: { ...profile.contact_info, website: e.target.value } })}
                                />
                                <NeoInput
                                    label="Physical Address"
                                    placeholder="123 Innovation Dr..."
                                    value={profile.contact_info?.address || ""}
                                    onChange={(e: any) => updateProfile({ contact_info: { ...profile.contact_info, address: e.target.value } })}
                                />
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                <h2 className="text-[clamp(1.35rem,5vw,1.95rem)] font-black text-white">Social Presence.</h2>
                                <NeoInput
                                    label="Instagram Handle"
                                    placeholder="@username"
                                    value={profile.social_links?.instagram || ""}
                                    onChange={(e: any) => updateProfile({ social_links: { ...profile.social_links, instagram: e.target.value } })}
                                />
                                <NeoInput
                                    label="Twitter / X"
                                    placeholder="@username"
                                    value={profile.social_links?.twitter || ""}
                                    onChange={(e: any) => updateProfile({ social_links: { ...profile.social_links, twitter: e.target.value } })}
                                />
                                <NeoInput
                                    label="Facebook"
                                    placeholder="facebook.com/..."
                                    value={profile.social_links?.facebook || ""}
                                    onChange={(e: any) => updateProfile({ social_links: { ...profile.social_links, facebook: e.target.value } })}
                                />
                                <NeoInput
                                    label="LinkedIn"
                                    placeholder="linkedin.com/in/..."
                                    value={profile.social_links?.linkedin || ""}
                                    onChange={(e: any) => updateProfile({ social_links: { ...profile.social_links, linkedin: e.target.value } })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Col: Preview */}
                    <div className="flex flex-col gap-6">
                        <LivePreview />
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hidden lg:block">
                            <Label className="mb-4 block text-xs font-bold text-gray-400 uppercase tracking-wider">Brand Colors</Label>
                            <div className="space-y-2 text-sm text-gray-300 font-mono">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span>Text Color</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: profile.colors?.primaryText }}></div>
                                        <span style={{ color: profile.colors?.primaryText }}>{profile.colors?.primaryText}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span>Background</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: profile.colors?.background }}></div>
                                        <span style={{ color: profile.colors?.background }}>{profile.colors?.background}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <span>Email</span>
                                    <span className="truncate max-w-[150px]">{profile.contact_info?.email || "..."}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Foooter */}
            <div className="relative z-20 mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 md:pt-8">
                <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={handleBack} disabled={currentStep === 1}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>

                <div className="flex gap-2">
                    {/* Step Dots (Mobile) */}
                    <div className="flex md:hidden gap-2">
                        {STEPS.map(s => (
                            <div key={s.id} className={cn("h-2 w-2 rounded-full", currentStep === s.id ? "bg-primary" : "bg-white/20")} />
                        ))}
                    </div>
                </div>

                {currentStep < 5 ? (
                    <Button onClick={handleNext} className="h-12 w-full rounded-full bg-white px-8 font-bold text-black hover:bg-gray-200 sm:w-auto">
                        Next Step <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        className="h-12 w-full rounded-full bg-primary px-8 font-bold text-white shadow-neo-primary transition-transform hover:scale-105 sm:w-auto"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                        Complete Setup
                    </Button>
                )}
            </div>
        </div>
    );
}

// Reuse existing LivePreview but make sure it uses default values gracefully
function LivePreview() {
    const { profile } = useBrandStore();
    const colors = profile.colors || { primaryText: '#1e293b', text: '#334155', background: '#ffffff' };

    return (
        <div className="relative flex items-center justify-center rounded-3xl bg-[#222f49] p-8 border-2 border-dashed border-white/20 min-h-[400px]">
            <div className="absolute top-4 right-4 z-20">
                <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-1 text-xs font-bold text-white border border-white/10">Live Preview</div>
            </div>

            {/* Two Cards Stack Effect */}
            <div className="relative w-full max-w-sm perspective-[1000px]">
                {/* Back Card */}
                <div
                    className="absolute -top-8 -right-6 h-48 w-80 rotate-6 rounded-xl border-4 border-white opacity-50 transform scale-90 z-10 transition-colors duration-300"
                    style={{ backgroundColor: colors.background, boxShadow: `0 25px 50px -12px ${colors.background}40` }}
                />

                {/* Front Card */}
                <div className="relative min-h-[16rem] w-full rounded-2xl bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border-4 transition-all duration-300 z-30 transform hover:scale-105"
                    style={{ borderColor: colors.background }}>

                    {/* Colored header strip */}
                    <div className="absolute top-0 left-0 right-0 h-16 rounded-t-xl" style={{ backgroundColor: colors.background }}></div>

                    <div className="relative z-10 flex items-center justify-between mb-6 pt-2">
                        <div className="flex items-center gap-3">
                            {profile.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.logo_url} className="size-12 object-contain bg-white rounded-lg p-1" alt="Logo" />
                            ) : (
                                <div className="size-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                                    style={{ backgroundColor: colors.background }}>
                                    {profile.business_name?.substring(0, 2).toUpperCase() || "BP"}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-black leading-tight max-w-[150px] truncate" style={{ color: colors.primaryText, fontFamily: profile.typography?.heading }}>
                                    {profile.business_name || "Business Name"}
                                </h3>
                                <p className="text-xs font-bold uppercase tracking-wide truncate max-w-[150px]" style={{ color: colors.primaryText, opacity: 0.6 }}>
                                    {profile.tagline || "Tagline goes here"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 space-y-2">
                        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.background }}>
                            {profile.industry || "Industry"}
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: colors.primaryText, opacity: 0.7 }}>
                            {profile.description || "Your brand description will appear here."}
                        </p>
                    </div>

                    <div className="flex gap-2 mt-auto">
                        <div className="h-10 px-4 rounded-lg flex items-center justify-center text-xs font-bold text-white transition-colors" style={{ backgroundColor: colors.background }}>
                            Contact Us
                        </div>
                        <div className="h-10 w-10 rounded-lg border-2 flex items-center justify-center" style={{ borderColor: colors.background }}>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.primaryText }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
