import type { AppLanguage } from "./sarvam/config";

export interface UiStrings {
  appName: string;
  tagline: string;
  uploadTitle: string;
  uploadHint: string;
  takePhoto: string;
  chooseFile: string;
  trySample: string;
  sampleBill: string;
  samplePrescription: string;
  sampleBankNotice: string;
  stepUploading: string;
  stepReadingDocument: string;
  stepUnderstanding: string;
  stepDone: string;
  errorGeneric: string;
  errorBlurry: string;
  errorTimeout: string;
  errorInvalidFile: string;
  tapToHear: string;
  fullDetails: string;
  documentTypeLabel: string;
  amountsLabel: string;
  datesLabel: string;
  deadlineLabel: string;
  actionRequiredLabel: string;
  askSomething: string;
  micIdle: string;
  micRecording: string;
  micTranscribing: string;
  micThinking: string;
  micSpeaking: string;
  stop: string;
  newDocument: string;
  you: string;
  assistant: string;
  listening: string;
  privacyNote: string;
  playAgain: string;
  suggestedQ1: string;
  suggestedQ2: string;
  suggestedQ3: string;
  vadMode: string;
  pttMode: string;
}

export const UI_STRINGS: Record<AppLanguage, UiStrings> = {
  "en-IN": {
    appName: "KagazBol",
    tagline: "Talk to any Indian document.",
    uploadTitle: "Photograph a document",
    uploadHint: "Bills, prescriptions, bank notices, government forms — we'll read it out for you.",
    takePhoto: "Take a photo",
    chooseFile: "Choose a file",
    trySample: "Or try a sample",
    sampleBill: "Electricity bill",
    samplePrescription: "Prescription",
    sampleBankNotice: "Bank notice",
    stepUploading: "Uploading your document...",
    stepReadingDocument: "Reading your document...",
    stepUnderstanding: "Understanding what it means...",
    stepDone: "Done",
    errorGeneric: "Something went wrong. Please try again.",
    errorBlurry: "Photo thodi blurry hai — ek aur try karein?",
    errorTimeout: "Document reading timed out. Please try again with a clearer photo.",
    errorInvalidFile: "Please upload an image file (JPEG, PNG or WebP).",
    tapToHear: "Tap to hear summary",
    fullDetails: "Full details",
    documentTypeLabel: "Document type",
    amountsLabel: "Amounts",
    datesLabel: "Dates",
    deadlineLabel: "Deadline",
    actionRequiredLabel: "What you need to do",
    askSomething: "Ask something about this document...",
    micIdle: "Tap to ask a question",
    micRecording: "Listening... tap to stop",
    micTranscribing: "Transcribing...",
    micThinking: "Thinking...",
    micSpeaking: "Speaking...",
    stop: "Stop",
    newDocument: "New document",
    you: "You",
    assistant: "KagazBol",
    listening: "Listening...",
    privacyNote: "Your document stays private — never stored",
    playAgain: "Play again",
    suggestedQ1: "How much do I owe?",
    suggestedQ2: "When is the due date?",
    suggestedQ3: "What do I need to do?",
    vadMode: "Auto-listen",
    pttMode: "Hold to speak",
  },
  "hi-IN": {
    appName: "KagazBol",
    tagline: "किसी भी भारतीय दस्तावेज़ से बात करें।",
    uploadTitle: "दस्तावेज़ की फोटो लें",
    uploadHint: "बिल, पर्चे, बैंक नोटिस, सरकारी फॉर्म — हम आपको पढ़कर सुनाएंगे।",
    takePhoto: "फोटो लें",
    chooseFile: "फ़ाइल चुनें",
    trySample: "या सैंपल आज़माएं",
    sampleBill: "बिजली का बिल",
    samplePrescription: "डॉक्टर का पर्चा",
    sampleBankNotice: "बैंक नोटिस",
    stepUploading: "आपका दस्तावेज़ अपलोड हो रहा है...",
    stepReadingDocument: "दस्तावेज़ पढ़ा जा रहा है...",
    stepUnderstanding: "समझा जा रहा है...",
    stepDone: "हो गया",
    errorGeneric: "कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।",
    errorBlurry: "फोटो थोड़ी ब्लर है — एक और कोशिश करें?",
    errorTimeout: "दस्तावेज़ पढ़ने में बहुत समय लग गया। कृपया फिर से कोशिश करें।",
    errorInvalidFile: "कृपया एक इमेज फ़ाइल अपलोड करें (JPEG, PNG या WebP)।",
    tapToHear: "सारांश सुनने के लिए टैप करें",
    fullDetails: "पूरी जानकारी",
    documentTypeLabel: "दस्तावेज़ का प्रकार",
    amountsLabel: "राशि",
    datesLabel: "तारीखें",
    deadlineLabel: "अंतिम तारीख",
    actionRequiredLabel: "आपको क्या करना है",
    askSomething: "इस दस्तावेज़ के बारे में कुछ पूछें...",
    micIdle: "सवाल पूछने के लिए टैप करें",
    micRecording: "सुन रहे हैं... रोकने के लिए टैप करें",
    micTranscribing: "लिखा जा रहा है...",
    micThinking: "सोच रहे हैं...",
    micSpeaking: "बोल रहे हैं...",
    stop: "रोकें",
    newDocument: "नया दस्तावेज़",
    you: "आप",
    assistant: "KagazBol",
    listening: "सुन रहे हैं...",
    privacyNote: "आपका दस्तावेज़ निजी रहता है — कभी संग्रहीत नहीं",
    playAgain: "फिर से सुनें",
    suggestedQ1: "कितना भरना है?",
    suggestedQ2: "अंतिम तारीख क्या है?",
    suggestedQ3: "मुझे क्या करना है?",
    vadMode: "स्वतः सुनें",
    pttMode: "दबाकर बोलें",
  },
  "mr-IN": {
    appName: "KagazBol",
    tagline: "कोणत्याही भारतीय कागदपत्राशी बोला.",
    uploadTitle: "कागदपत्राचा फोटो काढा",
    uploadHint: "बिल, चिठ्ठी, बँक नोटीस, सरकारी फॉर्म — आम्ही तुम्हाला वाचून दाखवू.",
    takePhoto: "फोटो काढा",
    chooseFile: "फाईल निवडा",
    trySample: "किंवा नमुना वापरून पहा",
    sampleBill: "वीज बिल",
    samplePrescription: "डॉक्टरांची चिठ्ठी",
    sampleBankNotice: "बँक नोटीस",
    stepUploading: "तुमचे कागदपत्र अपलोड होत आहे...",
    stepReadingDocument: "कागदपत्र वाचले जात आहे...",
    stepUnderstanding: "अर्थ समजून घेतला जात आहे...",
    stepDone: "झाले",
    errorGeneric: "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.",
    errorBlurry: "फोटो थोडा ब्लर आहे — आणखी एकदा प्रयत्न करा?",
    errorTimeout: "कागदपत्र वाचायला खूप वेळ लागला. कृपया पुन्हा प्रयत्न करा.",
    errorInvalidFile: "कृपया एक प्रतिमा फाईल अपलोड करा (JPEG, PNG किंवा WebP).",
    tapToHear: "सारांश ऐकण्यासाठी टॅप करा",
    fullDetails: "संपूर्ण तपशील",
    documentTypeLabel: "कागदपत्राचा प्रकार",
    amountsLabel: "रक्कम",
    datesLabel: "तारखा",
    deadlineLabel: "अंतिम तारीख",
    actionRequiredLabel: "तुम्हाला काय करायचे आहे",
    askSomething: "या कागदपत्राबद्दल काहीतरी विचारा...",
    micIdle: "प्रश्न विचारण्यासाठी टॅप करा",
    micRecording: "ऐकत आहे... थांबवण्यासाठी टॅप करा",
    micTranscribing: "लिहित आहे...",
    micThinking: "विचार करत आहे...",
    micSpeaking: "बोलत आहे...",
    stop: "थांबवा",
    newDocument: "नवीन कागदपत्र",
    you: "तुम्ही",
    assistant: "KagazBol",
    listening: "ऐकत आहे...",
    privacyNote: "तुमचे कागदपत्र खाजगी राहते — कधीही साठवले जात नाही",
    playAgain: "पुन्हा ऐका",
    suggestedQ1: "किती भरायचे?",
    suggestedQ2: "अंतिम तारीख कधी आहे?",
    suggestedQ3: "मला काय करायचे आहे?",
    vadMode: "स्वयं ऐका",
    pttMode: "दाबून बोला",
  },
};
