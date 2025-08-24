// app/emailresponder/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  ClipboardIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import RequireAuth from "@/components/RequireAuth";
import RequireSubscription from "@/components/RequireSubscription";
import ProfileMenu from "@/components/ProfileMenu";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { History } from "@/types/history";

/* ------------------------------- Copy Button ------------------------------- */
function CopyReplyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const text = getText()?.trim();
      if (!text) throw new Error("Nothing to copy");

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error(e);
      alert("Failed to copy. Try Ctrl/Cmd+C.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 rounded-md px-3 py-2 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      style={{ pointerEvents: "auto", position: "relative", zIndex: 10 }}
      aria-live="polite"
    >
      <ClipboardIcon className="h-5 w-5" />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* --------------------------------- Page ---------------------------------- */
export default function EmailResponderPage() {
  // Auth state
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? "");
    });
    return () => unsub();
  }, []);

  // Form state
  const [subject, setSubject] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("professional");
  const [stance, setStance] = useState<"positive" | "negative" | "neutral">(
    "positive",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<History[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Delete / modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<History | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<History | null>(null);

  // Load history when uid is available
  useEffect(() => {
    if (!uid) return;
    loadHistory(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const loadHistory = async (userId: string) => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/history?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to load history");
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error("Error loading history:", err);
      setHistoryError("Failed to load history. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!subject.trim() || !originalEmail.trim()) {
      alert("Please fill in both subject and original email fields.");
      return;
    }
    if (!uid) {
      setError("You must be signed in to generate replies.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          subject,
          originalEmail,
          language,
          tone,
          stance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate reply");
      }

      const data = await response.json();
      setGeneratedReply(data.reply);
      await loadHistory(uid);
    } catch (err) {
      console.error("Error generating reply:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate reply. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setOriginalEmail("");
    setLanguage("English");
    setTone("professional");
    setStance("positive");
    setGeneratedReply("");
    setError(null);
  };

  // Delete modals
  const openDeleteAllModal = () => {
    setIsDeleting(false);
    setIsConfirmOpen(true);
  };
  const closeDeleteAllModal = () => {
    setIsDeleting(false);
    setIsConfirmOpen(false);
  };

  const handleDeleteHistory = async () => {
    if (!uid) {
      alert("You must be signed in to delete history.");
      return;
    }
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/history?userId=${uid}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ?? "Failed to delete history. Please try again.";
        console.error("❌ Delete history failed:", errorMessage);
        alert(errorMessage);
        setIsDeleting(false);
        return;
      }
      const data = await response.json();
      setHistory([]);
      alert(`Successfully deleted ${data.deletedCount} history items`);
      closeDeleteAllModal();
    } catch (err) {
      console.error("❌ Error deleting history:", err);
      alert("Network error. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = (item: History, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const confirmSingleDelete = async () => {
    if (!itemToDelete) return;
    if (!uid) {
      alert("You must be signed in to delete items.");
      return;
    }
    try {
      setIsDeletingSingle(true);
      const response = await fetch(
        `/api/history/${itemToDelete.id}?userId=${uid}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ?? "Failed to delete item. Please try again.";
        console.error("❌ Single delete failed:", errorMessage);
        alert(errorMessage);
        return;
      }
      setHistory((prev) => prev.filter((h) => h.id !== itemToDelete.id));
      setItemToDelete(null);
      alert("Item deleted successfully");
    } catch (err) {
      console.error("❌ Error deleting item:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Details
  const handleViewDetails = (item: History, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleHistoryItemClick = (item: History) => {
    setSubject(item.subject);
    setOriginalEmail(item.originalEmail);
    setLanguage(item.language);
    setTone(item.tone);
    setGeneratedReply(item.reply);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // utils
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text: string, maxLength: number) =>
    text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;

  const filteredHistory = history.filter(
    (item) =>
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.originalEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /* --------------------------------- UI ---------------------------------- */
  return (
    <RequireAuth>
      <RequireSubscription>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-between mb-4">
                <div />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Email Responder
                </h1>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openDeleteAllModal}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
                    disabled={isDeleting}
                  >
                    Delete History
                  </button>
                  <ProfileMenu userEmail={email} />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Generate professional email replies with AI assistance
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="font-medium">Error:</span> {error}
                </div>
              </div>
            )}

            {/* Delete All Confirmation */}
            {isConfirmOpen && !itemToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Delete History
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete all email reply history?
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={closeDeleteAllModal}
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
                      {isDeleting ? "Deleting..." : "Delete All"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Single Item Delete */}
            {itemToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Delete Email History
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete this email history item?
                    This action cannot be undone.
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
                        setItemToDelete(null);
                        setIsConfirmOpen(false);
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
                      {isDeletingSingle ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Details Modal */}
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
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subject
                      </h4>
                      <p className="text-gray-900 dark:text-gray-100">
                        {selectedItem.subject}
                      </p>
                    </div>

                    {/* Original Email */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Original Email
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {selectedItem.originalEmail}
                        </p>
                      </div>
                    </div>

                    {/* Generated Reply */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Generated Reply
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {selectedItem.reply}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Language
                        </h4>
                        <p className="text-gray-900 dark:text-gray-100 capitalize">
                          {selectedItem.language}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tone
                        </h4>
                        <p className="text-gray-900 dark:text-gray-100 capitalize">
                          {selectedItem.tone}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Created
                        </h4>
                        <p className="text-gray-900 dark:text-gray-100">
                          {formatDate(selectedItem.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main two-column */}
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

                  {/* Language / Tone */}
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
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="German">German</option>
                        <option value="French">French</option>
                        <option value="Chinese Simplified">Chinese Simplified</option>
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
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                        <option value="informal">Informal</option>
                      </select>
                    </div>
                  </div>

                  {/* Reply Stance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reply stance
                    </label>
                    <div className="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
                      {(["positive", "negative", "neutral"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setStance(opt)}
                          className={`px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                            stance === opt
                              ? opt === "positive"
                                ? "bg-green-600 text-white shadow-sm"
                                : opt === "negative"
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "bg-blue-600 text-white shadow-sm"
                              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                          aria-pressed={stance === opt}
                        >
                          <span className="text-base">
                            {opt === "positive" ? "✅" : opt === "negative" ? "❌" : "🤔"}
                          </span>
                          <span>
                            {opt === "positive" ? "Positive" : opt === "negative" ? "Negative" : "Neutral"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateReply}
                      disabled={isGenerating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? "Generating..." : "Generate Reply"}
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
                  {generatedReply && <CopyReplyButton getText={() => generatedReply} />}
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
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
                </div>
              ) : historyError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <svg
                      className="h-8 w-8 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{historyError}</p>
                  <button
                    onClick={() => uid && loadHistory(uid)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm ? "No history items match your search." : "No email history yet."}
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
      </RequireSubscription>
    </RequireAuth>
  );
}
