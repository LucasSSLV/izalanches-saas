// components/Clickable.tsx
'use client';

import React from 'react';
 
export const Clickable = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};