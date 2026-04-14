import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <section className="panel">
            <div className="empty-state">
              <h3>The app could not load</h3>
              <p>
                Please reload the page. If the issue continues, check the browser console for
                details.
              </p>
              <p>{this.state.message}</p>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
