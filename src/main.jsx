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
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <section className="panel">
            <div className="empty-state">
              <h3>Die App konnte nicht geladen werden</h3>
              <p>Bitte lade die Seite neu. Wenn das Problem bleibt, sag mir die Fehlermeldung aus der Browser-Konsole.</p>
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
