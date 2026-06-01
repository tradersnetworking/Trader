import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card mx-auto max-w-lg p-6 text-center">
          <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <button type="button" className="btn-gold mt-4" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
