'use client';

import { CutsceneDirector } from '@/cutscenes/CutsceneDirector';
import { CS_INTRO, CS_NOMINATION, CS_SELECTION } from '@/cutscenes/scripts';
import { useGame } from '@/hooks/useGame';
import { TrainingScene } from '@/scenes/Training/TrainingScene';

/** 3D side of the prologue: cutscenes, then the training hangar. */
export function PrologueScene() {
  const step = useGame((state) => state.prologueStep);
  const advancePrologue = useGame((state) => state.advancePrologue);

  switch (step) {
    case 'intro':
      return <CutsceneDirector key="intro" script={CS_INTRO} onComplete={advancePrologue} />;
    case 'nomination':
      return <CutsceneDirector key="nomination" script={CS_NOMINATION} onComplete={advancePrologue} />;
    case 'selection':
      return <CutsceneDirector key="selection" script={CS_SELECTION} onComplete={advancePrologue} />;
    case 'training':
      return <TrainingScene key="training" interactive />;
    case 'crew':
    case 'graduation':
      return <TrainingScene key="showcase" interactive={false} />;
  }
}
