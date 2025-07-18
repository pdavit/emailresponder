'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, ClipboardIcon, ArrowPathIcon, TrashIcon, MagnifyingGlassIcon, ClockIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

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
        throw new Error('Failed to generate reply');
      }

      const data = await response.json();
      setGeneratedReply(data.reply);
      
      // Reload history to show the new entry
      await loadHistory();
    } catch (error) {
      console.error('Error generating reply:', error);
      alert('Failed to generate reply. Please try again.');
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
    return date.toLocaleDateString('en-US', {    year: 'numeric',
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
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Email Details
              </h2>
              
              {/* Subject Input */}
              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Original Email Textarea */}
              <div className="mb-4">
                <label htmlFor="originalEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original Email
                </label>
                <textarea
                  id="originalEmail"
                  value={originalEmail}
                  onChange={(e) => setOriginalEmail(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                  placeholder="Paste the original email here..."
                />
              </div>

              {/* Language Dropdown */}
              <div className="mb-4">
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone Dropdown */}
              <div className="mb-6">
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {tones.map((toneOption) => (
                    <option key={toneOption.value} value={toneOption.value}>
                      {toneOption.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGenerateReply}
                  disabled={isLoading || !subject.trim() || !originalEmail.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
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
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Generated Reply */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generated Reply
                </h2>
                {generatedReply && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardIcon className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="min-h-[200px] p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                {generatedReply ? (
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {generatedReply}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Generating your reply...
                      </div>
                    ) : (
                      'Your generated reply will appear here'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClockIcon className="h-6 w-6" />
              Email History
            </h2>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white w-64"
              />
            </div>
          </div>

          {/* History Content */}
          {isLoadingHistory ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Loading history...</p>
            </div>
          ) : historyError ? (
            <div className="text-center py-8">
              <p className="text-red-500 dark:text-red-400 mb-2">{historyError}</p>
              <button
                onClick={loadHistory}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {searchTerm ? 'No history found matching your search.' : 'No email history yet.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleHistoryItemClick(item)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white flex-1 mr-4">
                      {item.subject}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleViewDetails(item, e)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleSingleDelete(item, e)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{formatDate(item.createdAt)}</span>
                    <div className="flex gap-4">
                      <span>Language: {item.language}</span>
                      <span>Tone: {item.tone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {truncateText(item.originalEmail, 100)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reply:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {truncateText(item.reply, 50)}
                      </p>
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