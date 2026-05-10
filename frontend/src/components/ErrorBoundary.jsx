import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#121212', minHeight: '100vh', color: '#ef4444' }}>
                    <h1 style={{ marginBottom: '1rem' }}>Something went wrong.</h1>
                    <p style={{ color: '#d6d6d6', marginBottom: '1rem' }}>The application encountered an unexpected error.</p>
                    <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: 'rgba(255,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ marginTop: '2rem', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
