"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "../../../lib/auth";

interface Message {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

interface ChatResponse {
  success: boolean;
  data: string;
  message?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://sojournbackend.onrender.com";

export default function AIAssistantPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setAuthLoading(false);

      if (!authenticated) {
        // Redirect to auth page
        router.push("/auth");
      }
    };

    checkAuth();

    // Listen for storage events to update auth status
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  const handleSignOut = () => {
    AuthService.clearAuthData();
    setIsAuthenticated(false);
    router.push("/");
  };

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildQuestionWithContext = (newQuestion: string): string => {
    if (messages.length === 0) {
      return newQuestion;
    }

    // Include previous Q&A pairs as context
    const conversationHistory = messages
      .map((msg) => `Q: ${msg.question}\nA: ${msg.answer}`)
      .join("\n\n");

    return `Previous conversation:\n${conversationHistory}\n\nCurrent question: ${newQuestion}`;
  };

  const sendMessage = async () => {
    if (!currentQuestion.trim() || isLoading) return;

    // Double-check authentication before making API call
    if (!AuthService.isAuthenticated()) {
      console.error("User not authenticated");
      router.push("/auth");
      return;
    }

    const questionToSend = currentQuestion.trim();
    setCurrentQuestion("");
    setIsLoading(true);

    // Add user message immediately
    const newMessage: Message = {
      id: Date.now().toString(),
      question: questionToSend,
      answer: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      const questionWithContext = buildQuestionWithContext(questionToSend);

      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: questionWithContext,
          }),
        }
      );

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        throw new Error(
          `API Error: ${response.status} - ${
            data.message || response.statusText
          }`
        );
      }

      if (data.success) {
        // Update the message with the AI response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, answer: data.data } : msg
          )
        );
      } else {
        throw new Error("Failed to get response from AI");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Update message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                answer:
                  "Sorry, I encountered an error while processing your question. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  // Basic markdown -> HTML converter (supports **bold** and newlines)
  // Escapes HTML to prevent XSS, then replaces markdown bold markers and newlines
  const escapeHtml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const markdownToHtml = (text: string): string => {
    if (!text) return "";
    const escaped = escapeHtml(text);
    // Bold: **bold text**
    const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic: *italic text* (but not if it's already part of **bold**)
    const withItalic = withBold.replace(
      /(?<!\*)\*([^*]+?)\*(?!\*)/g,
      "<em>$1</em>"
    );
    // Convert newlines to <br>
    const withBreaks = withItalic.replace(/\r\n|\r|\n/g, "<br />");
    return withBreaks;
  };

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4'></div>
          <p className='text-green-700 text-lg'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to auth
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-100'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-green-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link
              href='/'
              className='text-2xl font-bold text-green-800 hover:text-green-700 transition-colors'
            >
              Sojourn
            </Link>

            <div className='flex items-center space-x-4'>
              <Link
                href='/hotels'
                className='text-green-700 hover:text-green-800 font-medium transition-colors'
              >
                Hotels
              </Link>
              <Link
                href='/bookings'
                className='text-green-700 hover:text-green-800 font-medium transition-colors'
              >
                Your Bookings
              </Link>
              <button
                onClick={handleSignOut}
                className='text-green-700 hover:text-red-600 font-medium transition-colors'
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className='bg-white border-b border-green-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <nav className='text-sm text-green-600'>
            <Link href='/' className='hover:text-green-800 transition-colors'>
              Home
            </Link>
            <span className='mx-2 text-green-400'>/</span>
            <Link
              href='/hotels'
              className='hover:text-green-800 transition-colors'
            >
              Hotels
            </Link>
            <span className='mx-2 text-green-400'>/</span>
            <span className='text-green-800 font-medium'>AI Assistant</span>
          </nav>
        </div>
      </div>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header Section */}
        <div className='bg-white rounded-2xl shadow-lg mb-6 overflow-hidden'>
          <div className='bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <div className='bg-green-400 bg-opacity-20 rounded-full p-3 mr-4'>
                  <svg
                    className='w-8 h-8'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                    />
                  </svg>
                </div>
                <div>
                  <h1 className='text-3xl font-bold'>Kashmir AI Assistant</h1>
                  <p className='text-green-100 mt-1'>
                    Your friendly guide to Kashmir&apos;s beauty and hospitality
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  aria-label='Clear conversation'
                  className='group flex items-center space-x-2 border border-green-700 bg-green-50 text-green-800 hover:bg-green-700 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow'
                >
                  <svg
                    className='w-4 h-4 text-green-700 group-hover:text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                    />
                  </svg>
                  <span>Clear Chat</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className='bg-white rounded-2xl shadow-lg overflow-hidden'>
          {/* Messages Area */}
          <div className='h-96 overflow-y-auto p-6 space-y-4'>
            {messages.length === 0 ? (
              <div className='text-center py-12'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Welcome to your Kashmir AI Assistant!
                </h3>
                <p className='text-gray-600 max-w-md mx-auto'>
                  Ask me anything about Kashmir, hotels, local attractions,
                  food, or travel tips. I&apos;m here to help make your journey
                  memorable!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className='space-y-4'>
                  {/* User Question */}
                  <div className='flex justify-end'>
                    <div className='bg-green-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs lg:max-w-md'>
                      <p className='text-sm'>{message.question}</p>
                      <span className='text-xs text-green-100 mt-1 block'>
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* AI Response */}
                  {message.answer ? (
                    <div className='flex justify-start'>
                      <div className='flex items-start space-x-3'>
                        <div className='bg-green-100 rounded-full p-2'>
                          <svg
                            className='w-5 h-5 text-green-600'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                            />
                          </svg>
                        </div>
                        <div className='bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs lg:max-w-md'>
                          <div
                            className='text-sm text-gray-800'
                            dangerouslySetInnerHTML={{
                              __html: markdownToHtml(message.answer),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='flex justify-start'>
                      <div className='flex items-start space-x-3'>
                        <div className='bg-green-100 rounded-full p-2'>
                          <div className='animate-pulse'>
                            <svg
                              className='w-5 h-5 text-green-600'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                              />
                            </svg>
                          </div>
                        </div>
                        <div className='bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3'>
                          <div className='flex space-x-1'>
                            <div className='w-2 h-2 bg-green-600 rounded-full animate-bounce'></div>
                            <div className='w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-100'></div>
                            <div className='w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-200'></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className='border-t border-gray-200 p-4'>
            <div className='flex space-x-3'>
              <div className='flex-1'>
                <textarea
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder='Ask me anything about Kashmir...'
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none text-black'
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!currentQuestion.trim() || isLoading}
                className='bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              >
                {isLoading ? (
                  <svg
                    className='animate-spin h-5 w-5'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className='text-xs text-gray-500 mt-2'>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Usage Tips */}
        <div className='mt-6 bg-white rounded-xl shadow-sm p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <svg
              className='w-5 h-5 mr-2 text-green-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            Tips for better conversations
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600'>
            <div className='flex items-start space-x-2'>
              <span className='text-green-600 mt-0.5'>•</span>
              <span>Ask about specific places in Kashmir</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-600 mt-0.5'>•</span>
              <span>Get hotel recommendations and booking tips</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-600 mt-0.5'>•</span>
              <span>Learn about local culture and traditions</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-600 mt-0.5'>•</span>
              <span>Find the best times to visit different attractions</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
