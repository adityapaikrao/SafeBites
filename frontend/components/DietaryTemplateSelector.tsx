"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useUser } from '@auth0/nextjs-auth0/client';
import { Check, Leaf, Wheat, Milk, Nut, Flame, X } from "lucide-react";
import { getDietaryTemplates, applyDietaryTemplate } from "@/lib/backendApi";

interface DietaryTemplate {
    name: string;
    description: string;
    allergies: string[];
    dietGoals: string[];
    avoidIngredients: string[];
}

const TEMPLATE_ICONS: Record<string, any> = {
    vegan: Leaf,
    vegetarian: Leaf,
    gluten_free: Wheat,
    keto: Flame,
    dairy_free: Milk,
    nut_free: Nut,
    paleo: Flame,
};

const TEMPLATE_COLORS: Record<string, string> = {
    vegan: "from-green-500 to-emerald-600",
    vegetarian: "from-green-400 to-teal-500",
    gluten_free: "from-amber-500 to-yellow-600",
    keto: "from-purple-500 to-indigo-600",
    dairy_free: "from-blue-400 to-cyan-500",
    nut_free: "from-orange-500 to-red-500",
    paleo: "from-stone-500 to-amber-600",
};

interface DietaryTemplateSelectorProps {
    onApply?: (templateKey: string) => void;
    onClose?: () => void;
    showAsModal?: boolean;
}

export default function DietaryTemplateSelector({
    onApply,
    onClose,
    showAsModal = false
}: DietaryTemplateSelectorProps) {
    const { user } = useUser();
    const [templates, setTemplates] = useState<Record<string, DietaryTemplate>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
    const [appliedTemplates, setAppliedTemplates] = useState<string[]>([]);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await getDietaryTemplates();
            setTemplates(data.templates || {});
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (templateKey: string) => {
        if (!user?.sub) return;

        try {
            setApplyingTemplate(templateKey);
            await applyDietaryTemplate(user.sub, templateKey);
            setAppliedTemplates(prev => [...prev, templateKey]);
            onApply?.(templateKey);
        } catch (error) {
            console.error('Error applying template:', error);
        } finally {
            setApplyingTemplate(null);
        }
    };

    const content = (
        <>
            <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
                    Quick Setup: Dietary Templates
                </h2>
                <p className="text-gray-600">
                    Select a template to quickly configure your preferences
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 border-4 border-mint-500 border-t-transparent rounded-full"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(templates).map(([key, template], index) => {
                        const Icon = TEMPLATE_ICONS[key] || Leaf;
                        const gradientClass = TEMPLATE_COLORS[key] || "from-gray-500 to-gray-600";
                        const isApplied = appliedTemplates.includes(key);
                        const isApplying = applyingTemplate === key;

                        return (
                            <motion.button
                                key={key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleApply(key)}
                                disabled={isApplying || isApplied}
                                className={`
                  relative overflow-hidden rounded-xl p-5 text-left transition-all
                  ${isApplied
                                        ? 'bg-green-50 border-2 border-green-500'
                                        : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                                    }
                `}
                            >
                                {/* Gradient accent */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass}`} />

                                <div className="flex items-start gap-3">
                                    <div className={`
                    w-10 h-10 rounded-lg bg-gradient-to-br ${gradientClass} 
                    flex items-center justify-center text-white
                  `}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {template.name}
                                            </h3>
                                            {isApplied && (
                                                <Check className="w-4 h-4 text-green-500" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {template.description}
                                        </p>

                                        {/* Show what will be avoided */}
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {template.avoidIngredients.slice(0, 3).map((ing) => (
                                                <span
                                                    key={ing}
                                                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                                >
                                                    {ing}
                                                </span>
                                            ))}
                                            {template.avoidIngredients.length > 3 && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                    +{template.avoidIngredients.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isApplying && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full"
                                        />
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}
        </>
    );

    if (showAsModal) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    {content}
                </motion.div>
            </motion.div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            {content}
        </div>
    );
}
