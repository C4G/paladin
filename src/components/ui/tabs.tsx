'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    direction?: 'horizontal' | 'vertical';
  }
>(({ className, direction = 'horizontal', ...props }, ref) => {
  const horizontalClasses =
    'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground';

  const verticalClasses =
    'flex flex-col w-full items-left justify-top rounded-md bg-muted px-10 text-muted-foreground';

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        direction === 'vertical' ? verticalClasses : horizontalClasses,
        className
      )}
      {...props}
    />
  );
});

TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    direction?: 'horizontal' | 'vertical';
  }
>(({ className, direction = 'horizontal', ...props }, ref) => {
  const horizontalClasses =
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm';

  const verticalClasses =
    'inline-flex items-center justify-start whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm';
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        direction === 'vertical' ? verticalClasses : horizontalClasses,
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
