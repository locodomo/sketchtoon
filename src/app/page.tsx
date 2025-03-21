'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import DrawingBoard to avoid SSR issues with react-konva
const DrawingBoard = dynamic(() => import('./components/DrawingBoard'), {
  ssr: false,
});

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <main>
      <DrawingBoard isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
    </main>
  );
}
