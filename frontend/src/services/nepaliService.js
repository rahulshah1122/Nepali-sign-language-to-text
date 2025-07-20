// Nepali translation and TTS service for offline functionality

// Nepali Unicode translations for the trained words
const NEPALI_TRANSLATIONS = {
  'dhanyabaad': 'धन्यवाद',
  'ghar': 'घर',
  'ma': 'म',
  'namaskaar': 'नमस्कार'
};

// Nepali pronunciation guide (Romanized)
const NEPALI_PRONUNCIATION = {
  'dhanyabaad': 'dhan-ya-baad',
  'ghar': 'ghar',
  'ma': 'ma',
  'namaskaar': 'na-mas-kaar'
};

// Text-to-Speech configuration
const TTS_CONFIG = {
  rate: 0.8, // Slower rate for better pronunciation
  pitch: 1.0,
  volume: 1.0,
  lang: 'ne-NP' // Nepali language code
};

class NepaliService {
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.availableVoices = [];
    this.nepaliVoice = null;
    this.initializeVoices();
  }

  // Initialize available voices
  initializeVoices() {
    if (this.speechSynthesis) {
      // Load voices when they become available
      if (this.speechSynthesis.getVoices().length > 0) {
        this.loadVoices();
      } else {
        this.speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      }
    }
  }

  // Load and filter available voices
  loadVoices() {
    this.availableVoices = this.speechSynthesis.getVoices();
    
    // Try to find a Nepali voice first
    this.nepaliVoice = this.availableVoices.find(voice => 
      voice.lang.includes('ne') || voice.lang.includes('hi') || voice.lang.includes('ur')
    );
    
    // Fallback to any available voice
    if (!this.nepaliVoice && this.availableVoices.length > 0) {
      this.nepaliVoice = this.availableVoices[0];
    }
  }

  // Translate English word to Nepali Unicode
  translateToNepali(englishWord) {
    const word = englishWord.toLowerCase().trim();
    return NEPALI_TRANSLATIONS[word] || englishWord;
  }

  // Get pronunciation guide
  getPronunciation(englishWord) {
    const word = englishWord.toLowerCase().trim();
    return NEPALI_PRONUNCIATION[word] || englishWord;
  }

  // Translate sentence to Nepali
  translateSentence(sentence) {
    if (!sentence) return '';
    
    const words = sentence.split(' ');
    const translatedWords = words.map(word => this.translateToNepali(word));
    return translatedWords.join(' ');
  }

  // Get pronunciation for sentence
  getSentencePronunciation(sentence) {
    if (!sentence) return '';
    
    const words = sentence.split(' ');
    const pronunciations = words.map(word => this.getPronunciation(word));
    return pronunciations.join(' ');
  }

  // Speak text using TTS
  speak(text, options = {}) {
    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return false;
    }

    // Stop any current speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice
    if (this.nepaliVoice) {
      utterance.voice = this.nepaliVoice;
    }
    
    // Configure speech parameters
    utterance.rate = options.rate || TTS_CONFIG.rate;
    utterance.pitch = options.pitch || TTS_CONFIG.pitch;
    utterance.volume = options.volume || TTS_CONFIG.volume;
    utterance.lang = options.lang || TTS_CONFIG.lang;

    // Add event listeners
    utterance.onstart = () => {
      console.log('Speech started:', text);
    };

    utterance.onend = () => {
      console.log('Speech ended:', text);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
    };

    // Start speaking
    this.speechSynthesis.speak(utterance);
    return true;
  }

  // Stop current speech
  stopSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  // Check if TTS is supported
  isTTSSupported() {
    return !!this.speechSynthesis;
  }

  // Get available voices info
  getVoicesInfo() {
    return {
      total: this.availableVoices.length,
      nepaliVoice: this.nepaliVoice ? this.nepaliVoice.name : null,
      voices: this.availableVoices.map(voice => ({
        name: voice.name,
        lang: voice.lang,
        default: voice.default
      }))
    };
  }

  // Get all available translations
  getAllTranslations() {
    return NEPALI_TRANSLATIONS;
  }

  // Check if word is supported
  isWordSupported(word) {
    const cleanWord = word.toLowerCase().trim();
    return cleanWord in NEPALI_TRANSLATIONS;
  }

  // Get word details (translation, pronunciation, etc.)
  getWordDetails(word) {
    const cleanWord = word.toLowerCase().trim();
    return {
      english: cleanWord,
      nepali: this.translateToNepali(cleanWord),
      pronunciation: this.getPronunciation(cleanWord),
      supported: this.isWordSupported(cleanWord)
    };
  }
}

// Create singleton instance
const nepaliService = new NepaliService();

export default nepaliService; 