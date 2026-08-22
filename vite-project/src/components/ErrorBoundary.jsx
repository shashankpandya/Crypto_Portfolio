import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-surface-raised border border-negative text-white rounded-lg shadow-xl m-4 max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-3 text-negative">Section Failed to Load</h2>
          <p className="mb-6 text-muted text-sm">
            {this.state.error?.message || "An unexpected error occurred in this component."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-negative hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition duration-300 transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
          >
            Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
