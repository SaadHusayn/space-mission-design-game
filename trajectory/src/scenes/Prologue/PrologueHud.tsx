'use client';

import { useEffect } from 'react';

import { CutsceneOverlay } from '@/cutscenes/CutsceneOverlay';
import { useGame } from '@/hooks/useGame';
import { TrainingHud } from '@/scenes/Training/TrainingHud';
import { trainingStore } from '@/scenes/Training/trainingStore';
import { CrewSetup } from '@/ui/CrewSetup';

import { GraduationPanel } from './GraduationPanel';

/** 2D side of the prologue. */
export function PrologueHud() {
  const step = useGame((state) => state.prologueStep);

  useEffect(() => {
    if (step === 'training') trainingStore.getState().reset();
  }, [step]);

  switch (step) {
    case 'intro':
    case 'nomination':
    case 'selection':
      return <CutsceneOverlay />;
    case 'crew':
      return <CrewSetup />;
    case 'training':
      return <TrainingHud />;
    case 'graduation':
      return <GraduationPanel />;
  }
}
