import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
	size?: 'sm' | 'md' | 'lg' | 'icon';
}

const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
	default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-800',
	secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
	ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
	destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
	outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
};
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
	sm: 'h-8 px-2 text-sm',
	md: 'h-9 px-3 text-sm',
	lg: 'h-10 px-4',
	icon: 'h-9 w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'default', size = 'md', ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(base, variants[variant], sizes[size], className)}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export default Button;
