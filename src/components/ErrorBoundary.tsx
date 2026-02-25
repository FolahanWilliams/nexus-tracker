'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error', 'ErrorBoundary', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[var(--color-bg-dark)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rpg-card max-w-md w-full text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="sm:w-10 sm:h-10 text-red-500" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Something went wrong</h1>
            
            <p className="text-[var(--color-text-secondary)] mb-4 sm:mb-6 text-sm sm:text-base">
              The app encountered an unexpected error. Your progress is safely saved.
            </p>
            
            {this.state.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 sm:p-3 mb-4 sm:mb-6 text-left overflow-hidden">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 rpg-button flex items-center justify-center gap-2 py-2 sm:py-3"
              >
                <RefreshCw size={16} className="sm:w-5 sm:h-5" />
                Try Again
              </button>
              <Link href="/" className="flex-1">
                <button className="w-full rpg-button !bg-[var(--color-purple)] !text-white flex items-center justify-center gap-2 py-2 sm:py-3">
                  <Home size={16} className="sm:w-5 sm:h-5" />
                  Go Home
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
