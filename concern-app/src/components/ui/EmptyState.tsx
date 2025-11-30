import React from 'react';

interface EmptyStateProps {
    message: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    message,
    description,
    icon,
    action,
    className = '',
}) => {
    return (
        <div
            className={`empty-state flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 ${className}`}
            role="status"
        >
            {icon && (
                <div className="mb-4 text-gray-400 text-4xl">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-1">
                {message}
            </h3>
            {description && (
                <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
};
