import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}
      {...props}
    />
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('px-6 py-4 border-b border-gray-200', className)} {...props} />;
});

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('px-6 py-4', className)} {...props} />;
});

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('px-6 py-4 border-t border-gray-200', className)} {...props} />
  );
});

CardFooter.displayName = 'CardFooter';
