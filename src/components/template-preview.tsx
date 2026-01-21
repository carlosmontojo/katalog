'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface TemplatePreviewProps {
    onSelect: (template: string) => void;
    selectedTemplate?: string;
}

export function TemplatePreview({ onSelect, selectedTemplate = 'basic' }: TemplatePreviewProps) {
    const [selected, setSelected] = useState(selectedTemplate);

    const templates = [
        {
            id: 'basic',
            name: 'Básico',
            description: '2 columnas × 3 filas',
            details: '6 productos por página, ideal para catálogos generales',
            color: 'from-blue-50 to-blue-100',
            borderColor: 'border-blue-300',
            selectedColor: 'ring-blue-500',
        },
        {
            id: 'minimal',
            name: 'Minimalista',
            description: 'Lado a lado con detalle',
            details: '2 productos por página, máximo espacio para descripción',
            color: 'from-gray-50 to-gray-100',
            borderColor: 'border-gray-300',
            selectedColor: 'ring-gray-500',
        },
        {
            id: 'modern',
            name: 'Moderno',
            description: '3 columnas × 3 filas',
            details: '9 productos por página, compacto y visual',
            color: 'from-purple-50 to-purple-100',
            borderColor: 'border-purple-300',
            selectedColor: 'ring-purple-500',
        }
    ];

    const handleSelect = (templateId: string) => {
        setSelected(templateId);
        onSelect(templateId);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Elige una Plantilla</h3>
                <p className="text-sm text-gray-600">Selecciona el estilo de catálogo que prefieres</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(template => (
                    <button
                        key={template.id}
                        onClick={() => handleSelect(template.id)}
                        className={`
                            relative p-6 rounded-lg border-2 text-left transition-all
                            ${selected === template.id
                                ? `${template.selectedColor} ring-2 ring-offset-2 ${template.borderColor} bg-white`
                                : `${template.borderColor} hover:border-gray-400 bg-gradient-to-br ${template.color}`
                            }
                        `}
                    >
                        {selected === template.id && (
                            <div className="absolute top-3 right-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-gray-900 text-lg mb-1">
                                    {template.name}
                                </h4>
                                <p className="text-sm font-medium text-gray-700">
                                    {template.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {template.details}
                                </p>
                            </div>

                            {/* Visual Preview */}
                            <div className="mt-4 border border-gray-200 rounded p-3 bg-white">
                                {template.id === 'basic' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="space-y-1">
                                                <div className="h-12 bg-gray-200 rounded"></div>
                                                <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                                                <div className="h-1.5 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {template.id === 'minimal' && (
                                    <div className="space-y-3">
                                        {[1, 2].map(i => (
                                            <div key={i} className="flex gap-2">
                                                <div className="h-16 w-16 bg-gray-200 rounded flex-shrink-0"></div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 bg-gray-300 rounded w-full"></div>
                                                    <div className="h-1.5 bg-gray-200 rounded w-2/3"></div>
                                                    <div className="h-1 bg-gray-100 rounded w-full"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {template.id === 'modern' && (
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="space-y-0.5">
                                                <div className="h-10 bg-gray-200 rounded"></div>
                                                <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                                                <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>Plantilla seleccionada:</strong> {templates.find(t => t.id === selected)?.name}
                    {' - '}
                    {templates.find(t => t.id === selected)?.details}
                </p>
            </div>
        </div>
    );
}
