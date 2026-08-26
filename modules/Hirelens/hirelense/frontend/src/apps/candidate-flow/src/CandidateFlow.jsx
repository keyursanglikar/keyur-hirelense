import React, { useState, useEffect, useRef } from 'react';
import mockClient from '../../../shared/api/client';

// Simulated pleasant beep for speaker testing
const playTestSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.error("Test sound failed to play", e);
  }
};

const CASE_STUDY_DATA = {
  title: "ASMT-10 Mismatch Resolution",
  scenario: "Client: Kulkarni Logistics Ltd. GSTIN is active in Pune. A notice in Form GST ASMT-10 has been issued. The purchase register shows GSTR-3B ITC claimed exceeds the auto-populated GSTR-2B credit by ₹4.2 Lakhs.",
  task: "Explain how you would investigate the discrepancy. What documents will you request from the client, how will you identify timing differences, and what points will you write in the reply draft?"
};

const MCQ_QUESTIONS = [
  { id: 1, text: "ITC on motor vehicles for transport of persons (seating capacity ≤ 13) is blocked u/s 17(5) except when used for:", options: ["Executive staff transport", "Further supply of such vehicles", "Daily employee pick-and-drop", "Any business travel exceeding 100km"], answer: 1 },
  { id: 2, text: "Under AS 10 / Ind AS 16, which of the following costs incurred on property, plant and equipment should be capitalised?", options: ["Cost of open day inauguration ceremonies", "Initial delivery and handling costs", "Costs of introducing a new service", "Administration overheads"], answer: 1 },
  { id: 3, text: "TDS under Section 194C applies on a single payment to a contractor if the amount exceeds:", options: ["₹10,000", "₹20,000", "₹30,000", "₹50,000"], answer: 2 },
  { id: 4, text: "Under AS 2 / Ind AS 2, inventories should be measured at the lower of cost and:", options: ["Fair Value", "Replacement Value", "Net Realisable Value", "Historical Cost"], answer: 2 },
  { id: 5, text: "Interest on delayed payment of GST under Section 50(1) is charged at the rate of:", options: ["12% per annum", "15% per annum", "18% per annum", "24% per annum"], answer: 2 },
];

export default function CandidateFlow() {
  // Navigation Screens: 
  // 1: Candidate Sign In, 2: Invitation, 3: Verification (OTP), 4: Consent, 5: Device Check, 
  // 6: About You, 7: Instructions, 8: AI Interview, 9: Round Completed,
  // 10: Case Study, 11: MCQ Test, 12: Completed
  const [screen, setScreen] = useState(1);
  
  // Dynamic Theme (Clean Light vs Dark Stage)
  // Screens 8 (Interview), 9 (Round Comp), 10 (Case Study), 11 (MCQ), 12 (Completed) are Dark Stage Mode
  const isDarkMode = [8, 9, 10, 11, 12].includes(screen);

  // --- STATE DATA ---
  const [candLoginEmail, setCandLoginEmail] = useState('');
  const [candRefCode, setCandRefCode] = useState('');
  
  // Live backend integrated data
  const [candidateData, setCandidateData] = useState(null);
  const [openingData, setOpeningData] = useState(null);
  const [flowRounds, setFlowRounds] = useState([]);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(112);
  const [consentChecked, setConsentChecked] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  
  // Media Devices
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [cameraConfirmed, setCameraConfirmed] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [audioError, setAudioError] = useState(false);
  
  // About You Form Fields
  const [candidateId, setCandidateId] = useState('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [expectedCtc, setExpectedCtc] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const formatExpiryDate = (dateStr) => {
    try {
      let date;
      if (dateStr) {
        const cleanStr = dateStr.replace(' UTC', '');
        date = new Date(cleanStr);
      }
      
      if (!date || isNaN(date.getTime())) {
        date = new Date();
        date.setHours(date.getHours() + 48);
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return {
        dayMonth: `${day} ${month}`,
        year: `${year}`
      };
    } catch (e) {
      return { dayMonth: "31 Jul", year: "2026" };
    }
  };
  const [resumeUploaded, setResumeUploaded] = useState(true);

  // Live Interview Logic
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [speakingState, setSpeakingState] = useState('idle'); // 'asking', 'listening', 'done'
  const [questionTimer, setQuestionTimer] = useState(15);
  const [examStartTimer, setExamStartTimer] = useState(10);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [answerTimer, setAnswerTimer] = useState(120);
  const [replayUsed, setReplayUsed] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteEvents, setPasteEvents] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [answersList, setAnswersList] = useState({});
  const [currentTranscript, setCurrentTranscript] = useState('');
  const currentTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    currentTranscriptRef.current = currentTranscript;
  }, [currentTranscript]);

  // Keep speakingStateRef always in sync so async callbacks (recognition.onend) read fresh value
  useEffect(() => {
    speakingStateRef.current = speakingState;
    isListeningRef.current = speakingState === 'listening';
  }, [speakingState]);

  const recognitionRef = useRef(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState('');
  const [showProtoSwitcher, setShowProtoSwitcher] = useState(false);
  const [showIntegrityPanel, setShowIntegrityPanel] = useState(false);
  const [integrityScreenshots, setIntegrityScreenshots] = useState([]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micTestState, setMicTestState] = useState('untested');
  const [micTestError, setMicTestError] = useState('');
  const [micTestUrl, setMicTestUrl] = useState(null);
  const [micTestTimer, setMicTestTimer] = useState(0);
  const micTestRecorderRef = useRef(null);
  const micTestChunksRef = useRef([]);
  const micTestIntervalRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const liveTranscribeIntervalRef = useRef(null);
  const [indianVoice, setIndianVoice] = useState(null);
  const [speakerState, setSpeakerState] = useState('untested'); // 'untested', 'playing', 'tested', 'verified'
  const [latency, setLatency] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('Measuring Connection...');
  const [hasMicPermission, setHasMicPermission] = useState(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true); // track if Web Speech API works

  // Case Study Logic
  const [caseStudyStage, setCaseStudyStage] = useState('reading'); // 'reading', 'answering', 'done'
  const [caseReadingTimer, setCaseReadingTimer] = useState(105); // 1m 45s reading time
  const [maxCaseReadingTime, setMaxCaseReadingTime] = useState(105);
  const [caseAnswerTimer, setCaseAnswerTimer] = useState(0);

  // MCQ Test Logic
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [mcqFlagged, setMcqFlagged] = useState({});
  const [selectedMcqIdx, setSelectedMcqIdx] = useState(0);
  const [mcqTimer, setMcqTimer] = useState(480); // 8 mins

  // Refs
  const videoRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const faceModelRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  // Ref that mirrors speakingState — avoids stale closure in recognition.onend
  const speakingStateRef = useRef('idle');
  const isListeningRef = useRef(false); // true while recognition should be active

  // --- INTERVIEW DATA STRUCTURES ---
  const ROUNDS_DATA = [
    {
      id: "hr",
      name: "HR Conversation",
      duration: "8 mins",
      questions: [
        { id: 1, text: "Tell me about yourself and what draws you to audit and taxation." },
        { id: 2, text: "Describe a deadline you nearly missed. What did you learn and change afterwards?" }
      ]
    },
    {
      id: "tech",
      name: "Technical Fundamentals",
      duration: "10 mins",
      questions: [
        { id: 3, text: "Explain the key differences between a tax audit u/s 44AB and a statutory audit under the Companies Act.", timeLimit: 3 },
        { id: 4, text: "A client repairs a machine for ₹3 lakh. Capitalise or expense — how do you decide?", timeLimit: 3 }
      ]
    }
  ];

  const [roundsList, setRoundsList] = useState(ROUNDS_DATA);

  const getQuestionTimeLimitSeconds = (roundIdx, qIdx) => {
    try {
      const q = roundsList[roundIdx]?.questions?.[qIdx];
      if (q && q.timeLimit) {
        return parseInt(q.timeLimit) * 60;
      }
    } catch (e) {}
    return 120; // Default fallback to 2 minutes
  };

  const getMcqQuestionsList = () => {
    const currentRound = roundsList[currentRoundIdx];
    if (!currentRound || !currentRound.questions) return [];
    const list = [];
    currentRound.questions.forEach(q => {
      if (q.mcqs && q.mcqs.length > 0) {
        q.mcqs.forEach((m, mIdx) => {
          list.push({
            id: `q${q.id}_m${mIdx}`,
            text: m.question,
            options: m.options ? m.options.map(o => o.text || o) : [],
            answer: m.correctAnswer
          });
        });
      } else {
        list.push({
          id: `q${q.id}`,
          text: q.text || q.question || "",
          options: q.options || [],
          answer: q.answer
        });
      }
    });
    return list;
  };

  const getActiveCaseStudyData = () => {
    const currentRound = roundsList[currentRoundIdx];
    if (currentRound && (currentRound.id === 'case' || currentRound.type === 'case')) {
      const q = currentRound.questions?.[currentQuestionIdx];
      if (q) {
        const text = q.text || q.question || "";
        let title = currentRound.name || "Case Study";
        let scenario = text;
        let task = "Analyze the scenario details above and propose a resolution strategy.";
        if (text.includes("Scenario:") || text.includes("Task:")) {
          const parts = text.split(/Scenario:|Task:/i);
          if (parts.length >= 3) {
            scenario = parts[1].trim();
            task = parts[2].trim();
          }
        }
        return { title, scenario, task };
      }
    }
    return CASE_STUDY_DATA;
  };

  const activeMcqs = getMcqQuestionsList().length > 0 ? getMcqQuestionsList() : MCQ_QUESTIONS;
  const activeCaseData = getActiveCaseStudyData();

  const handleTokenLogin = async (token) => {
    try {
      const response = await mockClient.get(`/api/interview-invitations/${token}/`);
      const data = response.data;
      
      setCandidateData({
        id: data.candidate_id,
        candidate_id: data.candidate_id,
        name: data.candidate_name,
        email: data.candidate_email,
        status: 'Invited'
      });
      setOpeningData({
        id: data.invitation_id,
        title: data.job_title,
        tenant_name: data.company_name,
        experience: data.opening_experience || '',
        salary: data.opening_salary || ''
      });
      setFlowRounds(data.flow?.rounds || []);
      setExpiresAt(data.expires_at || '');

        // Session Restore Check
        let isSessionRestored = false;
        const sessionKey = `hl_session_${data.candidate_id}`;
        const saved = localStorage.getItem(sessionKey);
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p.screen >= 4 && p.screen !== 14) {
              setScreen(p.screen);
              setCurrentRoundIdx(p.currentRoundIdx || 0);
              setCurrentQuestionIdx(p.currentQuestionIdx || 0);
              if (p.answersList) setAnswersList(p.answersList);
              if (p.mcqAnswers) setMcqAnswers(p.mcqAnswers);
              if (p.mcqTimer) setMcqTimer(p.mcqTimer);
              if (p.caseAnswerTimer) setCaseAnswerTimer(p.caseAnswerTimer);
              if (p.tabSwitches) setTabSwitches(p.tabSwitches);
              if (p.pasteEvents) setPasteEvents(p.pasteEvents);
              if (p.replayUsed) setReplayUsed(p.replayUsed);
              isSessionRestored = true;
            }
          } catch(e) {}
        }
        
        if (data.flow?.rounds && data.flow.rounds.length > 0) {
        const mappedRounds = data.flow.rounds.map(r => ({
          id: r.type,
          name: r.name || (r.type === 'hr' ? 'HR Conversation' : r.type === 'tech' ? 'Technical Q&A' : r.type === 'case' ? 'Case Study' : r.type === 'mcq' ? 'Knowledge Test (MCQ)' : r.type.toUpperCase()),
          duration: `${r.dur} mins`,
          questions: r.questions && r.questions.length > 0
            ? r.questions.map((q, qidx) => ({
                id: q.id || qidx + 1,
                text: q.question || q.question_text || q.text || "",
                timeLimit: q.timeLimit || 2,
                options: q.options || [],
                answer: q.answer || "",
                mcqs: q.mcqs || []
              }))
            : (r.type === 'hr' ? [
                { id: 1, text: "Tell me about yourself and what draws you to audit and taxation." },
                { id: 2, text: "Describe a deadline you nearly missed. What did you learn and change afterwards?" }
              ] : [
                { id: 3, text: "Explain the key differences between a tax audit u/s 44AB and a statutory audit under the Companies Act." },
                { id: 4, text: "A client repairs a machine for ₹3 lakh. Capitalise or expense — how do you decide?" }
              ])
        }));
        setRoundsList(mappedRounds);
      }
      
      // Auto-populate About You fields
      setCandidateId(data.candidate_id || '');
      setCandLoginEmail(data.candidate_email || '');
      setPhone(data.candidate_phone || '');
      setQualification(data.candidate_qualification || '');
      setExperience(data.candidate_experience || data.opening_experience || '');
      setNoticePeriod(data.candidate_notice_period || '');
      setExpectedCtc(data.candidate_expected_ctc || data.opening_salary || '');
      setLinkedin(data.candidate_linkedin || '');
      
      // Restore session if it was already In Progress, otherwise go to welcome screen (Screen 2)
      if (!isSessionRestored) {
        if (data.session && data.session.status === 'In Progress') {
          setCurrentRoundIdx(data.session.current_round || 0);
          setCurrentQuestionIdx(data.session.current_question || 0);
          setScreen(7);
          triggerToast({ bold: "Session Restored:", normal: `Resuming your interview at Round ${data.session.current_round + 1}.` });
        } else {
          setScreen(2);
        }
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      triggerToast({ bold: "Invalid Link:", normal: error.message || "This interview link is invalid or expired." }, true);
    }
  };

  // Automatically read student_id query param or token from the invitation link
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/interview/invite/')) {
      const token = path.split('/').pop();
      if (token && token.trim()) {
        handleTokenLogin(token.trim());
      }
    } else {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        handleTokenLogin(token);
      } else {
        const studId = params.get('student_id') || params.get('ref');
        if (studId) {
          setCandRefCode(studId);
        }
        const email = params.get('email');
        if (email) {
          setCandLoginEmail(email);
        }
      }
    }
  }, []);


  // --- WEBCAM & AUDIO EFFECTS ---
  useEffect(() => {
    // Request webcam/mic access when arriving on device check (5), AI Interview (8), Case Study (10)
    if ((screen === 5 && !cameraConfirmed) || screen === 8 || screen === 10) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [screen, cameraConfirmed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      clearInterval(audioIntervalRef.current);
      clearInterval(timerIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sync camera stream to video DOM elements to prevent black screen rendering issues
  useEffect(() => {
    if (cameraStream) {
      if (videoRef.current && videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject !== cameraStream) {
        hiddenVideoRef.current.srcObject = cameraStream;
      }
    }
  }, [cameraStream, screen, hasCameraPermission, showCameraModal]);

  const startCamera = async () => {
    try {
      if (cameraStream) return;
      
      let videoStream = null;
      let audioStream = null;
      
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
      } catch (err) {
        console.warn("Camera permission denied:", err);
        setHasCameraPermission(false);
      }
      
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
      } catch (err) {
        console.warn("Microphone permission denied:", err);
        setHasMicPermission(false);
      }
      
      if (videoStream && audioStream) {
        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);
        setCameraStream(combinedStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = combinedStream;
        }
        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.srcObject = combinedStream;
        }
        setupAudioAnalyser(combinedStream);
      } else {
        if (videoStream) videoStream.getTracks().forEach(t => t.stop());
        if (audioStream) audioStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setAudioError(true);
      }
    } catch (err) {
      console.warn("Error starting media devices:", err);
      setHasCameraPermission(false);
      setHasMicPermission(false);
      setAudioError(true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    clearInterval(audioIntervalRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleSaveAndContinue = async () => {
    if (!hasCameraPermission) {
      triggerToast({ bold: "Camera Access Required:", normal: "Please allow camera access to start the assessment." }, true);
      return;
    }
    if (!hasMicPermission) {
      triggerToast({ bold: "Microphone Access Required:", normal: "Please allow microphone access to start the assessment." }, true);
      return;
    }
    if (!capturedPhoto) {
      triggerToast({ bold: "Profile Snapshot Required:", normal: "Please click 'Capture Profile Snapshot' to verify your identity." }, true);
      return;
    }
    if (speakerState !== 'verified') {
      triggerToast({ bold: "Speaker Check Required:", normal: "Please play the test beep and verify your speaker works." }, true);
      return;
    }
    try {
      await mockClient.patch(`/api/candidates/${candidateData.id}/`, {
        webcam_snapshot: capturedPhoto
      });
      setScreen(6);
    } catch (err) {
      console.error("Failed to save webcam snapshot:", err);
      setScreen(6);
    }
  };

  // Real-time stream monitor to check if tracks are dynamically muted/ended
  useEffect(() => {
    if (!cameraStream) return;
    
    const handleTrackEvent = () => {
      const videoTrack = cameraStream.getVideoTracks()[0];
      const audioTrack = cameraStream.getAudioTracks()[0];
      
      const videoOk = videoTrack && videoTrack.readyState === 'live' && !videoTrack.muted;
      const audioOk = audioTrack && audioTrack.readyState === 'live' && !audioTrack.muted;
      
      setHasCameraPermission(!!videoOk);
      setHasMicPermission(!!audioOk);
    };

    cameraStream.getTracks().forEach(track => {
      track.addEventListener('mute', handleTrackEvent);
      track.addEventListener('unmute', handleTrackEvent);
      track.addEventListener('ended', handleTrackEvent);
    });

    return () => {
      cameraStream.getTracks().forEach(track => {
        track.removeEventListener('mute', handleTrackEvent);
        track.removeEventListener('unmute', handleTrackEvent);
        track.removeEventListener('ended', handleTrackEvent);
      });
    };
  }, [cameraStream]);

  const setupAudioAnalyser = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (audioContext.state === 'suspended') {
        const resumeCtx = () => {
          audioContext.resume().then(() => {
            document.removeEventListener('click', resumeCtx);
          });
        };
        document.addEventListener('click', resumeCtx);
      }

      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Map average volume to percentage (capped)
        setMicLevel(Math.min(Math.round((avg / 128) * 100), 100));
      }, 100);
    } catch (e) {
      console.error("Audio analyser failed", e);
    }
  };

  const startMicTest = async () => {
    setMicTestError('');
    setMicTestUrl(null);
    micTestChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) micTestChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        clearInterval(micTestIntervalRef.current);
        stream.getTracks().forEach(track => track.stop()); // Explicitly release track
        const blob = new Blob(micTestChunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) {
          setMicTestError('No audio detected. Please check your microphone and try again.');
          setMicTestState('error');
        } else {
          setMicTestUrl(URL.createObjectURL(blob));
          setMicTestState('recorded');
        }
      };
      micTestRecorderRef.current = recorder;
      recorder.start();
      setMicTestState('recording');
      setMicTestTimer(0);
      micTestIntervalRef.current = setInterval(() => {
        setMicTestTimer(prev => prev + 1);
      }, 1000);
    } catch (e) {
      setMicTestError('⚠ Microphone permission denied or unavailable');
      setMicTestState('error');
    }
  };

  const stopMicTest = () => {
    if (micTestRecorderRef.current && micTestRecorderRef.current.state === 'recording') {
      micTestRecorderRef.current.stop();
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedPhoto(dataUrl);
      playTestSound(); // Play camera shutter sound simulator
    }
  };

  // Load Indian English voice on mount
  useEffect(() => {
    const updateVoice = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => 
          v.lang === 'en-IN' || 
          v.lang === 'en_IN' ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('indian')
        );
        if (voice) {
          setIndianVoice(voice);
        }
      }
    };
    
    updateVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }
  }, []);

  // Web Speech API for voice-to-text transcription
  useEffect(() => {
    const isMcq = roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0;

    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // If browser does not support Web Speech API, mark as unsupported and exit
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    // Only start recognition when the candidate is expected to answer verbally
    if (speakingState !== 'listening' || isMcq) {
      // Stop any running recognition when we leave listening state
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      isListeningRef.current = false;
      return;
    }

    // === We are in listening state and it's a descriptive (voice) question ===
    setIsSpeechSupported(true);

    // Always reset transcript buffers at the start of every new listening phase (new question)
    setCurrentTranscript('');
    currentTranscriptRef.current = '';
    finalTranscriptRef.current = '';

    // Create fresh recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      const fullTranscript = (finalTranscriptRef.current + interimTranscript).trim();
      setCurrentTranscript(fullTranscript);
      currentTranscriptRef.current = fullTranscript;
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        // Permanent failure — browser/OS blocking mic
        setIsSpeechSupported(false);
        isListeningRef.current = false;
      }
      // For 'no-speech', 'aborted', 'network' etc — onend will fire and we'll restart
    };

    // KEY FIX: onend reads from isListeningRef (always current) not captured closure variable
    recognition.onend = () => {
      if (isListeningRef.current) {
        // Still in listening phase — restart immediately
        try {
          recognition.start();
        } catch (e) {
          // If start fails (e.g., already started), wait briefly and retry
          setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch (_) {}
            }
          }, 200);
        }
      }
    };

    recognitionRef.current = recognition;

    // Start recognition
    try {
      recognition.start();
      console.log('[SpeechRecognition] Started for question', currentQuestionIdx);
    } catch (e) {
      console.error('[SpeechRecognition] Failed to start:', e);
      setIsSpeechSupported(false);
    }

    // Cleanup: stop recognition when effect re-runs (question changes, state changes, etc.)
    return () => {
      isListeningRef.current = false;
      recognition.onend = null;   // Prevent auto-restart after cleanup
      recognition.onerror = null;
      recognition.onresult = null;
      try { recognition.stop(); } catch (e) {}
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [speakingState, currentRoundIdx, currentQuestionIdx, roundsList]);


  // --- INTERVAL TIMERS ---
  useEffect(() => {
    clearInterval(timerIntervalRef.current);

    if (isSavingQuestion) {
      return; // Pause timers during question save transition
    }

    if (screen === 3) {
      // OTP Timer
      timerIntervalRef.current = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (screen === 75) {
      timerIntervalRef.current = setInterval(() => {
        setExamStartTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimeout(() => proceedToRound(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (screen === 8) {
      // AI Interview Timers
      const currentLimit = getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx);
      if (speakingState === 'asking') {
        if (isAudioPlaying) {
          setQuestionTimer(15);
        } else {
          timerIntervalRef.current = setInterval(() => {
            setQuestionTimer(prev => {
              if (prev <= 1) {
                setSpeakingState('listening');
                setIsAnswering(true);
                setAnswerTimer(currentLimit);
                return 15;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else if (speakingState === 'listening') {
        if (isAudioPlaying) {
          return; // Pause answer timer during replay
        }
        timerIntervalRef.current = setInterval(() => {
          setAnswerTimer(prev => {
            if (prev <= 1) {
              handleSaveAndNextQuestion();
              return currentLimit;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else if (screen === 10) {
      // Case Study Timer
      if (caseStudyStage === 'reading') {
        if (isAudioPlaying) {
          setCaseReadingTimer(maxCaseReadingTime);
        } else {
          timerIntervalRef.current = setInterval(() => {
            setCaseReadingTimer(prev => {
              if (prev <= 1) {
                setCaseStudyStage('answering');
                setCaseAnswerTimer(0);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else if (caseStudyStage === 'answering') {
        timerIntervalRef.current = setInterval(() => {
          setCaseAnswerTimer(prev => prev + 1);
        }, 1000);
      }
    } else if (screen === 11) {
      // MCQ Timer
      timerIntervalRef.current = setInterval(() => {
        setMcqTimer(prev => {
          if (prev <= 1) {
            setScreen(12);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [screen, speakingState, caseStudyStage, isSavingQuestion, isAudioPlaying]);


  // TRIGGER ACTIONS WHEN TIMERS REACH 0
  useEffect(() => {
    if (screen === 11 && mcqTimer === 0) {
      if (currentRoundIdx < roundsList.length - 1) {
        setScreen(9);
      } else {
        handleFinalSubmission();
      }
    }
  }, [mcqTimer, screen, currentRoundIdx, roundsList.length]);

  useEffect(() => {
    if (screen === 8 && speakingState === 'listening' && answerTimer === 0) {
      handleSaveAndNextQuestion();
    }
  }, [answerTimer, screen, speakingState]);


  useEffect(() => {
    if (screen === 10 && caseStudyStage === 'answering' && caseAnswerTimer > 0) {
      const currentLimit = getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx);
      if (caseAnswerTimer >= currentLimit) {
        handleFinishCaseAnswer();
      }
    }
  }, [caseAnswerTimer, screen, caseStudyStage, currentRoundIdx, currentQuestionIdx]);

  // --- SPEECH SYNTHESIS QUESTION AUDIO ---
  useEffect(() => {
    if (screen === 8) {
      const activeQuestionText = roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.text;
      if (activeQuestionText) {
        // Stop any ongoing speech synthesis first
        if (activeUtteranceRef.current) {
          activeUtteranceRef.current.onend = null;
          activeUtteranceRef.current.onerror = null;
        }
        window.speechSynthesis.cancel();

        setIsAudioPlaying(true);
        setQuestionTimer(15);
        
        const utterance = new SpeechSynthesisUtterance(activeQuestionText);
        activeUtteranceRef.current = utterance;
        if (indianVoice) {
          utterance.voice = indianVoice;
        }
        
        utterance.onend = () => {
          if (activeUtteranceRef.current === utterance) {
            setIsAudioPlaying(false);
          }
        };
        utterance.onerror = () => {
          if (activeUtteranceRef.current === utterance) {
            setIsAudioPlaying(false);
          }
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } else if (screen === 10 && caseStudyStage === 'reading') {
      const activeCase = getActiveCaseStudyData();
      const activeQuestionText = `Case Study Scenario: ${activeCase.scenario} Specific Assigned Task: ${activeCase.task}`;
      if (activeQuestionText) {
        if (activeUtteranceRef.current) {
          activeUtteranceRef.current.onend = null;
          activeUtteranceRef.current.onerror = null;
        }
        window.speechSynthesis.cancel();

        setIsAudioPlaying(true);
        setCaseReadingTimer(maxCaseReadingTime);
        
        const utterance = new SpeechSynthesisUtterance(activeQuestionText);
        activeUtteranceRef.current = utterance;
        if (indianVoice) {
          utterance.voice = indianVoice;
        }
        
        utterance.onend = () => {
          if (activeUtteranceRef.current === utterance) {
            setIsAudioPlaying(false);
          }
        };
        utterance.onerror = () => {
          if (activeUtteranceRef.current === utterance) {
            setIsAudioPlaying(false);
          }
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Cancel speech synthesis if leaving the screen or starting case study answer
      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
    }

    return () => {
      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
    };
  }, [screen, currentQuestionIdx, currentRoundIdx, caseStudyStage, indianVoice]);

  useEffect(() => {
    if (screen === 5) {
      const checkLatency = async () => {
        setNetworkStatus('Measuring Connection...');
        const startTime = Date.now();
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          await fetch(`${origin}/index.html?t=${Date.now()}`, { 
            cache: 'no-store', 
            method: 'HEAD' 
          });
          const duration = Date.now() - startTime;
          setLatency(duration);
          if (duration < 100) {
            setNetworkStatus(`Stable Connection (${duration}ms Latency)`);
          } else if (duration < 250) {
            setNetworkStatus(`Moderate Connection (${duration}ms Latency)`);
          } else {
            setNetworkStatus(`Weak Connection (${duration}ms Latency)`);
          }
        } catch (e) {
          const randomLatency = Math.floor(Math.random() * 40) + 30; // 30-70ms
          setLatency(randomLatency);
          setNetworkStatus(`Stable Connection (${randomLatency}ms Latency)`);
        }
      };
      checkLatency();
    }
  }, [screen]);

  useEffect(() => {
    let camStatus = null;
    let micStatus = null;

    if (screen === 5 && typeof navigator !== 'undefined' && navigator.permissions) {
      const monitorPermissions = async () => {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' });
          const microphonePermission = await navigator.permissions.query({ name: 'microphone' });

          const checkAndRetryObj = () => {
            if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
              setHasCameraPermission(null);
              setHasMicPermission(null);
              stopCamera();
              setTimeout(() => {
                startCamera();
              }, 50);
            }
          };

          cameraPermission.onchange = checkAndRetryObj;
          microphonePermission.onchange = checkAndRetryObj;

          camStatus = cameraPermission;
          micStatus = microphonePermission;
        } catch (e) {
          console.warn("Permissions API not fully supported:", e);
        }
      };
      monitorPermissions();
    }

    return () => {
      if (camStatus) camStatus.onchange = null;
      if (micStatus) micStatus.onchange = null;
    };
  }, [screen]);

  const lastAlertTimeRef = useRef({});


  // Start/stop video recording based on screen
  useEffect(() => {
    if (screen === 8 && cameraStream) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;
      recordedChunksRef.current = [];
      try {
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        const recorder = new MediaRecorder(cameraStream, options);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.start(1000); // chunk every second
        mediaRecorderRef.current = recorder;
        console.log("MediaRecorder started");
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
      }
    } else if ((screen === 10 || screen === 11) && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder stopped");
      // Upload the video file when stopped
      mediaRecorderRef.current.onstop = async () => {
        if (recordedChunksRef.current.length === 0) return;
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('video', blob, 'interview_recording.webm');
        
        try {
          if (candidateData && candidateData.id) {
            console.log("Uploading video to Google Drive via backend...");
            const res = await mockClient.post(`/api/candidates/${candidateData.id}/upload-video/`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log("Video uploaded successfully", res.data);
          }
        } catch(e) {
          console.error("Failed to upload video:", e);
        }
      };
    }
  }, [screen, cameraStream, candidateData]);

  // Load integrity screenshots from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hl_integrity_alerts');
      if (stored) {
        setIntegrityScreenshots(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading integrity alerts from localStorage", e);
    }
  }, []);

  const captureIntegrityScreenshot = (typeLabel) => {
    const now = Date.now();
    const lastTime = lastAlertTimeRef.current[typeLabel] || 0;
    if (now - lastTime < 8000) {
      return; // Rate limit: 8 seconds throttle
    }
    lastAlertTimeRef.current[typeLabel] = now;

    const video = hiddenVideoRef.current || videoRef.current;
    if (video && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        
        const newAlert = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: typeLabel,
          screenshot: dataUrl
        };
        
        const stored = localStorage.getItem('hl_integrity_alerts') 
          ? JSON.parse(localStorage.getItem('hl_integrity_alerts')) 
          : [];
        stored.push(newAlert);
        localStorage.setItem('hl_integrity_alerts', JSON.stringify(stored));
        
        setIntegrityScreenshots(prev => [...prev, newAlert]);
        console.log(`[Proctoring] Screenshot saved to LocalStorage: ${typeLabel}`);
      } catch (err) {
        console.error("Error capturing proctoring screenshot:", err);
      }
    }
  };

  // Proctored Integrity Systems (Real Face Detection & Tab Switch Listeners)
  
  // 1. Dynamic BlazeFace model loader
  useEffect(() => {
    let active = true;
    const loadModel = async () => {
      if (window.blazeface) {
        try {
          console.log("[FaceAPI] Loading BlazeFace model...");
          faceModelRef.current = await window.blazeface.load();
          console.log("[FaceAPI] BlazeFace model loaded successfully!");
        } catch (err) {
          console.error("[FaceAPI] Error loading BlazeFace model:", err);
        }
      } else {
        // Retry loading if scripts are not resolved yet
        setTimeout(() => {
          if (active) loadModel();
        }, 1000);
      }
    };
    loadModel();
    return () => { active = false; };
  }, []);

  // 2. Real-time client-side face detection loop (Webcam feed analyser)
  useEffect(() => {
    let detectionInterval = null;

    // Checks the active webcam feed every 1.5 seconds if camera is active
    if ((screen === 8 || screen === 10 || screen === 11) && hasCameraPermission) {
      detectionInterval = setInterval(async () => {
        const video = hiddenVideoRef.current || videoRef.current;
        if (faceModelRef.current && video) {
          try {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              const predictions = await faceModelRef.current.estimateFaces(video, false);
              
              // If more than 1 face is in the camera frame, throw warning toast!
              if (predictions.length > 1) {
                  triggerToast({
                    bold: "Multiple persons detected.",
                    normal: "Please ensure only one person is in front of the camera."
                  }, true);
                  captureIntegrityScreenshot("Multiple Persons Detected");
                } else if (predictions.length === 0) {
                  triggerToast({
                    bold: "No face detected.",
                    normal: "Please ensure your face is clearly visible in the camera feed."
                  }, true);
                  captureIntegrityScreenshot("No Face Detected");
                }
            }
          } catch (err) {
            console.error("[FaceAPI] Detection error:", err);
          }
        }
      }, 1500);
    }

    return () => {
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [screen, hasCameraPermission]);

  // 3. Proctored Integrity Simulations & Listeners (Tab Switch & Keypress Fallbacks)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (screen === 8 || screen === 10 || screen === 11) {
          setTabSwitches(prev => prev + 1);
          triggerToast({
            bold: "Tab switch noted.",
            normal: "Focus changes during the interview are recorded on your session report."
          }, true);
          captureIntegrityScreenshot("Tab Switch / Focus Lost");
        }
      }
    };

    const handleKeyDown = (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      const key = e.key.toLowerCase();
      if (screen === 8 || screen === 10 || screen === 11) {
        if (key === 't') {
          setTabSwitches(prev => prev + 1);
          triggerToast({
            bold: "Tab switch noted.",
            normal: "Focus changes during the interview are recorded on your session report."
          }, true);
          captureIntegrityScreenshot("Tab Switch (Manual Sim)");
        } else if (key === 'p') {
          // Fallback keypress trigger for multiple persons warning
          triggerToast({
            bold: "Multiple persons detected.",
            normal: "Please ensure only one person is in front of the camera."
          }, true);
          captureIntegrityScreenshot("Multiple Persons Detected (Manual Sim)");
        }
      }
    };

    const handlePaste = () => {
      if (screen === 8 || screen === 10 || screen === 11) {
        setPasteEvents(prev => prev + 1);
        triggerToast({
          bold: "Copy-paste warning.",
          normal: "Copy-paste operations are flagged during the assessment."
        }, true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [screen]);

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // OTP Verification Action
  const handleOtpChange = (val, index) => {
    if (isNaN(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Autofocus next
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleStartSession = async (candidateId) => {
    try {
      const response = await mockClient.post(`/api/candidates/${candidateId}/start_session/`);
      console.log("Interview session initialized on database:", response.data);
    } catch (err) {
      console.warn("Failed to initialize session:", err);
    }
  };

  const handleUpdateSession = async (roundIdx, qIdx) => {
    if (!candidateData) return;
    try {
      const progressPercent = Math.min(
        Math.round(((roundIdx * 10 + qIdx) / (roundsList.length * 10)) * 100),
        99
      );
      await mockClient.patch(`/api/candidates/${candidateData.id}/update_session/`, {
        current_round: roundIdx,
        current_question: qIdx,
        progress: progressPercent
      });
    } catch (err) {
      console.warn("Failed to update session progress:", err);
    }
  };

  // Session Restore / Autosave
  useEffect(() => {
    if (candidateData && candidateData.id && screen >= 6 && screen !== 14) {
      const sessionKey = `hl_session_${candidateData.id}`;
      const stateToSave = {
        screen,
        currentRoundIdx,
        currentQuestionIdx,
        answersList,
        mcqAnswers,
        mcqTimer,
        caseAnswerTimer,
        tabSwitches,
        pasteEvents,
        replayUsed,
      };
      localStorage.setItem(sessionKey, JSON.stringify(stateToSave));
    }
  }, [screen, currentRoundIdx, currentQuestionIdx, answersList, mcqAnswers,
        mcqTimer, caseAnswerTimer, tabSwitches, pasteEvents, replayUsed, candidateData]);

  const handleFinalSubmission = async () => {
    if (!candidateData) return;
    setIsSubmitting(true);
    try {
      let integrityAlerts = [];
      try {
        const stored = localStorage.getItem('hl_integrity_alerts');
        if (stored) {
          integrityAlerts = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Failed to read integrity alerts", e);
      }
      await mockClient.post(`/api/candidates/${candidateData.id}/submit_interview/`, {
        answers: answersList,
        mcq_answers: mcqAnswers,
        proctoring: {
          tab_switches: tabSwitches,
          paste_events: pasteEvents,
          replay_used: replayUsed
        },
        integrity_alerts: integrityAlerts
      });
      
      // Clear session on submit
        if (candidateData) {
            localStorage.removeItem(`hl_session_${candidateData.id}`);
        }
        // Calculate and format dynamic submission timestamp
      const date = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      const offset = date.getTimezoneOffset();
      const sign = offset > 0 ? '-' : '+';
      const absOffset = Math.abs(offset);
      const offsetHours = pad(Math.floor(absOffset / 60));
      const offsetMins = pad(absOffset % 60);
      const formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC${sign}${offsetHours}:${offsetMins}`;
      
      setSubmissionTimestamp(formattedTime);
      triggerToast({ bold: "Interview Submitted:", normal: "Your responses and proctoring logs have been saved successfully." });
      setScreen(12);
    } catch (err) {
      console.error("Failed to submit interview:", err);
      triggerToast({ bold: "Submission Failed:", normal: err.message || "Unable to save responses." }, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateLogin = async (e) => {
    if (e) e.preventDefault();
    if (!candLoginEmail || !candRefCode) {
      triggerToast({ bold: "Input Required:", normal: "Please enter both Email and Student ID." }, true);
      return;
    }
    setIsLoggingIn(true);
    try {
      const response = await mockClient.post('/api/candidates/login/', {
        student_id: candRefCode.trim(),
        email: candLoginEmail.trim()
      });
      const data = response.data;
      
      setCandidateData(data.candidate);
      setOpeningData(data.opening);
      setFlowRounds(data.flow?.rounds || []);
      
      // Auto-populate About You fields from DB
      setCandidateId(data.candidate?.candidate_id || '');
      setCandLoginEmail(data.candidate?.email || '');
      setPhone(data.candidate?.phone_no || '');
      setQualification(data.candidate?.highest_qualification || '');
      setExperience(data.candidate?.relevant_experience || data.opening?.experience || '');
      setNoticePeriod(data.candidate?.notice_period || '');
      setExpectedCtc(data.candidate?.expected_ctc || data.opening?.salary || '');
      setLinkedin(data.candidate?.linkedin_profile || '');
      setExpiresAt(data.expires_at || '');
      
      // Dynamic rounds list update
      if (data.flow?.rounds && data.flow.rounds.length > 0) {
        const mappedRounds = data.flow.rounds.map(r => ({
          id: r.type,
          name: r.name || (r.type === 'hr' ? 'HR Conversation' : r.type === 'tech' ? 'Technical Q&A' : r.type === 'case' ? 'Case Study' : r.type === 'mcq' ? 'Knowledge Test (MCQ)' : r.type.toUpperCase()),
          duration: `${r.dur} mins`,
          questions: r.questions && r.questions.length > 0
            ? r.questions.map((q, qidx) => ({
                id: q.id || qidx + 1,
                text: q.question || q.question_text || q.text || "",
                timeLimit: q.timeLimit || 2,
                options: q.options || [],
                answer: q.answer || "",
                mcqs: q.mcqs || []
              }))
            : (r.type === 'hr' ? [
                { id: 1, text: "Tell me about yourself and what draws you to audit and taxation." },
                { id: 2, text: "Describe a deadline you nearly missed. What did you learn and change afterwards?" }
              ] : [
                { id: 3, text: "Explain the key differences between a tax audit u/s 44AB and a statutory audit under the Companies Act." },
                { id: 4, text: "A client repairs a machine for ₹3 lakh. Capitalise or expense — how do you decide?" }
              ])
        }));
        setRoundsList(mappedRounds);
      }
      
      if (data.session && data.session.status === 'In Progress') {
        setCurrentRoundIdx(data.session.current_round || 0);
        setCurrentQuestionIdx(data.session.current_question || 0);
        setScreen(7);
        triggerToast({ bold: "Session Restored:", normal: `Resuming your interview at Round ${data.session.current_round + 1}.` });
      } else {
        setScreen(2);
        triggerToast({ bold: "Access Granted:", normal: `Welcome, ${data.candidate.name}!` });
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('expired')) {
        setExpiredMessage(err.message);
        setShowExpiredModal(true);
      } else {
        triggerToast({ bold: "Access Denied:", normal: err.message || "Invalid Student ID or Email ID." }, true);
      }
    }
  };

  const handleUpdateCandidateDetails = async () => {
    if (candidateData) {
      try {
        await mockClient.patch(`/api/candidates/${candidateData.id}/`, {
          phone_no: phone,
          highest_qualification: qualification,
          relevant_experience: experience,
          notice_period: noticePeriod,
          expected_ctc: expectedCtc,
          linkedin_profile: linkedin
        });
        triggerToast({ bold: "Details Saved:", normal: "Your profile information has been updated successfully." });
      } catch (err) {
        console.warn("Failed to sync details with backend:", err);
      }
    }
    setScreen(7);
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length === 6) {
      setOtpVerified(true);
      setScreen(4); // Consent Screen
    } else {
      triggerToast({ bold: "Invalid Code:", normal: "Please enter the complete 6-digit verification code." }, true);
    }
  };

  const handleAutoFillOtp = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    setTimeout(() => {
      setOtpVerified(true);
      setScreen(4);
    }, 400);
  };

  // Live Transcription Recording
  useEffect(() => {
    const inAudioPhase = (screen === 8 && speakingState === 'listening') || (screen === 10 && caseStudyStage === 'answering');
    const isMcq = roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0;

    if (inAudioPhase && !isMcq && cameraStream) {
      if (!audioRecorderRef.current || audioRecorderRef.current.state === 'inactive') {
        audioChunksRef.current = [];
        const audioTracks = cameraStream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const recorder = new MediaRecorder(new MediaStream(audioTracks), { mimeType: 'audio/webm' });
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            audioRecorderRef.current = recorder;
            recorder.start(2000); // chunk every 2s

            liveTranscribeIntervalRef.current = setInterval(() => {
               if (audioChunksRef.current.length > 0) {
                  const currentBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const formData = new FormData();
                  formData.append('audio', currentBlob);
                  mockClient.post('/api/candidates/transcribe/', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                  }).then(res => {
                      if (res.data && res.data.transcript !== undefined) {
                          setCurrentTranscript(res.data.transcript);
                          currentTranscriptRef.current = res.data.transcript;
                      }
                  }).catch(console.error);
               }
            }, 4000); // transribe every 4 seconds
          } catch(e) {
            console.error("Failed to start audio recorder", e);
          }
        }
      }
    } else {
      if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      clearInterval(liveTranscribeIntervalRef.current);
    }

    return () => clearInterval(liveTranscribeIntervalRef.current);
  }, [screen, speakingState, caseStudyStage, cameraStream, currentRoundIdx, currentQuestionIdx]);


  const handleClearResponse = () => {
    if (!window.confirm("Are you sure you want to clear your current response and start over?")) return;
    
    setCurrentTranscript('');
    currentTranscriptRef.current = '';
    
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
      audioRecorderRef.current.stop();
      audioChunksRef.current = [];
      try {
        const audioTracks = cameraStream.getAudioTracks();
        const recorder = new MediaRecorder(new MediaStream(audioTracks), { mimeType: 'audio/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        audioRecorderRef.current = recorder;
        recorder.start(2000);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Save Interview Question
  const handleSaveAndNextQuestion = async () => {
    if (isSavingQuestion || isTranscribing) return; // Prevent double-clicks
    
    let finalTranscript = currentTranscriptRef.current;
    
    // Stop recorder and transcribe if recording
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        setIsTranscribing(true);
        const stopPromise = new Promise(resolve => {
            audioRecorderRef.current.onstop = resolve;
            audioRecorderRef.current.stop();
        });
        await stopPromise;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
            const formData = new FormData();
            formData.append('audio', audioBlob);
            try {
                const res = await mockClient.post('/api/candidates/transcribe/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.transcript !== undefined) {
                    finalTranscript = res.data.transcript;
                    setCurrentTranscript(finalTranscript);
                    currentTranscriptRef.current = finalTranscript;
                }
            } catch (err) {
                console.error("Transcription failed", err);
            }
        }
        setIsTranscribing(false);
    }
    
    setIsSavingQuestion(true);
    const round = roundsList[currentRoundIdx];
    const question = round.questions[currentQuestionIdx];
    const currentLimit = getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx);
    
    // Determine if this is a live-interview MCQ question (has options in live round)
    const isLiveRoundMcq = (question.options && question.options.length > 0);
    
    let capturedAnswer = '';
    if (isLiveRoundMcq) {
      // For MCQ questions, get the selected option text from mcqAnswers
      const qKey = `q${question.id}`;
      const selectedIdx = mcqAnswers[qKey];
      if (selectedIdx !== undefined && selectedIdx !== null) {
        const opts = question.options || [];
        const optVal = opts[selectedIdx];
        capturedAnswer = typeof optVal === 'object' ? (optVal.text || String(optVal)) : String(optVal || '');
      } else {
        capturedAnswer = ''; // No option selected
      }
    } else {
      // For voice/descriptive questions, use the speech transcript
      capturedAnswer = finalTranscript.trim() || '';
    }

    // Save response to local map
    setAnswersList(prev => ({
      ...prev,
      [`q-${question.id}`]: {
        round: round.name,
        question: question.text,
        timeTaken: currentLimit - answerTimer,
        videoCaptured: true,
        answer: capturedAnswer
      }
    }));
    setCurrentTranscript('');
    currentTranscriptRef.current = '';
    finalTranscriptRef.current = '';

    setIsSavingQuestion(false);

    {
      if (currentQuestionIdx < round.questions.length - 1) {
        // Go to next question in same round
        const nextLimit = getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx + 1);
        setCurrentQuestionIdx(prev => prev + 1);
        setSpeakingState('asking');
        setQuestionTimer(15);
        setAnswerTimer(nextLimit);
        setIsAnswering(false);
        setIsAudioPlaying(true);
        handleUpdateSession(currentRoundIdx, currentQuestionIdx + 1);
      } else {
        // Current round complete
        setScreen(9);
      }
    }
  };

  const handleBeginRound = async () => {
    if (currentRoundIdx === 0) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request failed', e);
      }
      setScreen(75);
      setExamStartTimer(5);
      handleStartSession(candidateData.id);
    } else {
      proceedToRound();
    }
  };

  const proceedToRound = () => {
    const currentRound = roundsList[currentRoundIdx];
    if (currentRound && (currentRound.id === 'case' || currentRound.type === 'case')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 5), 0) || 5;
      const totalSeconds = totalMinutes * 60;
      const readSeconds = Math.min(Math.max(Math.floor(totalSeconds / 3), 45), 180);
      
      setCaseStudyStage('reading');
      setCaseReadingTimer(readSeconds);
      setMaxCaseReadingTime(readSeconds);
      setIsAudioPlaying(true);
      setScreen(10);
    } else if (currentRound && (currentRound.id === 'mcq' || currentRound.type === 'mcq')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 8), 0) || 8;
      setMcqTimer(totalMinutes * 60);
      setScreen(11);
    } else {
      setScreen(8);
      setSpeakingState('asking');
      setQuestionTimer(15);
      setAnswerTimer(getQuestionTimeLimitSeconds(currentRoundIdx, 0));
      setIsAnswering(false);
      setIsAudioPlaying(true);
    }
  };

  const handleContinueNextRound = () => {
    if (currentRoundIdx < roundsList.length - 1) {
      // Go to next round
      setCurrentRoundIdx(prev => prev + 1);
      setCurrentQuestionIdx(0);
      setSpeakingState('asking');
      setQuestionTimer(15);
      setAnswerTimer(getQuestionTimeLimitSeconds(currentRoundIdx + 1, 0));
      setIsAnswering(false);
      setScreen(7); // Show instructions before starting next round
      handleUpdateSession(currentRoundIdx + 1, 0);
    } else {
      // All rounds complete -> Submit E2E assessment to database
      handleFinalSubmission();
    }
  };

  const handleFinishCaseAnswer = async () => {
    if (isSavingQuestion || isTranscribing) return; // Prevent double clicks
    
    let finalTranscript = currentTranscriptRef.current;
    
    // Stop recorder and transcribe if recording
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        setIsTranscribing(true);
        const stopPromise = new Promise(resolve => {
            audioRecorderRef.current.onstop = resolve;
            audioRecorderRef.current.stop();
        });
        await stopPromise;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
            const formData = new FormData();
            formData.append('audio', audioBlob);
            try {
                const res = await mockClient.post('/api/candidates/transcribe/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.transcript !== undefined) {
                    finalTranscript = res.data.transcript;
                    setCurrentTranscript(finalTranscript);
                    currentTranscriptRef.current = finalTranscript;
                }
            } catch (err) {
                console.error("Transcription failed", err);
            }
        }
        setIsTranscribing(false);
    }
    
    setIsSavingQuestion(true);
    const round = roundsList[currentRoundIdx];
    const question = round.questions[currentQuestionIdx];
    const currentLimit = getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx);

    // Save response to local map (simulating answer upload)
    setAnswersList(prev => ({
      ...prev,
      [`q-${question.id}`]: {
        round: round.name,
        question: question.text,
        timeTaken: currentLimit - caseAnswerTimer,
        videoCaptured: true,
        answer: finalTranscript.trim() || ''
      }
    }));
    setCurrentTranscript(''); currentTranscriptRef.current = '';

    if (round && currentQuestionIdx < round.questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1;
      const nextLimit = getQuestionTimeLimitSeconds(currentRoundIdx, nextIdx);
      const readSeconds = Math.min(Math.max(Math.floor(nextLimit / 3), 45), 180);
      
      setCurrentQuestionIdx(nextIdx);
      setCaseStudyStage('reading');
      setCaseReadingTimer(readSeconds);
      setMaxCaseReadingTime(readSeconds);
      setIsAudioPlaying(true);
    } else {
      setCaseStudyStage('done');
      setScreen(9);
    }
    setIsSavingQuestion(false);
  };

  // --- PROGRAMMATICAL PATH SWITCH BACK TO DEVELOPER WORKSPACE ---
  const switchToEmployer = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pathnamechange'));
  };

  const handleClosePortal = () => {
    localStorage.removeItem('hl_integrity_alerts');
    window.close();
    // Fallback if window.close() is blocked by browser security
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 100);
  };

  // Sidebar Steps Data
  

  return (
    <div className={`cand-app ${isDarkMode ? 'dark-stage' : 'light-mist'}`}>
      <style>{`
        /* --- SCOPED STYLES FOR CANDIDATE FLOW --- */
        .cand-app {
          display: flex;
          min-height: 100vh;
          font-family: var(--font-b);
          transition: background-color 0.4s ease, color 0.4s ease;
          width: 100%;
        }
        .cand-app.light-mist {
          background-color: var(--mist);
          color: var(--ink);
        }
        .cand-app.dark-stage {
          background-color: var(--deep);
          color: #EDF4F0;
        }

        /* --- LEFT SIDEBAR RAIL --- */
        .cand-rail {
          width: 270px;
          flex-shrink: 0;
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 32px 24px;
          transition: border-color 0.4s ease, background 0.4s ease;
        }
        .light-mist .cand-rail {
            background-color: var(--petrol-2);
            border-color: var(--petrol);
            color: #EDF4F0;
          }
        .dark-stage .cand-rail {
            background: var(--petrol-2);
            border-color: rgba(255, 255, 255, 0.08);
            color: #EDF4F0;
          }
        .cand-rail .wordmark {
          display: flex;
          align-items: center;
          gap: 11px;
          font-family: var(--font-d);
          font-weight: 650;
          font-size: 19px;
          letter-spacing: -0.01em;
          margin-bottom: 40px;
        }
        .light-mist .cand-rail .wordmark { color: #EDF4F0; }
        .dark-stage .cand-rail .wordmark { color: #EDF4F0; }
        
        .lens-logo {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2.5px solid var(--amber);
          position: relative;
          flex-shrink: 0;
        }
        .lens-logo::after {
          content: "";
          position: absolute;
          inset: 5px;
          border-radius: 50%;
          background: var(--amber);
        }

        /* Company Branding */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }
        .sidebar-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: var(--petrol);
          color: #FFF;
          font-family: var(--font-d);
          font-weight: 700;
          font-size: 18px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .sidebar-logo.dark {
          background-color: var(--deep-2);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
        }
        .sidebar-info {
          display: flex;
          flex-direction: column;
        }
        .sidebar-title {
            font-weight: 700;
            font-size: 14.5px;
            line-height: 1.25;
            letter-spacing: -0.015em;
            color: #EDF4F0;
          }
        .dark-stage .sidebar-title {
          color: #EDF4F0;
        }
        .sidebar-subtitle {
            font-size: 11px;
            color: #7E978E;
            margin-top: 2px;
            font-weight: 500;
          }
        .dark-stage .sidebar-subtitle {
          color: #7E978E;
        }

        /* Step Tracker */
        .step-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }
        .step-item {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 14px;
            font-weight: 500;
            color: #7E978E;
            transition: all 0.3s;
          }
        .dark-stage .step-item {
          color: #7E978E;
        }
        .step-num {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-b);
            font-size: 12.5px;
            font-weight: 700;
            border: 1.5px solid rgba(255, 255, 255, 0.15);
            transition: all 0.3s;
            color: #7E978E;
            background-color: transparent;
          }
        .dark-stage .step-num {
          border-color: rgba(255, 255, 255, 0.15);
          color: #7E978E;
        }

        /* Active State */
        .step-item.active {
            color: var(--amber);
            font-weight: 700;
          }
        .dark-stage .step-item.active {
          color: var(--amber);
        }
        .step-item.active .step-num {
            border-color: var(--amber);
            background-color: var(--amber);
            color: var(--deep);
            box-shadow: 0 0 0 4px rgba(221, 160, 50, 0.25);
          }
        .dark-stage .step-item.active .step-num {
          border-color: var(--amber);
          background-color: var(--amber);
          color: var(--deep);
          box-shadow: 0 0 0 4px rgba(221, 160, 50, 0.25);
        }

        /* Done State */
        .step-item.done {
            color: #A9C0B8;
          }
        .dark-stage .step-item.done {
          color: #A9C0B8;
        }
        .step-item.done .step-num {
            border-color: var(--ok);
            background-color: rgba(46, 125, 91, 0.2);
            color: var(--ok);
          }
        .dark-stage .step-item.done .step-num {
          border-color: var(--ok);
          background-color: rgba(46, 125, 91, 0.2);
          color: var(--ok);
        }

        .cand-footer {
          margin-top: auto;
          font-size: 11px;
          color: var(--faint);
          font-family: var(--font-m);
          letter-spacing: 0.05em;
        }

        /* --- CONTENT MAIN CONTAINER --- */
        .cand-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        
        .cand-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid var(--line);
          transition: border-color 0.4s ease;
        }
        .light-mist .cand-topbar {
          background-color: var(--card);
          border-color: var(--line);
        }
        .dark-stage .cand-topbar {
          background-color: var(--deep-2);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .emp-name {
          font-family: var(--font-d);
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.01em;
        }
        
        .meta-pill {
          font-family: var(--font-m);
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 99px;
          background-color: var(--line-soft);
          color: var(--muted);
        }
        .dark-stage .meta-pill {
          background-color: rgba(255, 255, 255, 0.06);
          color: #A9C0B8;
        }

        .cand-view {
          flex: 1;
          padding: 40px;
          max-width: 960px;
          width: 100%;
          margin: 0 auto;
          animation: rise 0.4s cubic-bezier(0.22, 0.9, 0.3, 1);
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }

        /* --- CARDS & GENERAL UI --- */
        .c-card {
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 1px 2px rgba(14,33,29,.05), 0 10px 30px -12px rgba(14,33,29,.14);
          margin-bottom: 24px;
        }
        .light-mist .c-card {
          background-color: var(--card);
          border: 1px solid var(--line);
        }
        .dark-stage .c-card {
          background-color: var(--deep-2);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .c-hero h2 {
          font-size: clamp(24px, 3.5vw, 32px);
          font-weight: 700;
          letter-spacing: -0.015em;
          margin-bottom: 8px;
        }

        .sub-tagline {
          font-size: 15px;
          color: var(--muted);
          margin-bottom: 30px;
        }
        .dark-stage .sub-tagline {
          color: #A9C0B8;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .c-input-group {
          margin-bottom: 16px;
        }
        .c-input-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--muted);
        }
        .dark-stage .c-input-group label {
          color: #A9C0B8;
        }
        
        .c-field-read {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--mist);
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: var(--muted);
          cursor: not-allowed;
          user-select: none;
        }
        .dark-stage .c-field-read {
          background-color: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.1);
          color: #7E978E;
        }

        .c-input {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          background-color: #fff;
          color: var(--ink);
          font-family: inherit;
          transition: all 0.2s;
        }
        .dark-stage .c-input {
          background-color: var(--deep);
          border-color: rgba(255,255,255,0.12);
          color: #EDF4F0;
        }
        .c-input:focus {
          border-color: var(--amber);
          outline: none;
          box-shadow: 0 0 0 3px rgba(221,160,50,.14);
        }

        /* --- SCREEN 2: INSTRUCTIONS STYLING --- */
        .process-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 24px;
        }
        .p-step-card {
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background-color: var(--card);
        }
        .p-step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--amber-soft);
          color: var(--amber-deep);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: var(--font-m);
          margin-bottom: 12px;
        }

        /* --- SCREEN 3: AI INTERVIEW STAGED LAYOUT --- */
        .staged-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
        }
        
        .progress-indicator {
          height: 6px;
          background-color: rgba(255,255,255,0.1);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .progress-indicator .fill {
          height: 100%;
          background-color: var(--amber);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        /* Webcam Check View */
        .camera-container {
          background-color: #000;
          border-radius: 14px;
          aspect-ratio: 4/3;
          position: relative;
          overflow: hidden;
          border: 1.5px solid rgba(255,255,255,0.12);
        }
        .camera-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .camera-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #12302A, #0B1E1A);
          color: #7E978E;
          gap: 12px;
        }
        .pulse-rec {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(0,0,0,0.65);
          padding: 4px 10px;
          border-radius: 99px;
          font-family: var(--font-m);
          font-size: 11px;
          font-weight: 600;
          color: var(--rec);
        }
        .pulse-rec .dot {
          width: 8px;
          height: 8px;
          background-color: var(--rec);
          border-radius: 50%;
          animation: rec-blink 1.2s infinite;
        }
        @keyframes rec-blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        .snapshot-preview {
          position: absolute;
          bottom: 14px;
          right: 14px;
          width: 80px;
          height: 60px;
          border-radius: 6px;
          border: 1.5px solid #fff;
          object-fit: cover;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        /* Mic volume visualizer */
        .vol-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
          width: 100px;
        }
        .vol-bar {
          flex: 1;
          background-color: rgba(255,255,255,0.15);
          border-radius: 2px;
          height: 4px;
          transition: height 0.1s ease;
        }
        .vol-bar.active {
          background-color: var(--ok);
        }

        /* Waveform simulation animation */
        .waveform {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 24px;
        }
        .wave-line {
          width: 3px;
          height: 4px;
          background-color: var(--amber);
          border-radius: 3px;
          animation: wave-bounce 0.8s ease infinite alternate;
        }
        @keyframes wave-bounce {
          from { height: 4px; }
          to { height: 20px; }
        }

        /* --- SCREEN 10: MCQ EXAMINATION --- */
        .mcq-layout {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 24px;
          align-items: start;
        }
        .mcq-opt {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          background-color: var(--card);
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
        }
        .mcq-opt:hover {
          border-color: var(--petrol);
          background-color: var(--mist);
        }
        .mcq-opt.selected {
          border-color: var(--petrol);
          background-color: var(--info-soft);
          font-weight: 600;
        }
        .mcq-opt input {
          accent-color: var(--petrol);
          margin-top: 3px;
        }

        /* Palette Grid */
        .palette-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 14px;
        }
        .palette-btn {
          aspect-ratio: 1;
          border-radius: 8px;
          border: 1.5px solid var(--line);
          background-color: var(--card);
          font-family: var(--font-m);
          font-weight: 600;
          font-size: 13px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .palette-btn.unanswered {
          color: var(--muted);
        }
        .palette-btn.answered {
          background-color: var(--petrol);
          border-color: var(--petrol);
          color: #fff;
        }
        .palette-btn.flagged {
          background-color: var(--amber-soft);
          border-color: var(--amber);
          color: var(--amber-deep);
        }
        .palette-btn.current {
          box-shadow: 0 0 0 3px var(--amber);
        }

        /* --- AI INTERVIEWER ORB GRAPHIC --- */
        .ai-orb-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }
        .ai-orb-outer {
          width: 90px;
          height: 90px;
          position: relative;
          display: grid;
          place-items: center;
        }
        .ai-orb-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2.5px dashed rgba(221, 160, 50, 0.4);
          animation: spin 16s linear infinite;
        }
        .ai-orb-ring.active {
          border-color: rgba(46, 125, 91, 0.6);
          animation: spin 8s linear infinite;
        }
        .ai-orb-inner {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #2E7D5B, #0B1E1A);
          box-shadow: 0 0 20px rgba(46, 125, 91, 0.3), inset 0 0 10px rgba(0,0,0,0.8);
          transition: all 0.3s ease;
        }
        .ai-orb-inner.asking {
          background: radial-gradient(circle at 30% 30%, #DDA032, #0B1E1A);
          box-shadow: 0 0 20px rgba(221, 160, 50, 0.35), inset 0 0 10px rgba(0,0,0,0.8);
          animation: orb-pulse 2s ease infinite alternate;
        }
        .ai-orb-inner.listening {
          background: radial-gradient(circle at 30% 30%, #2E7D5B, #0E211D);
          box-shadow: 0 0 28px rgba(46, 125, 91, 0.65), inset 0 0 10px rgba(0,0,0,0.8);
          animation: orb-pulse-active 1s ease infinite alternate;
        }
        .ai-orb-inner.speaking {
          background: radial-gradient(circle at 30% 30%, #4facfe, #0B1E1A);
          box-shadow: 0 0 28px rgba(79, 172, 254, 0.7), inset 0 0 10px rgba(0,0,0,0.8);
          animation: orb-pulse-speaking 0.8s ease infinite alternate;
        }
        .ai-orb-ring.speaking-active {
          border-color: rgba(79, 172, 254, 0.6);
          animation: spin 4s linear infinite;
        }
        @keyframes orb-pulse-speaking {
          from { transform: scale(1); filter: brightness(1); }
          to { transform: scale(1.12); filter: brightness(1.3); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orb-pulse {
          from { transform: scale(1); filter: brightness(1); }
          to { transform: scale(1.05); filter: brightness(1.15); }
        }
        @keyframes orb-pulse-active {
          from { transform: scale(1); filter: brightness(1); box-shadow: 0 0 15px rgba(46, 125, 91, 0.4); }
          to { transform: scale(1.08); filter: brightness(1.25); box-shadow: 0 0 32px rgba(46, 125, 91, 0.75); }
        }
      `}</style>

      {/* Invisible persistent webcam feed to prevent browser suspension when modal is closed */}
      {hasCameraPermission && (screen === 8 || screen === 10 || screen === 11) && (
        <video
          ref={hiddenVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0.001,
            pointerEvents: 'none',
            top: 0,
            left: 0,
            zIndex: -9999
          }}
        />
      )}

      {/* ================= SCREEN 1: CANDIDATE SIGN IN PAGE (Full overlay similar to employer) ================= */}
      {screen === 1 && (
        <form onSubmit={handleCandidateLogin} className="login" id="loginScreen" style={{ display: 'grid', position: 'fixed', inset: 0, zIndex: 60, fontFamily: 'var(--font-b)' }}>
          <div className="login-brandside" style={{ background: 'radial-gradient(120% 120% at 15% 10%, #155048 0%, #0F3B35 45%, #0B1E1A 100%)' }}>
            <div className="wordmark"><span className="lens-logo"></span>Hirelens AI</div>
            <div className="login-hero">
              <h1>Your camera-first screening interview.</h1>
              <p>Welcome to the Hirelens candidate portal. You will complete a short structured screening interview on camera, scored against criteria approved by the employer. No resume filters, just your actual skills.</p>
              <div className="login-stats">
                <div className="lstat"><b>15 min</b><span>avg duration</span></div>
                <div className="lstat"><b>92%</b><span>completion rate</span></div>
                <div className="lstat"><b>Secure</b><span>data encrypted</span></div>
              </div>
            </div>
            <div className="big-aperture"></div>
          </div>
          <div className="login-formside">
            <div className="login-card">
              <h2>Access your interview session</h2>
              <p className="sub">Kulkarni Mehta &amp; Associates · <span className="mono">kma.hirelens.in</span></p>
              
              <div className="lfield">
                <label>Invitation email</label>
                <input 
                  type="email" 
                  value={candLoginEmail} 
                  onChange={(e) => setCandLoginEmail(e.target.value)} 
                  required 
                  placeholder="e.g. jay.patil@example.com" 
                />
              </div>
              
              <div className="lfield">
                <label>Student ID</label>
                <input 
                  type="text" 
                  value={candRefCode} 
                  onChange={(e) => setCandRefCode(e.target.value)} 
                  required 
                  placeholder="e.g. audit-tax-jay-patil-1234" 
                />
              </div>
              
              <div className="login-row">
                <label style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked required style={{ accentColor: 'var(--petrol)' }} />
                  I agree to the system requirements
                </label>
              </div>
              
              <button type="submit" className="btn primary" style={{ width: '100%' }}>Access interview portal →</button>
              
              <p className="trial" style={{ marginTop: '16px' }}>Are you an employer? <a href="#employer" onClick={(e) => { e.preventDefault(); switchToEmployer(); }}>Sign in to your workspace →</a></p>
              <p className="hintline">Demo: Enter email and Student ID sent in invitation details.</p>
            </div>
          </div>
        </form>
      )}

      {/* --- PERSISTENT LEFT SIDEBAR RAIL --- */}
      <aside className="cand-rail">
        <div className="sidebar-brand">
          <div className={`sidebar-logo ${isDarkMode ? 'dark' : ''}`}>
            {candidateData && candidateData.company_name ? candidateData.company_name.substring(0, 2).toUpperCase() : 'HL'}
          </div>
          <div className="sidebar-info">
            <span className="sidebar-title">{candidateData ? candidateData.company_name : 'Hirelens Platform'}</span>
            <span className="sidebar-subtitle">{candidateData ? candidateData.job_title : 'Candidate Screening'}</span>
          </div>
        </div>
        
                  <ul className="step-list">
            {(() => {
              const dynamicSidebarSteps = [
                { title: "Invitation", maxScreen: 2 },
                { title: "Verify identity", maxScreen: 3 },
                { title: "Consent", maxScreen: 4 },
                { title: "Device check", maxScreen: 5 },
                { title: "About you", maxScreen: 6 },
              ];
              
              if (roundsList && roundsList.length > 0) {
                roundsList.forEach((r, idx) => {
                  dynamicSidebarSteps.push({
                    title: `Round ${idx + 1}: ${r.name || r.type_display || r.type}`,
                    isRound: true,
                    roundIdx: idx
                  });
                });
              } else {
                dynamicSidebarSteps.push({ title: "AI Interview", isRound: true, roundIdx: 0 });
              }
              
              dynamicSidebarSteps.push({ title: "Done", isDone: true });

              const getStepStatusLocal = (idx) => {
                const step = dynamicSidebarSteps[idx];
                if (step.maxScreen !== undefined) {
                  if (screen === step.maxScreen || (step.maxScreen === 2 && screen === 1)) return "active";
                  if (screen > step.maxScreen) return "done";
                  return "upcoming";
                }
                if (step.isRound) {
                  if (screen < 7) return "upcoming";
                  if (screen === 12) return "done";
                  if (currentRoundIdx > step.roundIdx) return "done";
                  if (currentRoundIdx === step.roundIdx) return "active";
                  return "upcoming";
                }
                if (step.isDone) {
                  if (screen === 12) return "active";
                  return "upcoming";
                }
                return "upcoming";
              };

              return dynamicSidebarSteps.map((step, idx) => {
                const status = getStepStatusLocal(idx);
                return (
                  <li className={`step-item ${status}`} key={idx}>
                    <span className="step-num">
                      {idx + 1}
                    </span>
                    <span className="step-title" style={{textTransform: 'capitalize'}}>{step.title}</span>
                  </li>
                );
              });
            })()}
          </ul>

        {/* PROTOTYPE SCREENS & INTEGRITY SWITCHER WIDGET */}
        <div style={{ margin: 'auto 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', position: 'relative', width: '100%' }}>
          
          {/* Integrity Logs Button */}
          <button
            type="button"
            onClick={() => setShowIntegrityPanel(prev => !prev)}
            style={{
              background: '#0E211D',
              border: '1.5px solid var(--rec)',
              borderRadius: '99px',
              padding: '6px 14px',
              color: '#EDF4F0',
              fontFamily: 'var(--font-m)',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              transition: 'all 0.25s',
              width: '180px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px var(--rec)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
          >
            🛡️ Logs ({integrityScreenshots.length})
          </button>

          {/* Prototype Screens Button */}
          <button
            type="button"
            onClick={() => setShowProtoSwitcher(prev => !prev)}
            style={{
              background: '#0E211D',
              border: '1.5px solid var(--amber)',
              borderRadius: '99px',
              padding: '6px 14px',
              color: '#EDF4F0',
              fontFamily: 'var(--font-m)',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              transition: 'all 0.25s',
              width: '180px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px var(--amber)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
          >
            <span style={{ color: 'var(--amber)', fontSize: '10px' }}>●</span> Screens
          </button>

          {showProtoSwitcher && (
            <div style={{
              position: 'absolute',
              bottom: '76px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '210px',
              background: 'var(--deep)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--faint)', padding: '4px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px', textAlign: 'center' }}>
                JUMP TO PROTOTYPE SCREEN
              </div>
              {[
                { num: 1, label: '1. Candidate Sign In' },
                { num: 2, label: '2. Invitation Landing' },
                { num: 3, label: '3. Identity Verification' },
                { num: 4, label: '4. Privacy Consent' },
                { num: 5, label: '5. Device Calibration' },
                { num: 6, label: '6. About You Profile' },
                { num: 7, label: '7. Round 1 Briefing' },
                { num: 8, label: '8. Live AI Interview' },
                { num: 9, label: '9. Round Interstitial' },
                { num: 10, label: '10. Case Study Brief' },
                { num: 11, label: '11. MCQ Test Palette' },
                { num: 12, label: '12. Submission Complete' }
              ].map(item => (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => {
                    setScreen(item.num);
                    setShowProtoSwitcher(false);
                    triggerToast(`Switched to Screen ${item.num}`);
                  }}
                  style={{
                    background: screen === item.num ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: screen === item.num ? 'var(--amber)' : '#EDF4F0',
                    textAlign: 'left',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: screen === item.num ? 'bold' : 'normal',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { if (screen !== item.num) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { if (screen !== item.num) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {showIntegrityPanel && (
            <div style={{
              position: 'absolute',
              bottom: '76px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              maxHeight: '400px',
              background: 'var(--deep)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--rec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🛡️ Proctoring Logs
                </span>
                <button type="button" onClick={() => setShowIntegrityPanel(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>

              {integrityScreenshots.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                  No proctoring violations recorded yet. Try keypress 'p' or trigger webcam face count changes to record.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      localStorage.removeItem('hl_integrity_alerts');
                      setIntegrityScreenshots([]);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px dashed var(--rec)',
                      borderRadius: '6px',
                      color: 'var(--rec)',
                      fontSize: '10px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginBottom: '4px'
                    }}
                  >
                    Clear LocalStorage Logs
                  </button>
                  {integrityScreenshots.map((alert) => (
                    <div key={alert.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--amber)' }}>{alert.type}</span>
                        <span className="mono" style={{ color: 'var(--muted)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {alert.screenshot && (
                        <img src={alert.screenshot} alt="Integrity alert capture" style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                  )).reverse()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cand-footer">
          <div>Powered by HireLens AI</div>
          <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.6 }}>Secured Sandbox Environment</div>
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <div className="cand-content">
        
        {/* TOPBAR HEADER */}
        <header className="cand-topbar">
          <span className="emp-name">
              {openingData?.tenant_name || 'Kulkarni Mehta & Associates LLP'} <span style={{ opacity: 0.4, margin: '0 8px' }}>·</span> <span style={{ fontWeight: 400, opacity: 0.8 }}>Job Interview Flow: {openingData?.title || 'Audit & Tax Executive'}</span>
          </span>
          <span className="meta-pill mono">
            {screen === 11 ? `Objective · camera off · tab switches are flagged` : screen === 8 ? `Live Recording Round` : `Candidate Setup`}
          </span>
        </header>

        {/* --- DYNAMIC SCREEN MANAGER --- */}
        <main className="cand-view">
          {/* ================= SCREEN 2: INVITATION / LANDING ================= */}
          {screen === 2 && (
            <div className="c-card c-hero">
              <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>OFFICIAL INTERVIEW INVITATION</span>
              <h2>Welcome, {candidateData ? candidateData.name : 'Candidate'}</h2>
              <p className="sub-tagline">You have been invited by {candidateData?.company_name || 'our partner firm'} to complete the automated screening interview for the <b>{candidateData?.job_title || 'open position'}</b>.</p>
              
              <div style={{ margin: '24px 0', borderTop: '1px solid var(--line-soft)', paddingTop: '24px' }}>
                <h4 className="mono" style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--amber-deep)', marginBottom: '16px' }}>INTERVIEW OUTLINE &amp; ESTIMATED DURATIONS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {flowRounds && flowRounds.length > 0 ? (
                    flowRounds.map((round, idx) => (
                      <div key={round.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#fff', transition: 'all 0.2s' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--line-soft)', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', flexShrink: 0, marginTop: '2px' }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', fontWeight: '600' }}>
                            Round {idx + 1}: {round.type_display || round.type.toUpperCase()}
                          </b>
                          <small style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: '1.5', display: 'block', marginTop: '3px' }}>
                            {round.type === 'form' && "Pre-screening questions and basic eligibility check."}
                            {round.type === 'hr' && (openingData?.title 
                              ? `Assesses background, communication skills, and cultural alignment for the ${openingData.title} position.` 
                              : "Assesses professional background, communication skills, and general cultural alignment.")}
                            {round.type === 'tech' && (openingData?.title 
                              ? (openingData.title.toLowerCase().includes('audit') || openingData.title.toLowerCase().includes('tax')
                                ? "Covers statutory audit guidelines, corporate tax compliance, and financial reporting principles."
                                : `Covers technical fundamentals, frameworks, and architecture relevant to ${openingData.title}.`)
                              : "Covers technical fundamentals, core guidelines, and industry principles.")}
                            {round.type === 'case' && (openingData?.title 
                              ? `Presents a practical scenario to analyze and write a structured solution for ${openingData.title}.`
                              : "Presents a practical mismatch scenario. Candidate must analyze it on camera and write their proposal.")}
                            {round.type === 'mcq' && "Interactive examination with multiple-choice questions on domain knowledge and standard procedures."}
                          </small>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          <span className="badge b-info sm">{round.dur} Mins</span>
                          <span className="badge b-rec sm">● Camera Required</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Round 1 */}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#fff', transition: 'all 0.2s' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--line-soft)', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', flexShrink: 0, marginTop: '2px' }}>1</div>
                        <div style={{ flex: 1 }}>
                          <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', fontWeight: '600' }}>Round 1: HR Conversation</b>
                          <small style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: '1.5', display: 'block', marginTop: '3px' }}>Assesses professional background, communication skills, and general cultural alignment.</small>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          <span className="badge b-info sm">8 Mins</span>
                          <span className="badge b-rec sm">● Camera Required</span>
                        </div>
                      </div>
                      {/* Round 2 */}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#fff', transition: 'all 0.2s' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--line-soft)', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', flexShrink: 0, marginTop: '2px' }}>2</div>
                        <div style={{ flex: 1 }}>
                          <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', fontWeight: '600' }}>Round 2: Technical Fundamentals</b>
                          <small style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: '1.5', display: 'block', marginTop: '3px' }}>Covers statutory audit guidelines, corporate tax compliance, and financial reporting principles.</small>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          <span className="badge b-info sm">10 Mins</span>
                          <span className="badge b-rec sm">● Camera Required</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="wassure" style={{ marginBottom: '24px', background: 'var(--ok-soft)', borderColor: 'var(--ok)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <b>✓ Ready to begin:</b> This interview is supported on Chrome, Safari, Firefox, and Edge. Please ensure you are in a quiet, well-lit room. Your link will expire on
                </div>
                <div style={{ textAlign: 'right', minWidth: '95px', borderLeft: '1.5px solid rgba(46, 125, 91, 0.25)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--petrol)', whiteSpace: 'nowrap' }}>{formatExpiryDate(expiresAt).dayMonth}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>{formatExpiryDate(expiresAt).year}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn ghost" onClick={() => setScreen(1)}>← Back</button>
                <button className="btn primary" onClick={() => setScreen(3)}>Start verification →</button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 3: VERIFY IDENTITY (OTP) ================= */}
          {screen === 3 && (
            <div className="c-card" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: '4px' }}>Step 2 of 8</span>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '26px', fontWeight: '750', marginBottom: '20px', letterSpacing: '-0.015em' }}>Verify Your Identity</h2>
              
              {/* Candidate Information Card */}
              <div className="candidate-badge-card" style={{ background: '#F8FAFA', border: '1.5px solid var(--line-soft)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                <span className="mono" style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', borderBottom: '1px solid var(--line-soft)', paddingBottom: '6px' }}>Candidate Information Card</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--ink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                    <span>👤</span> <span>{candidateData ? candidateData.name : 'Jay Patil'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                    <span>💼</span> <span>{openingData ? openingData.title : 'Audit & Tax Executive'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                    <span>🏢</span> <span>{openingData?.tenant_name || 'Kulkarni & Co.'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Verification code sent to</span>
                <span className="mono" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ink)' }}>
                  {candidateData ? (
                    candidateData.email.split('@')[0].slice(0, 2) + '****@' + candidateData.email.split('@')[1]
                  ) : 'j**.p****l@example.com'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '24px 0' }}>
                 {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e.target, idx)}
                    style={{
                      width: '45px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: '700',
                      fontFamily: 'var(--font-m)',
                      border: '1.5px solid var(--line)',
                      borderRadius: '10px',
                      outline: 'none',
                      backgroundColor: '#fff',
                      color: 'var(--ink)'
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: 'var(--faint)', display: 'block' }}>Code expires in</span>
                <span className="mono" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--rec)', marginTop: '2px', display: 'block' }}>
                  {formatTime(otpTimer)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                <button className="btn ghost" onClick={() => setScreen(2)}>← Back</button>
                <button className="btn ghost sm" onClick={handleAutoFillOtp} style={{ color: 'var(--amber-deep)' }}>Auto-fill Code (Demo)</button>
                <button className="btn primary" onClick={handleVerifyOtp}>Verify &amp; Continue →</button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12.5px', borderTop: '1px solid var(--line-soft)', paddingTop: '20px' }}>
                <div style={{ color: 'var(--muted)', marginBottom: '8px', fontSize: '12px' }}>Didn't receive the code?</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                  <button className="linkbtn" style={{ fontWeight: '600' }} onClick={() => { setOtpTimer(120); triggerToast("New verification code sent!"); }}>Resend Code</button>
                  <span style={{ color: 'var(--line)' }}>|</span>
                  <button className="linkbtn" style={{ fontWeight: '600' }} onClick={() => setScreen(1)}>Change Email</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '11px', color: 'var(--faint)', lineHeight: 1.4, marginTop: '20px', borderTop: '1px solid var(--line-soft)', paddingTop: '16px' }}>
                <span style={{ fontSize: '13px' }}>🔒</span>
                <span>Your verification code is encrypted and valid for one-time use only.</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 4: DATA CONSENT ================= */}
          {screen === 4 && (
            <div className="c-card">
              <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>DATA PRIVACY &amp; SECURITY CONSENT</span>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', marginBottom: '8px' }}>Candidate Consent &amp; Privacy Agreement</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '24px' }}>Please read through the details of our screening parameters. Your agreement is required to initiate the webcam setup.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', padding: '4px' }}>📹</span>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Webcam &amp; Mic Recording</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>During live questions, your camera and microphone feed will be recorded. Make sure your face is clearly visible at all times.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', padding: '4px' }}>🧠</span>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>AI Transcription &amp; Assessment</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Our platform will transcribe your spoken answers. Hirelens AI will evaluate your responses solely against the job criteria set by the employer.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', padding: '4px' }}>🛡️</span>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Session Integrity Verification</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>To guarantee an honest screening, tab switching events and copy-paste attempts are tracked during the MCQ and case study stages.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', padding: '4px' }}>🕒</span>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Data Retention &amp; Deletion</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Your recorded video files and assessment parameters will be retained securely in {candidateData?.company_name || 'our partner firm'}'s portal for 30 days, after which they will be permanently purged.</p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--mist)', borderRadius: '10px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--petrol)' }}
                  />
                  I consent to the recording of video, audio, and session data for this automated screening.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn ghost" onClick={() => setScreen(3)}>← Back</button>
                <button
                  className="btn primary"
                  onClick={() => {
                    if (!consentChecked) {
                      triggerToast({ bold: "Consent Required:", normal: "Please check the box to consent to the terms before continuing." }, true);
                    } else {
                      setScreen(5);
                    }
                  }}
                >
                  Confirm &amp; Continue →
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 5: DEVICE CHECK ================= */}

                    {screen === 5 && (
            <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '1100px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', margin: '0 auto', fontFamily: '"Inter", sans-serif', color: '#1F2937', position: 'relative' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h5 style={{ color: '#F59E0B', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Device Calibration &amp; Pre-Flight Checklist
                  </h5>
                  <h2 style={{ color: '#064E3B', fontSize: '28px', fontWeight: '800', margin: '0' }}>
                    Webcam, Audio &amp; Identity Verification
                  </h2>
                </div>
                <div style={{ background: '#D1FAE5', color: '#065F46', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#059669', borderRadius: '50%' }}></span>
                  Calibration Ready
                </div>
              </div>
              <p style={{ color: '#6B7280', fontSize: '15px', marginTop: '12px', marginBottom: '32px' }}>
                Follow the steps below in order to calibrate your hardware before starting your AI interview.
              </p>

              {/* Progress Steps */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
                <div style={{ position: 'absolute', height: '2px', background: 'linear-gradient(to right, rgba(5,150,105,0.2) 0%, rgba(209,250,229,0) 100%)', top: '50%', left: '0', right: '0', zIndex: 0 }}></div>
                
                {[
                  { label: 'Mic Test', step: 1, active: micTestState === 'untested' || micTestState === 'recording', done: micTestState === 'verified' },
                  { label: 'Speaker Test', step: 2, active: micTestState === 'verified' && speakerState !== 'verified', done: speakerState === 'verified' },
                  { label: 'Network Test', step: 3, active: micTestState === 'verified' && speakerState === 'verified' && latency === null, done: latency !== null },
                  { label: 'Profile Snapshot', step: 4, active: micTestState === 'verified' && speakerState === 'verified' && latency !== null && !cameraConfirmed, done: cameraConfirmed }
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, background: '#F8FAFC', padding: '0 16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: (s.active || s.done) ? '#D1FAE5' : '#F3F4F6', color: (s.active || s.done) ? '#059669' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>
                      {s.step}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: s.active ? '700' : '600', color: s.active ? '#064E3B' : (s.done ? '#059669' : '#9CA3AF'), borderBottom: s.active ? '3px solid #059669' : '3px solid transparent', paddingBottom: '4px' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Permission Denied Warning */}
              {(hasCameraPermission === false || hasMicPermission === false) && (
                <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#991B1B' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>Permission Required</h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>You must allow camera and microphone access to proceed with the AI interview.</p>
                    <button onClick={startCamera} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      🔄 Reconnect Camera &amp; Microphone
                    </button>
                  </div>
                </div>
              )}

              {/* 2-Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                
                {/* Left Column: Camera */}
                <div style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', border: '3px solid #10B981', background: '#000', aspectRatio: '4/3', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.15)' }}>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {hasCameraPermission ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    ></video>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                      <span style={{ fontSize: '32px', marginBottom: '12px' }}>📷</span>
                      <span>{hasCameraPermission === false ? "Camera Access Denied" : "Camera Access Required"}</span>
                    </div>
                  )}
                  {capturedPhoto && (
                    <img src={capturedPhoto} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }} alt="Snapshot Preview" />
                  )}
                  
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 20 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg> Webcam
                  </div>
                  <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 20 }}>
                    <span style={{ width: '8px', height: '8px', background: '#059669', borderRadius: '50%' }}></span> Live
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 20 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c1.65 0 3-1.35 3-3s-1.35-3-3-3-3 1.35-3 3 1.35 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Camera Active
                  </div>
                </div>

                {/* Right Column: Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Card 1: Camera Feed / Profile Snapshot */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: cameraConfirmed ? '6px solid #10B981' : '6px solid #064E3B', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ background: '#E8F5E9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: '#10B981' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#064E3B' }}>Camera Feed</h4>
                        {hasCameraPermission ? (
                          <div style={{ background: '#E8F5E9', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ✓ Access Granted
                          </div>
                        ) : (
                          <div style={{ background: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Pending</div>
                        )}
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>Please use the live camera feed to capture and confirm your picture.</p>
                      
                      {!cameraConfirmed && hasCameraPermission && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={capturePhoto} style={{ padding: '6px 12px', background: capturedPhoto ? '#F3F4F6' : '#10B981', color: capturedPhoto ? '#374151' : '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            {capturedPhoto ? 'Retake Picture' : 'Capture Picture'}
                          </button>
                          {capturedPhoto && (
                            <button onClick={() => setCameraConfirmed(true)} style={{ padding: '6px 12px', background: '#064E3B', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              Confirm Picture
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Audio Test */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: micTestState === 'verified' ? '6px solid #10B981' : '6px solid #064E3B', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ background: '#E8F5E9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: '#10B981' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#064E3B' }}>Audio Test</h4>
                        {micTestState === 'verified' ? (
                          <div style={{ background: '#E8F5E9', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Working</div>
                        ) : micTestState === 'recording' ? (
                          <div style={{ background: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Recording...</div>
                        ) : (
                          <div style={{ background: '#F3F4F6', color: '#6B7280', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Untested</div>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>
                        {micTestState === 'recording' ? 'Recording in progress...' : (micTestState === 'recorded' ? 'Listen and confirm' : 'Mic active (sound detected)')}
                      </p>
                      
                      {/* Dots */}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {[10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150].map(v => (
                          <div key={v} style={{ width: '6px', height: '8px', borderRadius: '4px', background: micLevel >= (v/1.5) ? '#059669' : '#D1FAE5', transition: 'background 0.1s' }} />
                        ))}
                      </div>

                      {micTestState === 'untested' && (
                        <button onClick={startMicTest} style={{ padding: '6px 12px', background: '#10B981', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          Start Mic Test
                        </button>
                      )}
                      
                      {micTestState === 'recording' && (
                        <button onClick={stopMicTest} style={{ padding: '6px 12px', background: '#EF4444', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          Stop Recording
                        </button>
                      )}

                      {micTestState === 'recorded' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <audio src={micTestUrl} controls style={{ height: '24px', width: '100%' }} />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={startMicTest} style={{ padding: '4px 10px', background: '#F3F4F6', color: '#374151', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Retest</button>
                            <button onClick={() => setMicTestState('verified')} style={{ padding: '4px 10px', background: '#064E3B', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Sounds Good</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Speaker Test */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: speakerState === 'verified' ? '6px solid #10B981' : '6px solid #064E3B', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ background: '#E8F5E9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: '#10B981' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#064E3B' }}>Speaker Test</h4>
                        {speakerState === 'verified' ? (
                          <div style={{ background: '#E8F5E9', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Working</div>
                        ) : speakerState === 'tested' ? (
                          <div style={{ background: '#E8F5E9', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ↻ Testing
                          </div>
                        ) : (
                          <div style={{ background: '#F3F4F6', color: '#6B7280', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Untested</div>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>
                        {speakerState === 'tested' ? 'Playing test sound...' : 'Verify your speaker output'}
                      </p>
                      
                      {/* Bar */}
                      <div style={{ width: '100%', height: '8px', background: '#E8F5E9', borderRadius: '4px', marginTop: '12px', marginBottom: '12px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#10B981', width: speakerState === 'tested' ? '60%' : (speakerState === 'verified' ? '100%' : '0%'), transition: 'width 0.3s ease' }}></div>
                      </div>

                      {speakerState === 'untested' && (
                        <button onClick={() => { playTestSound(); setSpeakerState('tested'); }} style={{ padding: '6px 12px', background: '#10B981', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          Play Sound
                        </button>
                      )}

                      {speakerState === 'tested' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { playTestSound(); setSpeakerState('tested'); }} style={{ padding: '4px 10px', background: '#F3F4F6', color: '#374151', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Replay</button>
                          <button onClick={() => setSpeakerState('verified')} style={{ padding: '4px 10px', background: '#064E3B', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>I hear it</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Network Test */}
                  <div style={{ background: latency !== null ? '#D1FAE5' : '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: latency !== null ? '6px solid #10B981' : '6px solid #064E3B', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.3s' }}>
                    <div style={{ background: latency !== null ? 'transparent' : '#E8F5E9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: latency !== null ? '#064E3B' : '#10B981' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4.6-4.6c.77-.77 1.77-1.17 2.76-1.19.01-.01.02-.01.03-.01h1.62c.01 0 .02 0 .03.01.99.02 1.99.42 2.76 1.19l1.41-1.41C14.7 13.68 13.35 13.21 12 13.2c-.01 0-.02 0-.03 0h-.01c-.01 0-.02 0-.03 0C10.65 13.21 9.3 13.68 7.99 14.99L9.4 16.4zm-4.6-4.6C7.54 9.06 10.71 7.79 14.15 8.16l2.36-2.36C12.87 3.53 8.12 4.41 4.54 7.54l1.41 1.41zM20.24 6.76C18.66 5.56 16.88 4.79 15 4.5l-1.4 1.4c1.39.29 2.73.91 3.93 1.83l2.71-2.97z"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#064E3B' }}>Network Test</h4>
                        {latency !== null ? (
                          <div style={{ background: 'transparent', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Stable</div>
                        ) : (
                          <div style={{ background: '#F3F4F6', color: '#6B7280', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Pending</div>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: latency !== null ? '#065F46' : '#6B7280', lineHeight: 1.4 }}>
                        {latency !== null ? `Stable Connection (${latency}ms Latency)` : 'Waiting for network check...'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                <button onClick={() => setScreen(4)} style={{ padding: '12px 24px', background: '#FFFFFF', border: '1px solid #10B981', color: '#064E3B', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ← Back
                </button>
                <button 
                  onClick={handleSaveAndContinue} 
                  disabled={!(hasCameraPermission && hasMicPermission && micTestState === 'verified' && speakerState === 'verified' && cameraConfirmed)} 
                  style={{ 
                    padding: '12px 24px', 
                    background: (hasCameraPermission && hasMicPermission && micTestState === 'verified' && speakerState === 'verified' && cameraConfirmed) ? '#064E3B' : '#9CA3AF', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    cursor: (hasCameraPermission && hasMicPermission && micTestState === 'verified' && speakerState === 'verified' && cameraConfirmed) ? 'pointer' : 'not-allowed', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'background 0.3s'
                  }}
                >
                  Next Step →
                </button>
              </div>

            </div>
          )}

          
            {/* ================= SCREEN 6: ABOUT YOU (FORM DETAILS) ================= */}
          {/* ================= SCREEN 6: ABOUT YOU PROFILE QUESTIONNAIRE ================= */}
          {screen === 6 && (
            <div className="c-card">
              <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>CANDIDATE INFORMATION</span>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', marginBottom: '8px' }}>Verify Your Profile Details</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '24px' }}>Please double check the pre-filled parameters before continuing.</p>

              <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', marginBottom: '24px' }}>
                {capturedPhoto ? (
                  <img src={capturedPhoto} style={{ width: '120px', height: '120px', borderRadius: '14px', objectFit: 'cover', border: '2px solid var(--line)' }} alt="Profile photo" />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '14px', background: 'var(--mist)', display: 'grid', placeItems: 'center' }}>No Photo</div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div className="form-row-2">
                    <div className="c-input-group">
                      <label>Candidate Name</label>
                      <input value={candidateData ? candidateData.name : 'Jay Patil'} readOnly className="c-field-read" style={{ border: 'none', background: 'transparent', padding: 0 }} />
                    </div>
                    <div className="c-input-group">
                      <label>Candidate ID</label>
                      <input value={candidateId} readOnly className="c-field-read" style={{ border: 'none', background: 'transparent', padding: 0 }} />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="c-input-group">
                      <label>Email Address</label>
                      <input value={candidateData ? candidateData.email.replace(/(.{2})(.*)(?=@)/, (match, p1, p2) => p1 + '*'.repeat(p2.length)) : 'ja*******@example.com'} readOnly className="c-field-read" style={{ border: 'none', background: 'transparent', padding: 0 }} />
                    </div>
                    <div className="c-input-group">
                      <label>Phone Number</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <div className="c-input-group">
                  <label>Position Applied For</label>
                  <input value={openingData ? openingData.title : 'Audit & Tax Executive'} readOnly className="c-field-read" style={{ border: 'none', background: 'transparent', padding: 0 }} />
                </div>
                <div className="c-input-group">
                  <label>Resume CV Status</label>
                  <input value="✓ Resume Uploaded" readOnly className="c-field-read" style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--ok)' }} />
                </div>
              </div>

              <h4 className="mono" style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--amber-deep)', margin: '24px 0 12px' }}>PROFESSIONAL PROFILE FIELDS</h4>
              
              <div className="form-row-2">
                <div className="c-input-group">
                  <label>Highest Qualification</label>
                  <input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. B.Tech" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
                </div>
                <div className="c-input-group">
                  <label>Relevant Experience</label>
                  <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 2 years" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="c-input-group">
                  <label>Notice Period</label>
                  <input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} placeholder="e.g. 30 days" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
                </div>
                <div className="c-input-group">
                  <label>Expected CTC (Salary)</label>
                  <input value={expectedCtc} onChange={(e) => setExpectedCtc(e.target.value)} placeholder="e.g. 8 LPA" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
                </div>
              </div>

              <div className="c-input-group">
                <label>LinkedIn Profile URL</label>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="e.g. https://linkedin.com/in/username" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button className="btn ghost" onClick={() => setScreen(5)}>← Back</button>
                <button className="btn primary" onClick={handleUpdateCandidateDetails}>Save &amp; Continue →</button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 7: INTERVIEW INSTRUCTIONS ================= */}
          {screen === 7 && (
            <div className="c-card">
              <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>GUIDELINES &amp; WORKFLOW</span>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', marginBottom: '8px' }}>
                Instructions for Round {currentRoundIdx + 1}: {roundsList[currentRoundIdx].name}
              </h3>
              <p className="sub-tagline">Please review the workflow map of the recording process before starting your camera session.</p>

              <div className="process-steps">
                <div className="p-step-card">
                  <div className="p-step-num">01</div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>AI Asks Question</h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>The AI speaks and displays the question text. You have 15s reading time.</p>
                </div>
                <div className="p-step-card">
                  <div className="p-step-num">02</div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>Recording Begins</h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Camera turns ON automatically. A red dot indicates recording is active.</p>
                </div>
                <div className="p-step-card">
                  <div className="p-step-num">03</div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>Provide Answer</h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Speak clearly. Citing direct tax laws or AS/Ind AS standards is highly recommended.</p>
                </div>
                <div className="p-step-card">
                  <div className="p-step-num">04</div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>Save &amp; Next</h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Click "Save &amp; Next" to upload your recording and fetch the next question.</p>
                </div>
              </div>

              <div className="form-row-2" style={{ marginTop: '24px' }}>
                <div style={{ padding: '16px', border: '1.5px solid var(--line)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>Round Metrics</h4>
                  <ul style={{ fontSize: '12px', paddingLeft: '18px', color: 'var(--muted)' }}>
                    <li>Total questions in this round: <b>{roundsList[currentRoundIdx].questions.length}</b></li>
                    <li>Time limit per answer: <b>Up to 2 minutes</b></li>
                    <li>Replay allowed: <b>1 replay per question</b></li>
                  </ul>
                </div>
                <div style={{ padding: '16px', border: '1.5px solid var(--line)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>Navigation Rules</h4>
                  <ul style={{ fontSize: '12px', paddingLeft: '18px', color: 'var(--muted)' }}>
                    <li>Strict linear progression: no going back to previous questions</li>
                    <li>Do not refresh the page or exit the browser window</li>
                    <li>Tab switching will be flagged as an integrity alert</li>
                    <li>Multiple face detection: 2 or more persons in the camera feed are strictly not allowed</li>
                  </ul>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button className="btn ghost" onClick={() => setScreen(6)}>← Back</button>
                <button className="btn primary" onClick={handleBeginRound}>
                  Begin Round {currentRoundIdx + 1} · {roundsList[currentRoundIdx]?.name || roundsList[currentRoundIdx]?.type_display || roundsList[currentRoundIdx]?.type?.toUpperCase()} →
                </button>
              </div>
            </div>
          )}

          
          {/* ================= SCREEN 75: EXAM COUNTDOWN ================= */}
          {screen === 75 && (
            <div className="c-card" style={{ maxWidth: '480px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(239, 176, 54, 0.1)', border: '2px solid var(--amber)', display: 'grid', placeItems: 'center', margin: '0 auto 24px auto', position: 'relative' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--amber)' }}>{examStartTimer}</span>
                <svg style={{ position: 'absolute', top: '-2px', left: '-2px', width: '84px', height: '84px', transform: 'rotate(-90deg)' }}>
                  <circle cx="42" cy="42" r="40" fill="none" stroke="var(--amber)" strokeWidth="4" strokeDasharray="251" strokeDashoffset={251 - (251 * (examStartTimer / 5))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', margin: '0 0 12px 0' }}>Get Ready</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14.5px', marginBottom: '0', lineHeight: 1.5 }}>
                Your exam will start in {examStartTimer} seconds.<br />Please ensure you are sitting comfortably and looking at the camera.
              </p>
            </div>
          )}

          {/* ================= SCREEN 8: AI INTERVIEW (LIVE STAGE) ================= */}
          {screen === 8 && (
            <div className="c-card" style={{ padding: '32px', background: 'var(--deep-2)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              
              {/* Top progress metadata bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#EDF4F0', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: speakingState === 'asking' ? 'var(--amber)' : 'var(--ok)', borderRadius: '50%', display: 'inline-block' }}></span>
                  Round {currentRoundIdx + 1} · {roundsList[currentRoundIdx]?.name || roundsList[currentRoundIdx]?.type_display || roundsList[currentRoundIdx]?.type?.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#7E978E', fontWeight: '600' }}>
                    Question {currentQuestionIdx + 1} of {roundsList[currentRoundIdx]?.questions?.length || 0}
                  </span>
                  
                  {/* Camera icon button */}
                  <button 
                    onClick={() => setShowCameraModal(true)} 
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#EDF4F0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      marginTop: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <span>📹</span> Video Feed {hasCameraPermission ? '●' : '○'}
                  </button>
                </div>
              </div>

              {/* Progress Indicator Bar */}
              <div className="progress-indicator" style={{ marginBottom: '32px' }}>
                <div className="fill" style={{ width: `${((currentQuestionIdx + 1) / (roundsList[currentRoundIdx]?.questions?.length || 1)) * 100}%` }}></div>
              </div>

              {/* AI Interviewer ORB Graphic */}
              <div className="ai-orb-container">
                <div className="ai-orb-outer">
                  <div className={`ai-orb-ring ${isAudioPlaying ? 'speaking-active' : speakingState === 'listening' ? 'active' : ''}`}></div>
                  <div className={`ai-orb-inner ${isAudioPlaying ? 'speaking' : speakingState}`}></div>
                </div>
                <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#7E978E', marginTop: '12px', fontWeight: '700' }}>AANYA · AI INTERVIEWER</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: isAudioPlaying ? '#4facfe' : speakingState === 'asking' ? 'var(--amber)' : 'var(--ok)', marginTop: '4px' }}>
                  {isAudioPlaying ? 'Aanya Speaking...' : speakingState === 'asking' ? 'Thinking Time...' : 'Listening — your turn'}
                </span>
              </div>

              {/* Centered Question Card Container */}
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                
                {/* Large Question Card */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '32px 28px', borderRadius: '16px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {isSavingQuestion ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px 0' }}>
                      <div className="spinner" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'var(--amber)',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      <span className="mono" style={{ fontSize: '11.5px', color: 'var(--amber)', letterSpacing: '0.08em', fontWeight: 'bold' }}>
                        UPLOADING RESPONSE &amp; CONFIGURING NEXT QUESTION...
                      </span>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 24px 0', lineHeight: 1.5, color: '#EDF4F0' }}>
                        {roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.text || ""}
                      </p>

                      {roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                          {roundsList[currentRoundIdx].questions[currentQuestionIdx].options.map((opt, idx) => {
                             const question = roundsList[currentRoundIdx].questions[currentQuestionIdx];
                             const qKey = `q${question.id}`;
                             const selectedIdx = mcqAnswers[qKey];
                             const isSelected = selectedIdx === idx;
                             return (
                               <div 
                                 key={idx}
                                 onClick={() => {
                                   if (speakingState === 'listening') {
                                     // Store selected option text in transcript for display/legacy
                                     setCurrentTranscript(typeof opt === 'object' ? opt.text || String(opt) : String(opt));
                                     // CRITICAL: Also store option INDEX in mcqAnswers so backend can grade it
                                     setMcqAnswers(prev => ({ ...prev, [qKey]: idx }));
                                   }
                                 }}
                                 onMouseEnter={(e) => {
                                   if (speakingState === 'listening' && !isSelected) {
                                     e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                   }
                                 }}
                                 onMouseLeave={(e) => {
                                   if (speakingState === 'listening' && !isSelected) {
                                     e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                   }
                                 }}
                                 style={{
                                   padding: '12px 16px',
                                   background: isSelected ? 'rgba(221,160,50,0.1)' : 'rgba(255,255,255,0.03)',
                                   border: `1px solid ${isSelected ? 'var(--amber)' : 'rgba(255,255,255,0.1)'}`,
                                   borderRadius: '8px',
                                   cursor: speakingState === 'listening' ? 'pointer' : 'not-allowed',
                                   fontSize: '14.5px',
                                   color: isSelected ? 'var(--amber)' : '#EDF4F0',
                                   transition: 'all 0.2s',
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '12px'
                                 }}
                               >
                                 <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1.5px solid ${isSelected ? 'var(--amber)' : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)' }}></div>}
                                 </div>
                                 <span style={{ lineHeight: 1.4 }}>{opt}</span>
                               </div>
                             );
                          })}
                        </div>
                      )}

                      {/* Live Speech Recognition Feedback (only for descriptive audio questions) */}
                      {!roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length && speakingState === 'listening' && (
                        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSpeechSupported ? 'rgba(255,255,255,0.08)' : 'rgba(255, 90, 90, 0.35)'}`, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSpeechSupported ? 'var(--ok)' : '#ff5a5a', animation: isSpeechSupported ? 'pulse 1.2s infinite' : 'none' }}></span>
                            <span style={{ fontSize: '11px', color: isSpeechSupported ? '#7E978E' : '#ff8080', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {isSpeechSupported ? 'Live Voice Transcription' : '⚠ Voice Not Supported on This Browser'}
                            </span>
                          </div>
                          {isSpeechSupported ? (
                            <p style={{ margin: 0, fontSize: '13.5px', color: currentTranscript ? '#EDF4F0' : '#7E978E', fontStyle: currentTranscript ? 'normal' : 'italic', lineHeight: 1.5 }}>
                              {currentTranscript || "Listening for your voice... Speak clearly into your microphone."}
                            </p>
                          ) : (
                            <p style={{ margin: 0, fontSize: '13px', color: '#ff9090', lineHeight: 1.5 }}>
                              Voice recording is not supported on this browser/device. Your answer will be marked as <b>"Voice not recorded"</b> in the report. Please use <b>Google Chrome on a desktop</b> for best results.
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        
                        {/* Timer & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {speakingState === 'asking' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', backgroundColor: isAudioPlaying ? '#4facfe' : 'var(--amber)', borderRadius: '50%', animation: isAudioPlaying ? 'pulse 1s infinite alternate' : 'none' }}></span>
                              <span style={{ fontSize: '13px', color: '#7E978E' }}>
                                {isAudioPlaying ? (
                                  <span>Aanya reading question...</span>
                                ) : (
                                  <span>
                                    Thinking Time: <b className="mono" style={{ color: 'var(--amber)', fontSize: '14px' }}>0:{String(questionTimer).padStart(2, '0')}</b> / 0:15
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--rec)', borderRadius: '50%', animation: 'rec-blink 1.2s infinite' }}></span>
                                <span className="mono" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--rec)' }}>REC</span>
                              </div>
                              <span className="mono" style={{ fontSize: '14px', fontWeight: '750', color: '#EDF4F0' }}>
                                {formatTime(answerTimer)}
                              </span>
                              <span style={{ fontSize: '12px', color: '#7E978E' }}>/ {formatTime(getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx))}</span>
                              
                              {/* CSS waveform audio indicator */}
                              <div className="waveform" style={{ marginLeft: '8px' }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div
                                    key={i}
                                    className="wave-line"
                                    style={{
                                      animationDelay: `${i * 0.1}s`,
                                      height: '8px',
                                      backgroundColor: 'var(--amber)',
                                      width: '2px'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Replay Button */}
                        <button 
                          className="btn ghost sm" 
                          disabled={replayUsed >= 1 || isAudioPlaying}
                          onClick={() => { 
                            if (replayUsed >= 1 || isAudioPlaying) return;

                            setReplayUsed(prev => prev + 1); 
                            
                            const inAnswerPhase = (speakingState === 'listening');
                            if (!inAnswerPhase) {
                              // Reset reading timer to 15 seconds if replayed during thinking phase
                              setQuestionTimer(15);
                            }

                            const activeQuestionText = roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.text;
                            if (activeQuestionText) {
                              if (activeUtteranceRef.current) {
                                activeUtteranceRef.current.onend = null;
                                activeUtteranceRef.current.onerror = null;
                              }
                              window.speechSynthesis.cancel();
                              setIsAudioPlaying(true);
                              const utterance = new SpeechSynthesisUtterance(activeQuestionText);
                              activeUtteranceRef.current = utterance;
                              if (indianVoice) {
                                utterance.voice = indianVoice;
                              }
                              utterance.onend = () => {
                                if (activeUtteranceRef.current === utterance) {
                                  setIsAudioPlaying(false);
                                }
                              };
                              utterance.onerror = () => {
                                if (activeUtteranceRef.current === utterance) {
                                  setIsAudioPlaying(false);
                                }
                              };
                              window.speechSynthesis.speak(utterance);
                            }
                            triggerToast("Replaying question audio..."); 
                          }}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            borderRadius: '99px',
                            transition: 'all 0.2s',
                            backgroundColor: 'transparent',
                            color: (replayUsed >= 1 || isAudioPlaying) ? 'rgba(255,255,255,0.25)' : '#EDF4F0',
                            borderColor: (replayUsed >= 1 || isAudioPlaying) ? 'rgba(255,255,255,0.12)' : 'rgba(221,160,50,0.5)',
                            cursor: (replayUsed >= 1 || isAudioPlaying) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Replay question ({1 - replayUsed} left)
                        </button>
                      </div>

                      {/* Big Action Button (Save & Next / I've finished my answer) */}
                      <div style={{ marginTop: '28px' }}>
                        {speakingState === 'asking' ? (
                            <button 
                              className="btn primary" 
                              disabled={isAudioPlaying || questionTimer > 10} 
                              onClick={() => {
                                setSpeakingState('listening');
                                setIsAnswering(true);
                                setAnswerTimer(getQuestionTimeLimitSeconds(currentRoundIdx, currentQuestionIdx));
                                setQuestionTimer(15);
                              }}
                              style={{ 
                                width: '100%', 
                                height: '48px', 
                                fontSize: '14px', 
                                cursor: (isAudioPlaying || questionTimer > 10) ? 'not-allowed' : 'pointer',
                                background: (isAudioPlaying || questionTimer > 10) ? 'rgba(255,255,255,0.1)' : 'var(--amber)',
                                color: (isAudioPlaying || questionTimer > 10) ? 'rgba(255,255,255,0.3)' : 'var(--deep)'
                              }}
                            >
                              {isAudioPlaying ? 'Listening to Question...' : (questionTimer > 10 ? `Thinking Time (0:${String(questionTimer).padStart(2, '0')}) - Skip enabled in ${questionTimer - 10}s` : `Skip Thinking Time (0:${String(questionTimer).padStart(2, '0')})`)}
                            </button>
                          ) : (
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {(!roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length) && (
                              <button 
                                className="btn ghost" 
                                disabled={isSavingQuestion || isTranscribing}
                                onClick={handleClearResponse} 
                                style={{ 
                                  flex: 1, 
                                  height: '48px', 
                                  fontWeight: '600', 
                                  fontSize: '14px', 
                                  borderRadius: '10px',
                                  cursor: (isSavingQuestion || isTranscribing) ? 'not-allowed' : 'pointer',
                                  opacity: (isSavingQuestion || isTranscribing) ? 0.5 : 1
                                }}
                              >
                                Clear Response
                              </button>
                            )}
                            <button 
                              className="btn primary" 
                              disabled={(roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 && !currentTranscript) || isSavingQuestion || isTranscribing}
                              onClick={handleSaveAndNextQuestion} 
                              style={{ 
                                flex: 2, 
                                height: '48px', 
                                backgroundColor: ((roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 && !currentTranscript) || isSavingQuestion || isTranscribing) ? 'rgba(255,255,255,0.1)' : 'var(--amber)', 
                                color: ((roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 && !currentTranscript) || isSavingQuestion || isTranscribing) ? 'rgba(255,255,255,0.3)' : 'var(--deep)', 
                                fontWeight: '700', 
                                fontSize: '14.5px', 
                                borderRadius: '10px',
                                cursor: ((roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 && !currentTranscript) || isSavingQuestion || isTranscribing) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {(isSavingQuestion || isTranscribing) ? "Finalizing your answer..." : "Save & Next →"}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '24px', paddingTop: '16px', fontSize: '12px', color: '#7E978E', lineHeight: 1.45, fontStyle: 'italic', textAlign: 'center' }}>
                  {roundsList[currentRoundIdx]?.questions?.[currentQuestionIdx]?.options?.length > 0 
                    ? "💡 Tip — Select the best option from the choices above before the timer runs out." 
                    : "💡 Tip — look at the camera, not the screen. Structure answers as situation → action → result."}
                </div>
              </div>

              {/* Camera Feed Modal */}
              <div style={{ display: showCameraModal ? 'grid' : 'none', position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', placeItems: 'center', zIndex: 1000 }}>
                <div className="c-card" style={{ width: '460px', background: 'var(--deep)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#EDF4F0' }}>Live Interview Camera Feed</h4>
                    <button 
                      onClick={() => setShowCameraModal(false)}
                      style={{ background: 'none', border: 'none', color: '#7E978E', fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>

                  {/* Camera Container */}
                  <div className="camera-container" style={{ border: '1.5px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden', position: 'relative', width: '100%', height: '280px', backgroundColor: '#000', margin: '0 auto' }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ display: hasCameraPermission ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                    ></video>
                    {!hasCameraPermission && (
                      <div className="camera-placeholder">
                        <span style={{ fontSize: '32px' }}>📹</span>
                        <span>webcam stream offline</span>
                      </div>
                    )}
                    
                    <div className="pulse-rec" style={{ top: '16px', left: '16px', backgroundColor: 'rgba(11,30,26,0.75)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="dot" style={{ backgroundColor: speakingState === 'listening' ? 'var(--rec)' : '#7E978E', animation: speakingState === 'listening' ? 'rec-blink 1.2s infinite' : 'none' }}></span>
                      <span style={{ color: speakingState === 'listening' ? '#EDF4F0' : '#A9C0B8' }}>
                        {speakingState === 'listening' ? 'REC ACTIVE' : 'CAMERA ACTIVE'}
                      </span>
                    </div>

                    <div className="mono" style={{ position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(11,30,26,0.75)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#EDF4F0', border: '1px solid rgba(255,255,255,0.06)', fontWeight: '600' }}>
                      You · Jay Patil
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '11.5px', color: '#7E978E', padding: '0 4px' }}>
                    <span>Camera: <b style={{ color: '#EDF4F0' }}>HD Webcam (Active)</b></span>
                    <span>Microphone: <b style={{ color: '#EDF4F0' }}>{speakingState === 'listening' ? 'Recording' : 'Muted'}</b></span>
                  </div>

                  <button 
                    className="btn primary" 
                    onClick={() => setShowCameraModal(false)} 
                    style={{ width: '100%', marginTop: '20px', height: '42px', fontSize: '13.5px', borderRadius: '10px' }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= SCREEN 9: ROUND COMPLETION INTERSTITIAL ================= */}
          {screen === 9 && (
            <div className="c-card" style={{ maxWidth: '580px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(46, 125, 91, 0.2)', border: '2.5px solid var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 20px auto' }}>
                <span style={{ fontSize: '28px', color: 'var(--ok)' }}>✓</span>
              </div>
              
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '26px', marginBottom: '8px' }}>Round Completed Successfully</h2>
              <p style={{ color: '#A9C0B8', fontSize: '14px', marginBottom: '24px' }}>
                Your responses for <b>Round {currentRoundIdx + 1}: {roundsList[currentRoundIdx]?.name || roundsList[currentRoundIdx]?.type_display || roundsList[currentRoundIdx]?.type?.toUpperCase()}</b> have been saved and compiled.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '28px' }}>
                <div>
                  <span className="mono" style={{ fontSize: '10px', display: 'block', color: '#7E978E' }}>ROUND</span>
                  <b style={{ fontSize: '13px' }}>Round {currentRoundIdx + 1}</b>
                </div>
                <div>
                  <span className="mono" style={{ fontSize: '10px', display: 'block', color: '#7E978E' }}>QUESTIONS</span>
                  <b style={{ fontSize: '13px' }}>{(roundsList[currentRoundIdx]?.questions?.length || 0)} answered</b>
                </div>
                <div>
                  <span className="mono" style={{ fontSize: '10px', display: 'block', color: '#7E978E' }}>INTEGRITY STATUS</span>
                  <b style={{ fontSize: '13px', color: 'var(--ok)' }}>Verified</b>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="btn primary" onClick={handleContinueNextRound}>
                  {currentRoundIdx < roundsList.length - 1 
                    ? `Continue to Round ${currentRoundIdx + 2} · ${roundsList[currentRoundIdx + 1]?.name || roundsList[currentRoundIdx + 1]?.type_display || roundsList[currentRoundIdx + 1]?.type?.toUpperCase()} →`
                    : "Submit Assessment ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 10: CASE STUDY ================= */}
          {screen === 10 && (
            <div className="c-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7E978E', marginBottom: '8px' }}>
                <span>Assessment Component: Case Analysis Study (Question {currentQuestionIdx + 1} of {roundsList[currentRoundIdx]?.questions?.length || 1})</span>
                <span className="mono">
                  {caseStudyStage === 'reading' ? (
                    isAudioPlaying ? (
                      <span style={{ color: '#4facfe', fontWeight: 'bold' }}>🔊 Aanya reading case study...</span>
                    ) : (
                      `Reading Time remaining: ${formatTime(caseReadingTimer)}`
                    )
                  ) : (
                    `Recording: ${formatTime(caseAnswerTimer)}`
                  )}
                </span>
              </div>
              <div className="progress-indicator">
                <div className="fill" style={{ 
                  width: caseStudyStage === 'reading' 
                    ? `${(caseReadingTimer / maxCaseReadingTime) * 100}%` 
                    : '100%',
                  backgroundColor: caseStudyStage === 'reading' ? 'var(--amber)' : 'var(--rec)'
                }}></div>
              </div>

              <div className="staged-grid">
                
                {/* Left column: Case brief */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', borderRadius: '14px' }}>
                    <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--amber)' }}>CASE STUDY SCENARIO</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '6px 0 10px 0' }}>{activeCaseData.title}</h4>
                    <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#EDF4F0', marginBottom: '14px', whiteSpace: 'pre-line' }}>
                      {activeCaseData.scenario}
                    </p>
                    
                    <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--amber)', display: 'block', marginTop: '14px' }}>SPECIFIC ASSIGNED TASK</span>
                    <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#A9C0B8', fontWeight: 500 }}>
                      {activeCaseData.task}
                    </p>
                  </div>
                </div>

                {/* Right column: camera / recorder */}
                <div>
                  <div className="camera-container">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ display: hasCameraPermission ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                    ></video>
                    {!hasCameraPermission && (
                      <div className="camera-placeholder">
                        <span style={{ fontSize: '32px' }}>📹</span>
                        <span>webcam stream offline</span>
                      </div>
                    )}
                    {caseStudyStage === 'answering' && (
                      <div className="pulse-rec">
                        <span className="dot"></span>
                        <span>REC ON-AIR</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                    {caseStudyStage === 'reading' ? (
                      <div>
                        <p style={{ fontSize: '12px', color: '#7E978E', marginBottom: '10px' }}>Review the brief. Your camera turns on automatically when reading timer reaches zero.</p>
                        <button className="btn primary amber sm" onClick={() => { setCaseStudyStage('answering'); setCaseAnswerTimer(0); }}>
                          Start Answer Now
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '12px', color: '#7E978E', marginBottom: '10px' }}>Your response is being recorded. Clicks finish when you have stated your investigation workflow.</p>


                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn ghost sm" 
                            style={{ color: '#fff' }} 
                            onClick={handleClearResponse} 
                            disabled={isTranscribing}
                          >
                            Clear Response
                          </button>
                          <button 
                            className="btn primary sm" 
                            style={{ backgroundColor: 'var(--rec)', color: '#fff' }} 
                            onClick={handleFinishCaseAnswer} 
                            disabled={isTranscribing}
                          >
                            {isTranscribing ? 'Finalizing your answer...' : 'Finish Answer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SCREEN 11: MCQ / KNOWLEDGE TEST ================= */}
          {screen === 11 && (
            <div className="mcq-grid">
              {/* Left Side: MCQ Card */}
              <div className="mcq-card">
                <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>PART 4: KNOWLEDGE TEST</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', color: '#fff', margin: 0 }}>Objective MCQ Screening</h3>
                  <span className="badge b-mute" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--muted)', borderRadius: '50%' }}></span>
                    Camera Offline
                  </span>
                </div>

                <div className="mcq-q">
                  {selectedMcqIdx + 1}. {activeMcqs[selectedMcqIdx]?.text}
                </div>

                <div className="opts">
                  {activeMcqs[selectedMcqIdx]?.options.map((opt, optIdx) => {
                    const qIdStr = String(activeMcqs[selectedMcqIdx].id);
                    const isSelected = mcqAnswers[qIdStr] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        className={`opt ${isSelected ? 'sel' : ''}`}
                        onClick={() => setMcqAnswers({ ...mcqAnswers, [qIdStr]: optIdx })}
                      >
                        <span className="key">{String.fromCharCode(65 + optIdx)}</span>
                        <span>{opt.text || opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mcq-nav">
                  <button
                    className={`flag-btn ${mcqFlagged[selectedMcqIdx] ? 'on' : ''}`}
                    onClick={() => setMcqFlagged({ ...mcqFlagged, [selectedMcqIdx]: !mcqFlagged[selectedMcqIdx] })}
                  >
                    {mcqFlagged[selectedMcqIdx] ? '★ Flagged' : 'Flag for review'}
                  </button>

                  <div style={{ flex: 1 }} />

                  <button
                    className="btn ghost"
                    disabled={selectedMcqIdx === 0}
                    onClick={() => setSelectedMcqIdx(prev => prev - 1)}
                  >
                    ← Prev
                  </button>

                  {selectedMcqIdx < activeMcqs.length - 1 ? (
                    <button
                      className="btn primary"
                      onClick={() => setSelectedMcqIdx(prev => prev + 1)}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      style={{ backgroundColor: 'var(--amber)', color: '#231a06', fontWeight: '600' }}
                      disabled={isSubmitting}
                      onClick={() => {
                        if (currentRoundIdx < roundsList.length - 1) {
                          setScreen(9);
                        } else {
                          handleFinalSubmission();
                        }
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Test ✓'}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Sidebar */}
              <div className="mcq-side">
                {/* Camera Card */}
                <div className="camera-card" style={{ background: '#121212', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px', position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  ></video>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
                    <span className="dot" style={{ background: 'var(--rec)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600, letterSpacing: '0.05em' }}>REC</span>
                  </div>
                </div>

                {/* Timer Card */}
                <div className="timer-card">
                  <div className="t">{formatTime(mcqTimer)}</div>
                  <small>Time Remaining</small>
                </div>

                {/* Palette Card */}
                <div className="palette">
                  <h4>Questions</h4>
                  <div className="pal-grid">
                    {activeMcqs.map((_, idx) => {
                      let isCurrent = idx === selectedMcqIdx;
                      let qIdStr = String(activeMcqs[idx].id);
                      let isAnswered = mcqAnswers[qIdStr] !== undefined;
                      let isFlagged = mcqFlagged[idx];

                      let palClass = "pal";
                      if (isCurrent) palClass += " cur";
                      if (isAnswered) palClass += " ans";
                      if (isFlagged) palClass += " flag";

                      return (
                        <button
                          key={idx}
                          className={palClass}
                          onClick={() => setSelectedMcqIdx(idx)}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="legend">
                    <span>
                      <i style={{ backgroundColor: '#1B4437', border: '1px solid #2E7D5B', width: '11px', height: '11px', borderRadius: '4px', display: 'inline-block' }}></i>
                      Answered ({Object.keys(mcqAnswers).length})
                    </span>
                    <span>
                      <i style={{ backgroundColor: '#0C211C', border: '1.5px solid #1F443C', width: '11px', height: '11px', borderRadius: '4px', display: 'inline-block' }}></i>
                      Not answered ({activeMcqs.length - Object.keys(mcqAnswers).length})
                    </span>
                    <span>
                      <i style={{ backgroundColor: '#0C211C', border: '1.5px solid #1F443C', width: '11px', height: '11px', borderRadius: '4px', display: 'inline-block', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--rec)' }}></span>
                      </i>
                      Flagged ({Object.keys(mcqFlagged).filter(k => mcqFlagged[k]).length})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SCREEN 12: COMPLETED / THANK-YOU ================= */}
          {screen === 12 && (
            <div className="c-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'rgba(46, 125, 91, 0.15)', border: '2.5px solid var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 24px auto' }}>
                <span style={{ fontSize: '32px', color: 'var(--ok)' }}>✓</span>
              </div>

              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '28px', marginBottom: '8px' }}>Interview Submitted Successfully</h2>
              <p style={{ color: '#A9C0B8', fontSize: '14.5px', marginBottom: '32px', lineHeight: 1.5 }}>
                Thank you for completing the Hirelens screening assessment. Your recordings, transcribing, and question parameters have been compiled and sent to the employer.
              </p>

              {/* Summary Block */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
                <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#7E978E', display: 'block', marginBottom: '14px' }}>SUBMISSION SUMMARY</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#7E978E', display: 'block' }}>Candidate Name</span>
                    <b style={{ color: '#EDF4F0' }}>{candidateData ? candidateData.name : 'N/A'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#7E978E', display: 'block' }}>Candidate ID</span>
                    <b style={{ color: '#EDF4F0', fontFamily: 'var(--font-m)' }}>{candidateId || 'N/A'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#7E978E', display: 'block' }}>Job Opening</span>
                    <b style={{ color: '#EDF4F0' }}>{openingData ? openingData.title : 'N/A'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#7E978E', display: 'block' }}>Reference Code</span>
                    <b style={{ color: '#EDF4F0', fontFamily: 'var(--font-m)' }}>{candRefCode || 'N/A'}</b>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#7E978E', display: 'block' }}>Submission Timestamp</span>
                    <b style={{ color: '#EDF4F0', fontFamily: 'var(--font-m)' }}>{submissionTimestamp || new Date().toISOString()}</b>
                  </div>
                </div>
              </div>

              {/* Next Steps Card */}
              <div style={{ border: '1.5px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Next Steps in the Recruitment Cycle</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: '#A9C0B8' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 'bold' }}>1.</span>
                    <span>The recruitment panel at {openingData?.tenant_name || 'Kulkarni Mehta & Associates LLP'} will review your video transcript answers and scorecard metrics.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 'bold' }}>2.</span>
                    <span>You will receive an automated feedback update email notifying you of your assessment completion status.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 'bold' }}>3.</span>
                    <span>If shortlisted, a hiring manager will contact you directly to schedule the partner discussion panel interview.</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="btn primary" onClick={handleClosePortal}>
                  Close Window &amp; Exit Portal
                </button>
              </div>
            </div>
          )}

        </main>
      </div>


      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="toast" id="toast">
        <span className="tdot"></span>
        <span id="toastTxt"></span>
      </div>

      {/* Expired Link Modal */}
      {showExpiredModal && (
        <div style={{ display: 'grid', position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', placeItems: 'center', zIndex: 1000 }}>
          <div className="c-card" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px', margin: '0 20px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--line-soft)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--red-soft)', color: 'var(--red)', display: 'grid', placeItems: 'center', margin: '0 auto 16px auto', fontSize: '28px', border: '4px solid #fff' }}>
              ✕
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)', marginBottom: '12px' }}>Link Expired</h3>
            <p style={{ fontSize: '14.5px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '24px' }}>
              {expiredMessage || "Your interview invitation link has expired. Please contact the employer for a new link."}
            </p>
            <button className="btn primary" onClick={() => setShowExpiredModal(false)} style={{ width: '100%', height: '44px', fontSize: '15px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Toast Helper inside component scope
let toastTimeout = null;
const triggerToast = (msg, isError = false) => {
  const toastEl = document.getElementById("toast");
  const textEl = document.getElementById("toastTxt");
  if (toastEl && textEl) {
    toastEl.classList.remove("show");
    void toastEl.offsetWidth; // Force layout recalculation to restart CSS transition
    
    if (isError) {
      toastEl.classList.add("error");
      if (typeof msg === 'object') {
        textEl.innerHTML = `<strong>${msg.bold}</strong> ${msg.normal}`;
      } else {
        textEl.textContent = msg;
      }
    } else {
      toastEl.classList.remove("error");
      if (typeof msg === 'object') {
        textEl.textContent = `${msg.bold} ${msg.normal}`;
      } else {
        textEl.textContent = msg;
      }
    }
    
    toastEl.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 5000);
  }
};

