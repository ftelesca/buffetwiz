import { useState, useEffect } from 'react';
import { MarkdownRenderer } from '../chat/MarkdownRenderer';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  enableMarkdown?: boolean;
}

export function TypingAnimation({ 
  text, 
  speed = 30, 
  onComplete, 
  className = "",
  enableMarkdown = false
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, speed, onComplete, isComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  if (enableMarkdown) {
    return (
      <div className={className}>
        <MarkdownRenderer content={displayedText} />
        {currentIndex < text.length && (
          <span className="inline-block w-2 h-5 bg-primary/70 animate-pulse ml-1 align-text-bottom" />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-2 h-5 bg-primary/70 animate-pulse ml-1 align-text-bottom" />
      )}
    </div>
  );
}