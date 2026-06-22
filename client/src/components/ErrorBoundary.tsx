import React from 'react';

type Props = { children: React.ReactNode, fallback?: React.ReactNode };
type State = { hasError: boolean, error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('UI error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{padding:16, background:'#2a1f1f', border:'1px solid #0003', borderRadius:12}}>
          <h3>An interface error occurred</h3>
          <pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
