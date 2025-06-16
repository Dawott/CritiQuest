import React from 'react';
import { LessonSection } from '@/types/database.types';
import { TextContent } from './TextContent';
//import { VideoContent } from './VideoContent';
import { InteractiveContent } from './InteractiveContent';

interface ContentRendererProps {
  section: LessonSection;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

export const ContentRenderer: React.FC<ContentRendererProps> = (props) => {
  switch (props.section.type) {
    case 'text':
      return <TextContent {...props} />;
    /*case 'video':
      return <VideoContent {...props} />;*/
    case 'interactive':
      return <InteractiveContent {...props} />;
    default:
      return <TextContent {...props} />;
  }
};