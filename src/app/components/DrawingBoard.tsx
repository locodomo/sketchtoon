'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Line, Image as KonvaImage, Rect, Circle, RegularPolygon, Group } from 'react-konva';
import Konva from 'konva';
import {
  Eraser,
  Trash2,
  Download,
  Share2,
  Sun,
  Moon,
  Undo2,
  Lightbulb,
  X,
  Loader2,
  Eye,
  EyeOff,
  Square,
  Triangle,
  Brush,
  Grid,
  Coffee,
  Instagram,
  Twitter,
  Facebook,
  MessageCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Upload,
  Droplet,
  ChevronDown,
  ChevronUp,
  Wand2,
  RotateCcw,
  Play,
  Undo,
  Redo,
  Save,
  Shapes,
  Hexagon,
  MoreVertical,
  Circle as CircleIcon,
  Sparkles,
  Pencil
} from 'lucide-react';
import Image from 'next/image';
import { KonvaEventObject } from 'konva/lib/Node';

interface DrawingBoardProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

// Define tool types
type DrawingTool = 'pen' | 'eraser' | 'brush';
type ShapeTool = 'circle' | 'square' | 'triangle' | 'hexagon';
type Tool = DrawingTool | ShapeTool;

const isDrawingTool = (tool: Tool): tool is DrawingTool => {
  return tool === 'pen' || tool === 'eraser' || tool === 'brush';
};

const isShapeTool = (tool: Tool): tool is ShapeTool => {
  return tool === 'circle' || tool === 'square' || tool === 'triangle' || tool === 'hexagon';
};

interface DrawingLine {
  tool: DrawingTool;
  points: number[];
  color: string;
  strokeWidth: number;
}

interface ShapeType {
  tool: ShapeTool;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  shapeProps?: {
    radius?: number;
    sides?: number;
    points?: number[];
  };
}

const DRAWING_TIPS = [
  {
    title: "Character Sketch",
    description: "Use this sketch as a reference for your drawing. Toggle the overlay and adjust its opacity to help you draw."
  }
];

const MAX_DAILY_ATTEMPTS = 2;
const STORAGE_KEYS = {
  DAILY: 'sketchtoon_daily_attempts'
};

interface GenerationAttempts {
  count: number;
  date: string;
}

interface ShareMenuProps {
  imageUrl: string;
  onClose: () => void;
}

const ShareMenu = ({ imageUrl, onClose }: ShareMenuProps) => {
  const downloadAndShare = async (platform: string) => {
    try {
      // Convert data URL to Blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a File object
      const file = new File([blob], 'mangasketch-drawing.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'My MangaSketch Drawing',
            text: 'Check out my drawing made with MangaSketch!'
          });
          onClose();
          return;
        } catch (error) {
          console.log('Web Share API error:', error);
          // Fall back to platform-specific sharing
        }
      }

      // Platform-specific sharing as fallback
      switch (platform) {
        case 'twitter':
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my drawing made with MangaSketch!')}`;
          window.open(twitterUrl, '_blank');
          break;
        case 'facebook':
          const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
          window.open(fbUrl, '_blank');
          break;
        case 'instagram':
        case 'threads':
          // Download the image first
          const downloadLink = document.createElement('a');
          downloadLink.href = imageUrl;
          downloadLink.download = 'mangasketch-drawing.png';
          downloadLink.click();
          
          alert(`Image downloaded! To share on ${platform}:\n1. Open ${platform}\n2. Create a new post\n3. Select the downloaded image from your device`);
          break;
      }
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Sorry, there was an error sharing your drawing. Please try again.');
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-20 lg:bottom-auto lg:inset-x-auto lg:top-16 lg:right-4 w-auto lg:w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[102] scale-[0.8] origin-bottom lg:origin-top-right">
      <div className="py-1">
        <button
          onClick={() => downloadAndShare('twitter')}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
        >
          <Twitter className="w-4 h-4 mr-2" />
          Twitter/X
        </button>
        <button
          onClick={() => downloadAndShare('facebook')}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </button>
        <button
          onClick={() => downloadAndShare('instagram')}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Instagram className="w-4 h-4 mr-2" />
          Instagram
        </button>
        <button
          onClick={() => downloadAndShare('threads')}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Threads
        </button>
      </div>
    </div>
  );
};

// Add category type and definitions
const SKETCH_CATEGORIES = [
  { id: 'chibi', name: 'Chibi', description: 'Cute, super-deformed style with large heads and small bodies' },
  { id: 'shonen', name: 'Shonen', description: 'Dynamic, action-oriented character style' },
  { id: 'shojo', name: 'Shojo', description: 'Elegant, romantic character style with flowing details' },
  { id: 'mecha', name: 'Mecha', description: 'Mechanical, robotic character designs' },
  { id: 'fantasy', name: 'Fantasy', description: 'Magical and mythical character designs' },
  { id: 'portrait', name: 'Portrait', description: 'Detailed face and upper body focus' }
] as const;

type CategoryId = typeof SKETCH_CATEGORIES[number]['id'];

const TOOLS = [
  { id: 'pen' as const, icon: Pencil, label: 'Pen' },
  { id: 'eraser' as const, icon: Eraser, label: 'Eraser' }
] as const;

const SHAPES = [
  { id: 'circle' as const, icon: CircleIcon, label: 'Circle' },
  { id: 'square' as const, icon: Square, label: 'Square' },
  { id: 'triangle' as const, icon: Triangle, label: 'Triangle' },
  { id: 'hexagon' as const, icon: Hexagon, label: 'Hexagon' }
] as const;

const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff9900', '#9900ff',
  '#990000', '#009900', '#000099', '#999999', '#ff99cc'
];

// Add animation types
type AnimationType = 'wave' | 'blink' | 'bounce';

// Add animation categories
const ANIMATION_CATEGORIES = [
  { id: 'wave', name: 'Wave', description: 'Gentle wave motion' },
  { id: 'blink', name: 'Blink', description: 'Fade in and out effect' },
  { id: 'bounce', name: 'Bounce', description: 'Up and down bouncing motion' }
] as const;

type AnimationCategoryId = typeof ANIMATION_CATEGORIES[number]['id'];

// Update type definitions
type KonvaEvent = Konva.KonvaEventObject<MouseEvent>;
type KonvaTouchEvent = Konva.KonvaEventObject<TouchEvent>;

type LineType = DrawingLine | ShapeType;

interface HistoryState {
  lines: LineType[];
}

interface Point {
  x: number;
  y: number;
}

const DrawingBoard: React.FC<DrawingBoardProps> = ({ isDarkMode, onToggleDarkMode }) => {
  const [lines, setLines] = useState<LineType[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([{ lines: [] }]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentLine, setCurrentLine] = useState<DrawingLine | null>(null);
  const [currentShape, setCurrentShape] = useState<ShapeType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [brushSize, setBrushSize] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guideImage, setGuideImage] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.3);
  const [showGrid, setShowGrid] = useState(true);
  const stageRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const guideImageRef = useRef<HTMLImageElement | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [shape, setShape] = useState<any>(null);
  const [dailyAttempts, setDailyAttempts] = useState<number>(0);
  const [hasReachedLimit, setHasReachedLimit] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [guideImageObj, setGuideImageObj] = useState<HTMLImageElement | null>(null);
  const [showFillPicker, setShowFillPicker] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('shonen');
  const [showAnimeCategories, setShowAnimeCategories] = useState(false);
  const [guideMode, setGuideMode] = useState<'generate' | 'upload' | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 512, height: 512 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<AnimationType>('wave');
  const [animationPreview, setAnimationPreview] = useState<string | null>(null);
  const [animationFormats, setAnimationFormats] = useState<{
    gif?: string;
  }>({});
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnimationCategories, setShowAnimationCategories] = useState(false);
  const [isAnimationPreviewOpen, setIsAnimationPreviewOpen] = useState(false);
  const [showAnimationPreview, setShowAnimationPreview] = useState(false);
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showGuidePanel, setShowGuidePanel] = useState(false);
  const [shapes, setShapes] = useState<ShapeType[]>([]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  // Load attempts from storage on component mount
  useEffect(() => {
    // Load daily attempts
    const dailyData = localStorage.getItem(STORAGE_KEYS.DAILY);
    if (dailyData) {
      const data: GenerationAttempts = JSON.parse(dailyData);
      const today = new Date().toISOString().split('T')[0];
      
      if (data.date === today) {
        setDailyAttempts(data.count);
        setHasReachedLimit(data.count >= MAX_DAILY_ATTEMPTS);
      } else {
        // Reset daily count if it's a new day
        const newData: GenerationAttempts = { count: 0, date: today };
        localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(newData));
        setDailyAttempts(0);
        setHasReachedLimit(false);
      }
    }
  }, []);

  // Update local storage when attempts change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const newData: GenerationAttempts = { count: dailyAttempts, date: today };
    localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(newData));
    setHasReachedLimit(dailyAttempts >= MAX_DAILY_ATTEMPTS);
  }, [dailyAttempts]);

  // Update useEffect for loading guide image
  useEffect(() => {
    if (guideImage || uploadedImage) {
      const image = new window.Image();
      image.src = uploadedImage || guideImage || '';
      image.onload = () => {
        setGuideImageObj(image);
      };
    }
  }, [guideImage, uploadedImage]);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update undo/redo states
  useEffect(() => {
    setCanUndo(currentStep > 0 && history.length > 1);
    setCanRedo(currentStep < history.length - 1);
  }, [currentStep, history.length]);

  // Update flood fill function to work with Konva
  const floodFill = (stage: any, x: number, y: number, targetColor: string, replacementColor: string) => {
    const layer = stage.getLayers()[1]; // Get the drawing layer
    const shapes = layer.getChildren();
    
    // Find the shape at the clicked position
    const targetShape = shapes.find((shape: any) => {
      const pos = shape.getAbsolutePosition();
      const size = shape.getSize();
      const radius = shape.radius;
      
      if (shape instanceof Konva.Circle) {
        const dx = x - (pos.x + radius);
        const dy = y - (pos.y + radius);
        return dx * dx + dy * dy <= radius * radius;
      }
      
      if (shape instanceof Konva.Rect) {
        return (
          x >= pos.x &&
          x <= pos.x + size.width &&
          y >= pos.y &&
          y <= pos.y + size.height
        );
      }
      
      if (shape instanceof Konva.Line && shape.closed()) {
        const points = shape.points();
        return isPointInPolygon(x, y, points);
      }
      
      if (shape instanceof Konva.RegularPolygon) {
        const centerX = pos.x + radius;
        const centerY = pos.y + radius;
        const dx = x - centerX;
        const dy = y - centerY;
        return dx * dx + dy * dy <= radius * radius;
      }
      
      return false;
    });

    if (targetShape) {
      // If we found a shape, fill it
      if (targetShape instanceof Konva.Circle || targetShape instanceof Konva.RegularPolygon) {
        // For circles and hexagons, create a new shape with the fill color
        const newShape = targetShape.clone({
          fill: replacementColor,
          stroke: replacementColor,
          strokeWidth: targetShape.strokeWidth(),
          listening: false
        });
        layer.add(newShape);
        layer.batchDraw();
      } else {
        // For other shapes, use the existing fill method
        targetShape.fill(replacementColor);
        layer.batchDraw();
      }
    } else {
      // If no shape found, create a new filled rectangle
      const rect = new Konva.Rect({
        x: x - 1,
        y: y - 1,
        width: 2,
        height: 2,
        fill: replacementColor,
        stroke: replacementColor,
        strokeWidth: 1,
        listening: false
      });
      layer.add(rect);
      layer.batchDraw();
    }
  };

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (x: number, y: number, points: number[]): boolean => {
    let inside = false;
    for (let i = 0, j = points.length - 2; i < points.length; i += 2, j = i - 2) {
      const xi = points[i];
      const yi = points[i + 1];
      const xj = points[j];
      const yj = points[j + 1];
      
      if (((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const isDrawingLine = (line: LineType): line is DrawingLine => {
    return isDrawingTool(line.tool);
  };

  const isShapeLine = (line: LineType): line is ShapeType => {
    return isShapeTool(line.tool);
  };

  // Update handleMouseDown function
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (isDrawingTool(tool)) {
      setIsDrawing(true);
      const newLine: LineType = {
        tool,
        points: [pos.x, pos.y],
        color: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: strokeWidth,
      };
      setLines([...lines, newLine]);
    } else if (isShapeTool(tool)) {
      setIsDrawing(true);
      const newShape: ShapeType = {
        tool: tool as ShapeTool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
        strokeWidth: strokeWidth,
      };
      setShapes([...shapes, newShape]);
    }
  };

  // Update handleMouseMove function
  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos || !isDrawing) return;

    if (isDrawingTool(tool)) {
      const lastLine = lines[lines.length - 1];
      if (!lastLine || !isDrawingLine(lastLine)) return;

      const newPoints = [...lastLine.points, pos.x, pos.y];
      const updatedLines = [...lines];
      updatedLines[lines.length - 1] = {
        ...lastLine,
        points: newPoints,
      };
      setLines(updatedLines);
    } else if (isShapeTool(tool)) {
      const lastShape = shapes[shapes.length - 1];
      if (!lastShape) return;

      const updatedShapes = [...shapes];
      updatedShapes[shapes.length - 1] = {
        ...lastShape,
        width: pos.x - lastShape.x,
        height: pos.y - lastShape.y,
      };
      setShapes(updatedShapes);
    }
  };

  // Update handleMouseUp function
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (tool === 'brush' || tool === 'eraser') {
        const newLine: LineType = {
          points: currentLine?.points || [],
          color,
          strokeWidth: strokeWidth,
          tool
        };
        const newLines = [...lines, newLine];
        setLines(newLines);
        
        // Update history with the new state
        const newHistory = [...history.slice(0, currentStep + 1), { lines: newLines }];
        setHistory(newHistory);
        setCurrentStep(newHistory.length - 1);
      } else if (tool === 'circle' || tool === 'square' || tool === 'triangle' || tool === 'hexagon') {
        handleShapeComplete();
      }
      setCurrentLine(null);
    }
  };

  // Update handleShapeComplete function
  const handleShapeComplete = () => {
    if (shape && startPoint) {
      const newLine: LineType = {
        tool: shape.type,
        points: [],
        color,
        strokeWidth: strokeWidth,
      };
      const newLines = [...lines, newLine];
      setLines(newLines);
      
      // Update history with the new state
      const newHistory = [...history.slice(0, currentStep + 1), { lines: newLines }];
      setHistory(newHistory);
      setCurrentStep(newHistory.length - 1);
      
      setShape(null);
      setStartPoint(null);
    }
  };

  // Update handleClear function
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      const emptyLines: LineType[] = [];
      setLines(emptyLines);
      setHistory([{ lines: emptyLines }]);
      setCurrentStep(0);
    }
  };

  // Update handleUndo function
  const handleUndo = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      setLines([...history[newStep].lines]);
    }
  };

  // Update handleRedo function
  const handleRedo = () => {
    if (currentStep < history.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      setLines([...history[newStep].lines]);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      const emptyLines: LineType[] = [];
      setLines(emptyLines);
      setHistory([{ lines: emptyLines }]);
      setCurrentStep(0);
    }
  };

  const handleSave = async () => {
    if (!stageRef.current) return;

    try {
      // Store current state
      const wasGridVisible = showGrid;
      const wasGuideVisible = showOverlay;
      const wasBackgroundVisible = showBackground;

      // Force white background and hide grid/guide for save
      setShowGrid(false);
      setShowOverlay(false);
      setShowBackground(true);

      // Wait for the next render cycle to ensure changes are applied
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the stage
      const stage = stageRef.current;
      
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set the canvas size to match the stage size with pixel ratio
      const pixelRatio = 4; // High resolution
      tempCanvas.width = stage.width() * pixelRatio;
      tempCanvas.height = stage.height() * pixelRatio;
      
      // Fill white background first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the stage content with high quality
      const stageCanvas = stage.toCanvas({
        pixelRatio: pixelRatio,
        width: stage.width(),
        height: stage.height(),
        backgroundColor: '#ffffff' // Force white background
      });
      
      // Draw the stage content on top of the white background
      ctx.drawImage(stageCanvas, 0, 0);
      
      // Get data URL with maximum quality
      const dataURL = tempCanvas.toDataURL('image/png', 1.0);

      // Restore original state
      setShowGrid(wasGridVisible);
      setShowOverlay(wasGuideVisible);
      setShowBackground(wasBackgroundVisible);

      // Create and trigger download
      const link = document.createElement('a');
      link.download = 'sketchtoon.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save image. Please try again.');
    }
  };

  const handleShare = async () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      setShareImageUrl(uri);
      setShowShareMenu(true);
    }
  };

  const handleGenerateGuide = async () => {
    if (isGenerating || hasReachedLimit) return;
    
    try {
      setIsGenerating(true);
      setIsLoadingGuide(true);
      setShowOverlay(false);

      // Check daily limit before making the API call
      if (dailyAttempts >= MAX_DAILY_ATTEMPTS) {
        alert('You have reached the daily limit for image generation. Please try again tomorrow.');
        return;
      }

      const response = await fetch('/api/generate-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedCategory,
          style: 'outline',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate guide');
      }

      const data = await response.json();
      
      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate guide');
      }

      // Update daily attempts
      const newDailyAttempts = dailyAttempts + 1;
      
      // Save to storage
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify({
        count: newDailyAttempts,
        date: today
      }));

      // Update state
      setDailyAttempts(newDailyAttempts);
      setHasReachedLimit(newDailyAttempts >= MAX_DAILY_ATTEMPTS);

      // Load the image
      const img = new window.Image();
      img.src = data.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      setGuideImage(data.imageUrl);
      setGuideImageObj(img);
      setShowOverlay(true);
      setOverlayOpacity(0.3);
    } catch (error) {
      console.error('Error generating guide:', error);
      alert('Failed to generate guide. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsLoadingGuide(false);
    }
  };

  useEffect(() => {
    if (guideImage && showOverlay) {
      const img = new window.Image();
      img.src = guideImage;
      img.onload = () => {
        guideImageRef.current = img;
        setOverlayOpacity(overlayOpacity);
      };
    }
  }, [guideImage, showOverlay, overlayOpacity]);

  // When guide is hidden, reset overlay
  useEffect(() => {
    if (!showOverlay) {
      setShowOverlay(false);
    }
  }, [showOverlay]);

  // Create grid pattern
  const gridPattern = React.useMemo(() => {
    const pattern = new Konva.Line({
      points: [0, 0, 0, 16, 16, 16, 16, 0], // Changed from 32 to 16 for smaller squares
      stroke: 'rgba(0, 0, 0, 0.1)',
      strokeWidth: 1,
      closed: true,
    });
    return pattern;
  }, []);

  // Create grid fill pattern
  const gridFillPattern = React.useMemo(() => {
    return {
      pattern: gridPattern,
      offset: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      repeat: 'repeat',
      width: 16, // Changed from 32 to 16
      height: 16, // Changed from 32 to 16
    };
  }, [gridPattern]);

  // Add grid lines
  const gridLines = useMemo(() => {
    const lines: number[][] = [];
    const gridSize = 16; // Base grid size
    const numCols = Math.ceil(containerSize.width / gridSize);
    const numRows = Math.ceil(containerSize.height / gridSize);

    // Vertical lines
    for (let i = 0; i <= numCols; i++) {
      lines.push([i * gridSize, 0, i * gridSize, containerSize.height]);
    }

    // Horizontal lines
    for (let i = 0; i <= numRows; i++) {
      lines.push([0, i * gridSize, containerSize.width, i * gridSize]);
    }

    return lines;
  }, [containerSize.width, containerSize.height]);

  // Calculate scaled dimensions
  const calculateScaledDimensions = (image: HTMLImageElement) => {
    const canvasWidth = containerSize.width;
    const canvasHeight = containerSize.height;
    const imageAspectRatio = image.width / image.height;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    
    let scaledWidth = canvasWidth * 0.8; // Scale down by 20%
    let scaledHeight = canvasHeight * 0.8; // Scale down by 20%
    
    if (imageAspectRatio > canvasAspectRatio) {
      // Image is wider than canvas
      scaledWidth = canvasWidth * 0.8;
      scaledHeight = (canvasWidth * 0.8) / imageAspectRatio;
    } else {
      // Image is taller than canvas
      scaledHeight = canvasHeight * 0.8;
      scaledWidth = (canvasHeight * 0.8) * imageAspectRatio;
    }
    
    // Center the image
    const x = (canvasWidth - scaledWidth) / 2;
    const y = (canvasHeight - scaledHeight) / 2;
    
    return { width: scaledWidth, height: scaledHeight, x, y };
  };

  // Update shape rendering in the Layer component
  const renderShape = (line: LineType) => {
    if (isDrawingLine(line)) {
      return (
        <Line
          key={line.points.join(',')}
          points={line.points}
          stroke={line.color}
          strokeWidth={line.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            line.tool === 'eraser' ? 'destination-out' : 'source-over'
          }
        />
      );
    }

    if (isShapeLine(line)) {
      const { tool, x, y, width, height, color, strokeWidth } = line;
      switch (tool) {
        case 'circle':
          return (
            <Circle
              key={`${x},${y},${width},${height}`}
              x={x + width / 2}
              y={y + height / 2}
              radius={Math.abs(width) / 2}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        case 'square':
          return (
            <Rect
              key={`${x},${y},${width},${height}`}
              x={x}
              y={y}
              width={width}
              height={height}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        case 'triangle':
          return (
            <RegularPolygon
              key={`${x},${y},${width},${height}`}
              x={x + width / 2}
              y={y + height / 2}
              sides={3}
              radius={Math.abs(width) / 2}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        case 'hexagon':
          return (
            <RegularPolygon
              key={`${x},${y},${width},${height}`}
              x={x + width / 2}
              y={y + height / 2}
              sides={6}
              radius={Math.abs(width) / 2}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
      }
    }
  };

  // Add function to capture canvas as image
  const captureCanvas = () => {
    // Temporarily hide grid and guide image
    const wasGridVisible = showGrid;
    const wasOverlayVisible = showOverlay;
    setShowGrid(false);
    setShowOverlay(false);
    
    // Wait for the next render cycle
    setTimeout(() => {
      const dataURL = stageRef.current?.toDataURL({
        pixelRatio: 2,
        backgroundColor: 'transparent'
      });
      
      // Restore visibility
      setShowGrid(wasGridVisible);
      setShowOverlay(wasOverlayVisible);
      
      return dataURL;
    }, 0);
  };

  // Add function to handle animation
  const handleAnimate = async () => {
    try {
      setIsAnimating(true);
      const imageData = await new Promise<string>((resolve) => {
        // Temporarily hide grid and guide image
        const wasGridVisible = showGrid;
        const wasOverlayVisible = showOverlay;
        setShowGrid(false);
        setShowOverlay(false);
        
        setTimeout(() => {
          const dataURL = stageRef.current?.toDataURL({
            pixelRatio: 2,
            backgroundColor: 'transparent'
          });
          setShowGrid(wasGridVisible);
          setShowOverlay(wasOverlayVisible);
          resolve(dataURL || '');
        }, 0);
      });
      
      if (!imageData) {
        throw new Error('Failed to capture canvas');
      }

      const response = await fetch('/api/animate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          animationType,
        }),
      });

      if (!response.ok) {
        throw new Error('Animation failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Animation failed');
      }

      // Set the preview and formats
      setAnimationPreview(data.preview);
      setAnimationFormats(data.formats);
      setAnimationUrl(data.preview);
      
      // Show the preview modal
      setShowAnimationPreview(true);
    } catch (error) {
      console.error('Animation error:', error);
      alert('Failed to animate drawing. Please try again.');
    } finally {
      setIsAnimating(false);
    }
  };

  // Update handleDownload function
  const handleDownload = async (type: 'png' | 'gif') => {
    if (!stageRef.current) return;

    try {
      if (type === 'gif' && animationUrl) {
        // For GIF, use the animation URL from the API response
        const link = document.createElement('a');
        link.download = 'sketchtoon.gif';
        link.href = animationUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For PNG, use the existing save logic
      const wasGridVisible = showGrid;
      const wasGuideVisible = showOverlay;
      const wasBackgroundVisible = showBackground;

      // Force white background and hide grid/guide for save
      setShowGrid(false);
      setShowOverlay(false);
      setShowBackground(true);

      // Wait for the next render cycle to ensure changes are applied
      await new Promise(resolve => setTimeout(resolve, 100));

      const pixelRatio = 4; // High resolution

      const stage = stageRef.current;
      
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set the canvas size to match the stage size with pixel ratio
      tempCanvas.width = stage.width() * pixelRatio;
      tempCanvas.height = stage.height() * pixelRatio;
      
      // Fill white background first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the stage content with high quality
      const stageCanvas = stage.toCanvas({
        pixelRatio: pixelRatio,
        width: stage.width(),
        height: stage.height(),
        backgroundColor: '#ffffff' // Force white background
      });
      
      // Draw the stage content on top of the white background
      ctx.drawImage(stageCanvas, 0, 0);
      
      // Get data URL with maximum quality
      const dataURL = tempCanvas.toDataURL('image/png', 1.0);

      // Create and trigger download
      const link = document.createElement('a');
      link.download = 'sketchtoon.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Restore original state
      setShowGrid(wasGridVisible);
      setShowOverlay(wasGuideVisible);
      setShowBackground(wasBackgroundVisible);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  // Update the animation type selection
  const handleAnimationTypeChange = (type: AnimationCategoryId) => {
    setAnimationType(type);
    setShowAnimationCategories(false);
    handleAnimate();
  };

  // Add back necessary functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        setGuideImage(result);
        setShowOverlay(true);
        
        const img = new window.Image();
        img.src = result;
        img.onload = () => {
          guideImageRef.current = img;
          setOverlayOpacity(0.3);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Update handleTouchStart
  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    const touch = e.evt.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (isDrawingTool(tool)) {
      setIsDrawing(true);
      const newLine: DrawingLine = {
        tool,
        points: [x, y],
        color: tool === 'eraser' ? '#FFFFFF' : color,
        strokeWidth: tool === 'eraser' ? 20 : strokeWidth
      };
      setCurrentLine(newLine);
    } else if (isShapeTool(tool)) {
      setIsDrawing(true);
      const newShape: ShapeType = {
        tool,
        x,
        y,
        width: 0,
        height: 0,
        color,
        strokeWidth: strokeWidth
      };
      setCurrentShape(newShape);
    }
  };

  // Update handleTouchMove
  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    if (!isDrawing) return;

    const touch = e.evt.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (isDrawingTool(tool)) {
      setCurrentLine(prev => {
        if (!prev || !isDrawingLine(prev)) return null;
        return {
          ...prev,
          points: [...prev.points, x, y]
        };
      });
    } else if (isShapeTool(tool)) {
      setCurrentShape(prev => {
        if (!prev || !isShapeLine(prev)) return null;
        return {
          ...prev,
          width: x - prev.x,
          height: y - prev.y
        };
      });
    }
  };

  const handleTouchEnd = () => {
    if (!isDrawing) return;

    const newHistory = history.slice(0, currentStep + 1);
    const newStep = currentStep + 1;

    if (isDrawingTool(tool)) {
      if (currentLine && isDrawingLine(currentLine)) {
        const newLines = [...lines, currentLine];
        setLines(newLines);
        const updatedHistory: HistoryState[] = [...newHistory, { lines: newLines }];
        setHistory(updatedHistory);
        setCurrentStep(newStep);
        setCurrentLine(null);
      }
    } else if (isShapeTool(tool)) {
      if (currentShape && isShapeLine(currentShape)) {
        const newLines = [...lines, currentShape];
        setLines(newLines);
        const updatedHistory: HistoryState[] = [...newHistory, { lines: newLines }];
        setHistory(updatedHistory);
        setCurrentStep(newStep);
        setCurrentShape(null);
      }
    }

    setIsDrawing(false);
  };

  // Add useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the target is an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, history.length]); // Add dependencies that the handlers use

  return (
    <div className="min-h-screen w-full bg-gray-200">
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 px-2 sm:px-4 lg:px-6 py-2 sm:py-6">
          {/* Responsive Container */}
          <div className="max-w-[1024px] w-full mx-auto h-full flex flex-col">
            {/* Unified Top Navigation - Fixed height */}
            <div className="mb-2 sm:mb-6 p-2 sm:p-3 rounded-lg shadow-lg bg-gray-50">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {/* Left Section: Logo and Drawing Tools */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className="text-lg sm:text-xl font-bold font-outfit text-gray-900">
                    SketchToon
                  </h1>
                  
                  {/* Drawing Tools */}
                  <div className="flex items-center gap-1 sm:gap-2 border-l pl-2 sm:pl-3">
                    {TOOLS.map((toolItem) => (
                      <button
                        key={toolItem.id}
                        onClick={() => setTool(toolItem.id)}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                          tool === toolItem.id
                            ? 'bg-[#fb8500] text-white'
                            : 'hover:bg-gray-100 text-gray-800'
                        }`}
                        title={toolItem.label}
                      >
                        <toolItem.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    ))}
                    <div className="relative">
                      <button
                        onClick={() => setShowShapesDropdown(!showShapesDropdown)}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                          isShapeTool(tool)
                            ? 'bg-[#fb8500] text-white'
                            : 'hover:bg-gray-100 text-gray-800'
                        }`}
                        title="Shapes"
                      >
                        <Shapes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      {showShapesDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => setShowShapesDropdown(false)}
                          />
                          <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg z-[101] scale-[0.8] origin-top-left">
                            {SHAPES.map((shape) => (
                              <button
                                key={shape.id}
                                onClick={() => {
                                  setTool(shape.id);
                                  setShowShapesDropdown(false);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 text-gray-700 first:rounded-t-lg last:rounded-b-lg text-sm"
                              >
                                <shape.icon className="w-3.5 h-3.5" />
                                <span>{shape.label}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Color and Size Controls */}
                  <div className="flex items-center gap-1.5 sm:gap-3 border-l pl-2 sm:pl-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <label className="text-[10px] sm:text-xs font-outfit text-gray-500">Stroke Size</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-16 sm:w-20"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {/* Mobile Actions */}
                  <div className="flex items-center gap-1.5 lg:hidden">
                    <button
                      onClick={handleClear}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Clear canvas"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                    </button>
                    <button
                      onClick={() => setShowGuidePanel(true)}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Drawing Guide"
                    >
                      <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                    </button>
                    <button
                      onClick={handleAnimate}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Animate"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                    </button>
                  </div>

                  {/* Mobile Menu Button */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                    </button>
                    {showMobileMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-[100]"
                          onClick={() => setShowMobileMenu(false)}
                        />
                        <div className="absolute right-0 top-[40px] mt-1 w-48 bg-white rounded-lg shadow-lg z-[101] scale-[0.8] origin-top-right">
                          <button
                            onClick={() => {
                              handleUndo();
                              setShowMobileMenu(false);
                            }}
                            disabled={currentStep === 0}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 text-gray-700 first:rounded-t-lg text-sm ${
                              currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Undo className="w-4 h-4" />
                            <span>Undo</span>
                          </button>
                          <button
                            onClick={() => {
                              handleRedo();
                              setShowMobileMenu(false);
                            }}
                            disabled={currentStep === history.length - 1}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 text-gray-700 text-sm ${
                              currentStep === history.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Redo className="w-4 h-4" />
                            <span>Redo</span>
                          </button>
                          <button
                            onClick={() => {
                              handleShare();
                              setShowMobileMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 text-gray-700 text-sm"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                          <button
                            onClick={() => {
                              handleSave();
                              setShowMobileMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 text-gray-700 last:rounded-b-lg text-sm"
                          >
                            <Download className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      onClick={handleClear}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Clear canvas"
                    >
                      <Trash2 className="w-4 h-4 text-gray-800" />
                    </button>
                    <div className="h-6 w-px bg-gray-300" />
                    <button
                      onClick={handleUndo}
                      disabled={currentStep === 0}
                      className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Undo"
                    >
                      <Undo className="w-4 h-4 text-gray-800" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={currentStep === history.length - 1}
                      className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${currentStep === history.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Redo"
                    >
                      <Redo className="w-4 h-4 text-gray-800" />
                    </button>
                    <div className="h-6 w-px bg-gray-300" />
                    <button
                      onClick={handleSave}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Save Image"
                    >
                      <Save className="w-4 h-4 text-gray-800" />
                    </button>
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="relative">
                      <button
                        onClick={() => setShowAnimationCategories(!showAnimationCategories)}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                          showAnimationCategories
                            ? 'bg-[#fb8500] text-white'
                            : 'bg-[#fb8500] text-white hover:bg-[#e67a00]'
                        }`}
                        disabled={isAnimating}
                      >
                        <span className="hidden sm:inline">Animate</span>
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      {showAnimationCategories && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowAnimationCategories(false)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg z-50 scale-[0.8] origin-top-right">
                            {ANIMATION_CATEGORIES.map((category) => (
                              <button
                                key={category.id}
                                onClick={() => handleAnimationTypeChange(category.id)}
                                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                              >
                                <div className="font-medium text-[#fb8500]">{category.name}</div>
                                <div className="text-xs text-gray-500">{category.description}</div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:block relative">
                    <button
                      onClick={handleShare}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Share Drawing"
                    >
                      <Share2 className="w-4 h-4 text-gray-800" />
                    </button>
                    {showShareMenu && shareImageUrl && (
                      <>
                        <div
                          className="fixed inset-0 z-[101]"
                          onClick={() => setShowShareMenu(false)}
                        />
                        <ShareMenu
                          imageUrl={shareImageUrl}
                          onClose={() => setShowShareMenu(false)}
                        />
                      </>
                    )}
                  </div>

                  {/* Grid Toggle - Desktop */}
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`hidden lg:block p-2 rounded-full transition-colors ${
                      showGrid
                        ? 'bg-[#fb8500] text-white'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                    title="Toggle Grid"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Drawing Area Container - Flex grow and shrink properly */}
            <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 min-h-0 overflow-hidden">
              {/* Drawing Guide Panel - Fixed height on mobile, flexible on desktop */}
              <div className={`
                ${showGuidePanel ? 'block' : 'hidden'} 
                lg:block w-full lg:w-64 
                bg-gray-900 rounded-lg shadow-lg 
                p-3 sm:p-4 
                font-outfit 
                flex flex-col 
                h-[400px] lg:h-[512px] 
                min-w-0 lg:min-w-[256px]
                ${showGuidePanel ? 'fixed inset-x-2 top-2 z-[90] lg:relative lg:inset-auto lg:top-auto' : ''}
              `}>
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <h3 className="text-base sm:text-lg font-semibold font-outfit text-white">Drawing Guide</h3>
                  {/* Add close button for mobile */}
                  <button
                    onClick={() => setShowGuidePanel(false)}
                    className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>
                </div>

                {/* Guide Content */}
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-gray-700 pb-2 sm:pb-3">
                    <p className="text-xs sm:text-sm text-gray-300 font-outfit">
                      Create your own cartoon-style drawings with our AI-powered guide. Choose a style or upload a reference image to get started.
                    </p>
                  </div>
                
                  {/* Guide Mode Selection */}
                  <div className="space-y-2 mt-2 sm:mt-3 mb-3 sm:mb-4">
                    <button
                      onClick={() => setGuideMode('generate')}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        isGenerating || hasReachedLimit
                          ? 'bg-gray-400 cursor-not-allowed'
                          : guideMode === 'generate'
                          ? 'bg-[#fb8500] text-white'
                          : 'bg-[#fb8500] hover:bg-[#e67a00] text-white'
                      }`}
                      disabled={isGenerating || hasReachedLimit}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : hasReachedLimit ? (
                        <>
                          <X className="h-3.5 w-3.5" />
                          <span>Daily Limit Reached</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" />
                          <span>Generate Sketch</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setGuideMode('upload')}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        guideMode === 'upload'
                          ? 'bg-[#fb8500] text-white'
                          : 'bg-[#8ECAE6] hover:bg-[#7eb8d4] text-gray-700'
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Reference</span>
                    </button>
                  </div>

                  {/* Anime Categories Dropdown */}
                  {guideMode === 'generate' && (
                    <div className="space-y-4">
                      <div className="relative mt-2">
                        <button
                          onClick={() => setShowAnimeCategories(!showAnimeCategories)}
                          className="w-full flex items-center justify-between p-2 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                        >
                          <span>{selectedCategory ? SKETCH_CATEGORIES.find(c => c.id === selectedCategory)?.name : 'Select Category'}</span>
                          {showAnimeCategories ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {showAnimeCategories && (
                          <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto scale-[0.8] origin-top">
                            {SKETCH_CATEGORIES.map((category) => (
                              <button
                                key={category.id}
                                onClick={() => {
                                  setSelectedCategory(category.id);
                                  setShowAnimeCategories(false);
                                  handleGenerateGuide();
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-700 first:rounded-t-lg last:rounded-b-lg text-sm"
                              >
                                <div className="font-medium">{category.name}</div>
                                <div className="text-xs text-gray-500">{category.description}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Overlay controls for generated image */}
                      {guideImage && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300">Guide Overlay</span>
                            <button
                              onClick={() => setShowOverlay(!showOverlay)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                showOverlay ? 'bg-[#fb8500] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              title={showOverlay ? 'Hide Guide' : 'Show Guide'}
                            >
                              {showOverlay ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {showOverlay && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Overlay Opacity</span>
                                <span className="text-sm text-gray-400">{Math.round(overlayOpacity * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={overlayOpacity}
                                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Reference Options */}
                  {guideMode === 'upload' && (
                    <div className="space-y-4">
                      <div
                        onClick={triggerFileInput}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400"
                      >
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />

                      {uploadedImage && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Overlay Opacity</span>
                            <span className="text-sm text-gray-500">{Math.round(overlayOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Powered by text */}
                  <div className="mt-auto pt-3 text-center">
                    <p className="text-xs text-gray-400">
                      This site is powered by{' '}
                      <a 
                        href="https://locodomo.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#fb8500] hover:text-[#e67a00] transition-colors"
                      >
                        locodomo.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Drawing Area - Flex grow and maintain aspect ratio */}
              <div className={`
                flex-1 
                ${showGuidePanel ? 'h-[calc(100vh-450px)]' : 'h-[calc(100vh-120px)]'} 
                sm:h-[500px] lg:h-[512px] 
                ${showGuidePanel ? 'w-full' : 'w-full lg:w-[512px]'} 
                relative
              `}>
                {/* Canvas Container - Full size of parent */}
                <div ref={containerRef} className="w-full h-full relative">
                  <Stage
                    width={containerSize.width}
                    height={containerSize.height}
                    ref={stageRef}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                    onMouseleave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full h-full border-2 border-gray-700 rounded-lg bg-white"
                  >
                    {/* Grid Layer - Always on top and not affected by eraser */}
                    <Layer>
                      {showGrid && (
                        <Group key="grid-group">
                          {gridLines.map((line, i) => (
                            <Line
                              key={`grid-line-${i}`}
                              points={line}
                              stroke="#e5e7eb"
                              strokeWidth={1}
                              opacity={0.2}
                              listening={false}
                              perfectDrawEnabled={false}
                              globalCompositeOperation="source-over"
                            />
                          ))}
                        </Group>
                      )}
                    </Layer>

                    {/* Drawing Layer - Contains all drawing content */}
                    <Layer>
                      {showOverlay && (guideImage || uploadedImage) && guideImageRef.current && (
                        <KonvaImage
                          key="guide-image"
                          image={guideImageRef.current}
                          opacity={overlayOpacity}
                          {...calculateScaledDimensions(guideImageRef.current)}
                        />
                      )}
                      {lines.map((line, i) => {
                        if (isDrawingLine(line)) {
                          return (
                            <Line
                              key={`drawing-line-${i}`}
                              points={line.points}
                              stroke={line.color}
                              strokeWidth={line.strokeWidth}
                              tension={0.5}
                              lineCap="round"
                              lineJoin="round"
                              globalCompositeOperation={
                                line.tool === 'eraser' ? 'destination-out' : 'source-over'
                              }
                            />
                          );
                        } else if (isShapeLine(line)) {
                          return (
                            <React.Fragment key={`shape-${i}`}>
                              {renderShape(line)}
                            </React.Fragment>
                          );
                        }
                        return null;
                      })}
                      {isDrawing && shape && (
                        <React.Fragment key="current-shape">
                          {shape.type === 'circle' && (
                            <Circle
                              key="current-circle"
                              x={shape.x}
                              y={shape.y}
                              radius={Math.abs(shape.width || 0) / 2}
                              stroke={color}
                              strokeWidth={brushSize}
                              draggable={false}
                            />
                          )}
                          {shape.type === 'square' && (
                            <Rect
                              key="current-square"
                              x={shape.x}
                              y={shape.y}
                              width={shape.width || 0}
                              height={shape.height || 0}
                              stroke={color}
                              strokeWidth={brushSize}
                              draggable={false}
                            />
                          )}
                          {shape.type === 'triangle' && (
                            <Line
                              key="current-triangle"
                              points={shape.points || []}
                              stroke={color}
                              strokeWidth={brushSize}
                              closed={true}
                            />
                          )}
                          {shape.type === 'hexagon' && (
                            <RegularPolygon
                              key="current-hexagon"
                              x={shape.x}
                              y={shape.y}
                              sides={6}
                              radius={shape.radius || 0}
                              stroke={color}
                              strokeWidth={brushSize}
                              draggable={false}
                            />
                          )}
                        </React.Fragment>
                      )}
                    </Layer>
                  </Stage>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buy Me a Coffee Button - Fixed position */}
        <a
          href="https://www.buymeacoffee.com/locodomo"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-full shadow-lg transition-colors z-[100] text-sm sm:text-base"
        >
          <Coffee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="font-outfit">Buy me a coffee</span>
        </a>

        {/* Animation Preview Modal */}
        {showAnimationPreview && (
          <>
            {/* Modal Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowAnimationPreview(false)}
            />
            {/* Modal Content */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50 w-[90%] max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-black">Animation Preview</h3>
                <button
                  onClick={() => setShowAnimationPreview(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                {animationUrl && (
                  <Image
                    src={animationUrl}
                    alt="Animation Preview"
                    width={500}
                    height={500}
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                )}
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out my animated sketch!')}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 004.604 3.417 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={() => window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(window.location.href)}&description=${encodeURIComponent('Check out my animated sketch!')}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0a12 12 0 0 0-3.8 23.1c-.1-1-.2-2.5.1-3.5.2-.9 1.3-5.7 1.3-5.7s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-.9 3.9-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.8-2.2 3.8-5.4 0-2.8-2-4.8-4.9-4.8-3.3 0-5.3 2.5-5.3 5.7 0 1.1.4 2.3 1.8 3 .1.1.1.2.1.3-.1.3-.3 1-.3 1.3-.1.4-.4.5-.8.3-2.2-.9-3.6-3.7-3.6-6.9 0-5.2 3.8-9.8 10.9-9.8 5.7 0 10.1 4.1 10.1 9.6 0 5.7-3.6 10.3-8.6 10.3-1.7 0-3.3-.9-3.8-2 0 0-.9 3.5-1.1 4.2-.4 1.5-1.4 3.4-2.1 4.5A12 12 0 0 0 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0z"/>
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => handleDownload('gif')}
                  className="px-3 py-1.5 bg-[#fb8500] text-white rounded-lg hover:bg-[#e67a00] transition-colors text-sm"
                >
                  Download GIF
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DrawingBoard;
