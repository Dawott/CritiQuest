import { useState, useEffect, useCallback } from 'react';
import { atom, useAtom } from 'jotai';
import { LessonWithId, LessonSection } from '../../../shared/types/database.types';
import EnhancedLessonService from '../../../server/src/services/lesson.service';

interface LessonContentState {
  currentSectionIndex: number;
  completedSections: number[];
  sectionProgress: Record<number, number>;
  startTime: number;
  totalTimeSpent: number;
}

const lessonContentAtom = atom<LessonContentState>({
  currentSectionIndex: 0,
  completedSections: [],
  sectionProgress: {},
  startTime: Date.now(),
  totalTimeSpent: 0,
});

export const useLessonContent = (lesson: LessonWithId | null) => {
  const [contentState, setContentState] = useAtom(lessonContentAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = lesson?.content.sections.sort((a, b) => a.order - b.order) || [];
  const currentSection = sections[contentState.currentSectionIndex];
  const isLastSection = contentState.currentSectionIndex === sections.length - 1;
  const canProceed = contentState.completedSections.includes(contentState.currentSectionIndex);

  //Reset po zmiane lekcji
  useEffect(() => {
    if (lesson) {
      setContentState({
        currentSectionIndex: 0,
        completedSections: [],
        sectionProgress: {},
        startTime: Date.now(),
        totalTimeSpent: 0,
      });
    }
  }, [lesson?.id, setContentState]);

  const markSectionComplete = useCallback((sectionIndex?: number) => {
    const index = sectionIndex ?? contentState.currentSectionIndex;
    setContentState(prev => ({
      ...prev,
      completedSections: prev.completedSections.includes(index) 
        ? prev.completedSections 
        : [...prev.completedSections, index],
      sectionProgress: {
        ...prev.sectionProgress,
        [index]: 1,
      },
    }));
  }, [contentState.currentSectionIndex, setContentState]);

  const updateSectionProgress = useCallback((progress: number, sectionIndex?: number) => {
    const index = sectionIndex ?? contentState.currentSectionIndex;
    setContentState(prev => ({
      ...prev,
      sectionProgress: {
        ...prev.sectionProgress,
        [index]: progress,
      },
    }));
  }, [contentState.currentSectionIndex, setContentState]);

  const goToNextSection = useCallback(() => {
    if (canProceed && !isLastSection) {
      setContentState(prev => ({
        ...prev,
        currentSectionIndex: prev.currentSectionIndex + 1,
      }));
    }
  }, [canProceed, isLastSection, setContentState]);

  const goToPreviousSection = useCallback(() => {
    if (contentState.currentSectionIndex > 0) {
      setContentState(prev => ({
        ...prev,
        currentSectionIndex: prev.currentSectionIndex - 1,
      }));
    }
  }, [contentState.currentSectionIndex, setContentState]);

  const goToSection = useCallback((index: number) => {
    if (index >= 0 && index < sections.length) {
      setContentState(prev => ({
        ...prev,
        currentSectionIndex: index,
      }));
    }
  }, [sections.length, setContentState]);

  const completeLessonSection = useCallback(async () => {
    if (!lesson) return;

    try {
      setIsLoading(true);
      const totalTimeSpent = Date.now() - contentState.startTime;
      
      await EnhancedLessonService.trackSectionCompletion(
        lesson.id,
        contentState.currentSectionIndex,
        {
          timeSpent: totalTimeSpent,
          sectionsCompleted: contentState.completedSections.length,
          totalSections: sections.length,
        }
      );
      
      markSectionComplete();
    } catch (err) {
      setError('Nie udało się zapisać postępu');
    } finally {
      setIsLoading(false);
    }
  }, [lesson, contentState, sections.length, markSectionComplete]);

  const calculateOverallProgress = useCallback(() => {
    const totalSections = sections.length;
    if (totalSections === 0) return 0;
    
    const completedWeight = contentState.completedSections.length;
    const progressWeight = Object.values(contentState.sectionProgress)
      .reduce((sum, progress) => sum + progress, 0) - completedWeight;
    
    return Math.min(((completedWeight + progressWeight) / totalSections) * 100, 100);
  }, [sections.length, contentState.completedSections, contentState.sectionProgress]);

  return {
    // Current state
    currentSection,
    currentSectionIndex: contentState.currentSectionIndex,
    sections,
    
    // Progress tracking
    completedSections: contentState.completedSections,
    sectionProgress: contentState.sectionProgress,
    overallProgress: calculateOverallProgress(),
    
    // Navigation
    canProceed,
    isLastSection,
    isFirstSection: contentState.currentSectionIndex === 0,
    
    // Actions
    markSectionComplete,
    updateSectionProgress,
    goToNextSection,
    goToPreviousSection,
    goToSection,
    completeLessonSection,
    
    // Async state
    isLoading,
    error,
  };
};