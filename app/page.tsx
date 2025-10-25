// This is the main component for your Next.js app.
// It uses React's 'useState' hook, so it must be a client component.
"use client";

import { useState, useEffect } from "react";

// Define the languages you want to offer
// Note: 'Egyptian' is not a distinct DeepL target; we use 'AR' (Arabic).
// 'Malay' (MS) is not listed; we use 'ID' (Indonesian) which is closely related.
const targetLanguages = [
  { name: "Arabic", code: "AR" },
  { name: "Spanish", code: "ES" },
  { name: "English", code: "EN-US" },
  { name: "Malay", code: "ID" },
  { name: "Chinese", code: "ZH" },
];

// Simple SVG Icon for the "Read Aloud" button
const SpeakerWaveIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
    />
  </svg>
);

export default function Home() {
  // State variables to manage the component
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translatedLang, setTranslatedLang] = useState(null); // <-- NEW: Store the lang of the translation
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voices, setVoices] = useState([]); // <-- NEW: Store available TTS voices

  // --- NEW: Load voices when component mounts ---
  useEffect(() => {
    const loadVoices = () => {
      // Get voices from the browser's speech synthesis API
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    // Load voices immediately
    loadVoices();

    // The 'voiceschanged' event fires when the voice list is ready
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Clean up the event listener
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  // --- End new effect ---

  /**
   * Handles the translation logic
   * @param {string} targetLang - The language code (e.g., "ES", "AR")
   */
  const handleTranslate = async (targetLang) => {
    // Don't run if already loading or if there's no text
    if (isLoading || !inputText) return;

    setIsLoading(true);
    setError(null);
    setTranslatedText(""); // Clear previous translation
    setTranslatedLang(null); // <-- NEW: Clear previous language
    window.speechSynthesis.cancel(); // <-- NEW: Stop any speaking

    try {
      // Call our *internal* Next.js API route
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          targetLang: targetLang,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If the API route returned an error, show it
        throw new Error(data.message || "Something went wrong");
      }

      // Success! Update the state with the translated text
      setTranslatedText(data.translation);
      setTranslatedLang(targetLang); // <-- NEW: Save the language code
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      // Always stop the loading indicator
      setIsLoading(false);
    }
  };

  // --- NEW: Function to handle Text-to-Speech ---
  const handleReadAloud = () => {
    if (
      !translatedText ||
      !translatedLang ||
      typeof window.speechSynthesis === "undefined"
    ) {
      console.error("Speech synthesis not supported or no text to read.");
      return;
    }

    // Stop any speech that is currently playing
    window.speechSynthesis.cancel();

    // Create a new speech utterance
    const utterance = new SpeechSynthesisUtterance(translatedText);

    // Find a voice that matches the translated language
    // We use `startsWith` because 'ES' should match 'es-ES', 'es-MX', etc.
    const languageCode = translatedLang.toLowerCase();
    const voice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(languageCode)
    );

    if (voice) {
      utterance.voice = voice;
      console.log(`Using voice: ${voice.name} (${voice.lang})`);
    } else {
      // If no specific voice is found, set the lang property.
      // The browser will try to use a default voice for that language.
      utterance.lang = languageCode;
      console.warn(`No specific voice found for ${languageCode}. Using default.`);
    }

    // Speak the text
    window.speechSynthesis.speak(utterance);
  };
  // --- End new function ---

  // Helper component for the loading spinner
  const LoadingSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 font-inter">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          DeepL Translator
        </h1>

        <div className="flex flex-col gap-6">
          {/* INPUT TEXT AREA */}
          <div className="w-full">
            <label
              htmlFor="inputText"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Enter text to translate:
            </label>
            <textarea
              id="inputText"
              rows={5}
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste your text here..."
            />
          </div>

          {/* TRANSLATION BUTTONS */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {targetLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                disabled={isLoading || !inputText}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Show spinner if loading this specific translation */}
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Translating...
                  </>
                ) : (
                  `Translate to ${lang.name}`
                )}
              </button>
            ))}
          </div>

          {/* OUTPUT / RESULT AREA */}
          {/* We show this section only if there is an error, loading, or translated text */}
          {(isLoading || error || translatedText) && (
            <div className="w-full">
              {/* --- MODIFIED: Label and Button are now in a flex container --- */}
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="translatedText"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Translation:
                </label>
                {/* --- NEW: Read Aloud Button --- */}
                {translatedText && !isLoading && !error && (
                  <button
                    onClick={handleReadAloud}
                    title="Read aloud"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <SpeakerWaveIcon className="w-4 h-4" />
                    Read Aloud
                  </button>
                )}
                {/* --- End new button --- */}
              </div>
              {/* --- End modified section --- */}

              <div
                id="translatedText"
                className="w-full p-4 min-h-[140px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
              >
                {/* Show error message if any */}
                {error && (
                  <p className="text-red-500 dark:text-red-400 font-medium">
                    Error: {error}
                  </p>
                )}

                {/* Show loading state */}
                {isLoading && !error && (
                  <p className="text-gray-500 dark:text-gray-400">
                    Translating...
                  </p>
                )}

                {/* Show translated text */}
                {!isLoading && !error && translatedText && (
                  <p className="whitespace-pre-wrap">{translatedText}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

