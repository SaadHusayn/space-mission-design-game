'use client';

import { Component, type ReactNode } from 'react';

import { WebGLFallback } from '@/ui/WebGLFallback';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

/** Catches crashes in the 3D tree and shows a readable message instead of a blank page. */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message !== null) return <WebGLFallback reason={this.state.message} />;
    return this.props.children;
  }
}
