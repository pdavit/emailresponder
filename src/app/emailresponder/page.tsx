'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckIcon, ClipboardIcon, ArrowPathIcon, TrashIcon, MagnifyingGlassIcon, ClockIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';

const languages = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'german', label: 'German' },
  { value: 'french', label: 'French' },
  { value: 'chinese-simplified', label: 'Chinese Simplified' }
];

const tones = [
  { value: 'formal', label: 'Formal' },
  { value: 'informal', label: 'Informal' }
];

interface HistoryItem {
  id: number;
  subject: string;
  originalEmail: string;
  reply: string;
  language: string;
  tone: string;
  createdAt: string;
}

export default function EmailResponderPage() {
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [language, setLanguage] = useState('english');
  const [tone, setTone] = useState('formal');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // History states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Single item delete states
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // View details states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Subscription check state
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check if user just completed payment
  const isSuccessFromStripe = searchParams.get('success') === 'true';

  const checkSubscription = useCallback(async () => {
    try {
      setSubscriptionError(null);
      const response = await fetch('/api/subscription-status');
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data.hasActiveSubscription) {
          // If user just completed payment, wait a bit for webhook to process
          if (isSuccessFromStripe) {
            console.log('Payment completed, waiting for webhook processing...');
            // Wait 3 seconds for webhook to process, then check again
            setTimeout(async () => {
              const retryResponse = await fetch('/api/subscription-status');
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.hasActiveSubscription) {
                  setShowSuccessMessage(true);
                  setIsCheckingSubscription(false);
                  return;
                }
              }
              // If still no subscription after retry, redirect to checkout
              window.location.href = '/subscribe';
            }, 3000);
            return;
          }
          
          // Not from Stripe success, redirect to subscribe page
          window.location.href = '/subscribe';
          return;
        } else {
          // User has active subscription
          if (isSuccessFromStripe) {
            setShowSuccessMessage(true);
          }
        }
      } else {
        // If there's an error and user just completed payment, don't redirect immediately
        if (isSuccessFromStripe) {
          console.log('Error checking subscription after payment, waiting...');
          setTimeout(() => {
            window.location.href = '/subscribe';
          }, 5000);
          return;
        }
        // Not from Stripe success, redirect to subscribe page
        window.location.href = '/subscribe';
        return;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionError('Failed to check subscription status');
      
      // If user just completed payment, wait before redirecting
      if (isSuccessFromStripe) {
        setTimeout(() => {
          window.location.href = '/subscribe';
        }, 5000);
        return;
      }
      
      // Not from Stripe success, redirect to subscribe page
      window.location.href = '/subscribe';
      return;
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [isSuccessFromStripe]);

  // Check subscription on component mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Load history on component mount (only after subscription check)
  useEffect(() => {
    if (!isCheckingSubscription) {
      loadHistory();
    }
  }, [isCheckingSubscription]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to load history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryError('Failed to load history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!subject.trim() || !originalEmail.trim()) {
      alert('Please fill in both subject and original email fields.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          originalEmail,
          language,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate reply');
      }

      const data = await response.json();
      setGeneratedReply(data.reply);
      
      // Reload history to show the new entry
      await loadHistory();
    } catch (error) {
      console.error('Error generating reply:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate reply. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSubject('');
    setOriginalEmail('');
    setLanguage('english');
    setTone('formal');
    setGeneratedReply('');
    setCopied(false);
  };

  const handleCopy = async () => {
    if (generatedReply) {
      try {
        await navigator.clipboard.writeText(generatedReply);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy text:', error);
        alert('Failed to copy to clipboard');
      }
    }
  };

  const handleDeleteHistory = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete history');
      }

      // Clear history state instead of refreshing the page
      setHistory([]);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting history:', error);
      alert('Failed to delete history. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setItemToDelete(item);
    setShowSingleDeleteModal(true);
  };

  const confirmSingleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeletingSingle(true);
    try {
      const response = await fetch(`/api/history/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Remove the item from the local state
      setHistory(prev => prev.filter(item => item.id !== itemToDelete.id));
      setShowSingleDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleViewDetails = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    setSubject(item.subject);
    setOriginalEmail(item.originalEmail);
    setLanguage(item.language);
    setTone(item.tone);
    setGeneratedReply(item.reply);
    setCopied(false);
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filter history based on search term
  const filteredHistory = history.filter(item =>
    item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.originalEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading state while checking subscription
  if (isCheckingSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // Show error state if subscription check failed
  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Subscription Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{subscriptionError}</p>
          <button
            onClick={checkSubscription}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div> {/* Empty div for spacing */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Email Responder
            </h1>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              <TrashIcon className="h-5 w-5" />
              Delete History
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Generate professional email replies with AI assistance
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">Payment Successful!</span>
            </div>
            <p className="mt-1 text-sm">
              Your subscription has been activated. You can now use all features of Email Responder.
            </p>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete History
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete all email reply history? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteHistory}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete All'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Item Delete Confirmation Modal */}
        {showSingleDeleteModal && itemToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Email History
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this email history item? This action cannot be undone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-6">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {itemToDelete.subject}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {truncateText(itemToDelete.originalEmail, 80)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSingleDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={isDeletingSingle}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSingleDelete}
                  disabled={isDeletingSingle}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isDeletingSingle ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {showDetailsModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Email Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Subject */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedItem.subject}</p>
                </div>

                {/* Original Email */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original Email</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedItem.originalEmail}</p>
                  </div>
                </div>

                {/* Generated Reply */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Generated Reply</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedItem.reply}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</h4>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedItem.language}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tone</h4>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedItem.tone}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created</h4>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedItem.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Email Details
            </h2>
            
            <div className="space-y-6">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Original Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original Email
                </label>
                <textarea
                  value={originalEmail}
                  onChange={(e) => setOriginalEmail(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Paste the original email here..."
                />
              </div>

              {/* Language and Tone Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {tones.map((toneOption) => (
                      <option key={toneOption.value} value={toneOption.value}>
                        {toneOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateReply}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Reply'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Generated Reply */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Generated Reply
              </h2>
              {generatedReply && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="h-5 w-5" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[300px]">
              {generatedReply ? (
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {generatedReply}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  Your generated reply will appear here...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Email History
            </h2>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          ) : historyError ? (
            <div className="text-center py-8">
              <div className="text-red-600 dark:text-red-400 mb-4">
                <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{historyError}</p>
              <button
                onClick={loadHistory}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No history items match your search.' : 'No email history yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleHistoryItemClick(item)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                      {item.subject}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleViewDetails(item, e)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleSingleDelete(item, e)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                    {truncateText(item.originalEmail, 100)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{item.language}</span>
                      <span>•</span>
                      <span className="capitalize">{item.tone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 