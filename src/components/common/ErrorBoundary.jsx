import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#C47A6E', marginBottom: 8 }}>
            页面渲染异常
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 12 }}>
            {this.state.error?.message || '未知错误'}
          </div>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
