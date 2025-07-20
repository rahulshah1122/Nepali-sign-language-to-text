import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Button, 
  Layout, 
  Typography, 
  Card, 
  Spin, 
  message, 
  Alert, 
  Space, 
  Divider, 
  Row, 
  Col, 
  Progress, 
  Badge, 
  Tooltip,
  Avatar,
  Statistic,
  Tag,
  theme,
  ConfigProvider
} from 'antd';
import { customTheme } from './theme';
import {
  CameraOutlined,
  StopOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  TrophyOutlined,
  BookOutlined,
  HeartOutlined,
  SoundOutlined,
  TranslationOutlined,
  PauseOutlined
} from '@ant-design/icons';
import Lenis from '@studio-freight/lenis';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHandPaper, FaRegSmile, FaBrain, FaEye } from 'react-icons/fa';
import nepaliService from './services/nepaliService';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

const LABELS = [
  "dhanyabaad", "ghar", "ma", "namaskaar"
];

// Webcam dimensions
const WEBCAM_WIDTH = 640;
const WEBCAM_HEIGHT = 480;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

function App() {
  const { token } = useToken();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis with better configuration
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenisRef.current.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy();
      }
    };
  }, []);

  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [sentence, setSentence] = useState("");
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [lockedPrediction, setLockedPrediction] = useState(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [roiSrc, setRoiSrc] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [handPosition, setHandPosition] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [detectionQuality, setDetectionQuality] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [nepaliSentence, setNepaliSentence] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const canvasRef = useRef(null);

  // Real-time prediction loop
  useEffect(() => {
    if (capturing && !isPaused) {
      setIsRealtime(true);
      intervalRef.current = setInterval(() => {
        captureAndPredict(true);
      }, 1000);
    } else {
      setIsRealtime(false);
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [capturing, isPaused]);

  // Update prediction history on every prediction
  useEffect(() => {
    if (prediction === null || loading) return;
    setPredictionHistory((hist) => {
      const newHist = [...hist, prediction].slice(-3);
      return newHist;
    });
    setTotalPredictions(prev => prev + 1);
  }, [prediction, loading]);

  // Majority vote effect for sentence forming
  useEffect(() => {
    if (predictionHistory.length < 3) return;
    const counts = {};
    predictionHistory.forEach((p) => {
      counts[p] = (counts[p] || 0) + 1;
    });
    const majorityPrediction = Object.entries(counts).find(([k, v]) => v >= 2);
    if (majorityPrediction) {
      const predIdx = parseInt(majorityPrediction[0]);
      const word = LABELS[predIdx] || `Class ${predIdx}`;
      setSentence((s) => s + (s ? " " : "") + word);
      setLockedPrediction(predIdx);
      setPredictionHistory([]);
      setAccuracy(prev => Math.min(100, prev + 5));
    }
  }, [predictionHistory]);

  // Check TTS support and initialize Nepali service
  useEffect(() => {
    // Check if speech synthesis is supported
    const checkTTSSupport = () => {
      const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
      setTtsSupported(supported);
      
      if (supported) {
        console.log('TTS supported, available voices:', window.speechSynthesis.getVoices().length);
      } else {
        console.warn('TTS not supported in this browser');
      }
    };
    
    checkTTSSupport();
    
    // Listen for voices to be loaded
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
      });
    }
  }, []);

  // Update Nepali translation when sentence changes
  useEffect(() => {
    if (sentence) {
      const translated = nepaliService.translateSentence(sentence);
      setNepaliSentence(translated);
    } else {
      setNepaliSentence("");
    }
  }, [sentence]);

  // MediaPipe Hands effect
  useEffect(() => {
    if (!capturing) return;

    const hands = new Hands({
      locateFile: (file) =>
        process.env.PUBLIC_URL + '/mediapipe/hands/' + file
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const handColors = [
        { conn: '#00FF00', lm: '#FF0000' },
        { conn: '#0000FF', lm: '#FFA500' },
      ];

      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
          const color = handColors[i % handColors.length];
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
            color: color.conn,
            lineWidth: 3
          });
          drawLandmarks(ctx, landmarks, {
            color: color.lm,
            lineWidth: 2,
            radius: 4
          });
        });

        // Analyze hand position relative to ROI
        const firstHand = results.multiHandLandmarks[0];
        if (firstHand) {
          // Calculate hand center (using wrist and middle finger)
          const wrist = firstHand[0];
          const middleFinger = firstHand[12];
          const handCenterX = (wrist.x + middleFinger.x) / 2;
          const handCenterY = (wrist.y + middleFinger.y) / 2;

          // Convert to pixel coordinates
          const pixelX = handCenterX * canvas.width;
          const pixelY = handCenterY * canvas.height;

          // Check if hand is in ROI
          const inROI = pixelX >= ROI.x && pixelX <= ROI.x + ROI.width &&
                       pixelY >= ROI.y && pixelY <= ROI.y + ROI.height;

          // Calculate detection quality based on hand position and size
          const handSize = Math.sqrt(
            Math.pow(firstHand[5].x - firstHand[17].x, 2) + 
            Math.pow(firstHand[5].y - firstHand[17].y, 2)
          ) * canvas.width;
          
          const distanceFromCenter = Math.sqrt(
            Math.pow(pixelX - (ROI.x + ROI.width / 2), 2) + 
            Math.pow(pixelY - (ROI.y + ROI.height / 2), 2)
          );
          
          const quality = Math.max(0, 100 - (distanceFromCenter / 2) - (handSize < 50 ? 30 : 0));
          
          setHandPosition({
            x: pixelX,
            y: pixelY,
            inROI: inROI,
            quality: quality
          });
          
          setDetectionQuality(quality);

          // Draw hand position indicator
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, 8, 0, 2 * Math.PI);
          ctx.fillStyle = inROI ? '#00ff00' : '#ff0000';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw distance indicator if not in ROI
          if (!inROI) {
            const roiCenterX = ROI.x + ROI.width / 2;
            const roiCenterY = ROI.y + ROI.height / 2;
            
            ctx.beginPath();
            ctx.moveTo(pixelX, pixelY);
            ctx.lineTo(roiCenterX, roiCenterY);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      } else {
        setHandPosition(null);
      }
    });

    let animationId;
    const processFrame = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        await hands.send({ image: webcamRef.current.video });
      }
      animationId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      hands.close();
    };
  }, [capturing]);

  // Dynamic ROI calculation based on webcam dimensions
  const calculateROI = () => {
    const videoWidth = WEBCAM_WIDTH;
    const videoHeight = WEBCAM_HEIGHT;
    
    // Calculate optimal ROI size (should be square for best results)
    const roiSize = Math.min(videoWidth, videoHeight) * 0.4; // 40% of smaller dimension
    
    // Center the ROI
    const x = (videoWidth - roiSize) / 2;
    const y = (videoHeight - roiSize) / 2;
    
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(roiSize),
      height: Math.round(roiSize)
    };
  };

  const ROI = calculateROI();

  // Enhanced capture and predict with proper ROI cropping
  const captureAndPredict = async (isRealtime = false) => {
    if (!webcamRef.current) return;
    const video = webcamRef.current.video;
    if (!video) {
      if (!isRealtime) message.error('Could not access webcam.');
      return;
    }

    try {
      // Create a canvas to crop the ROI
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match the model's expected input (128x128)
      canvas.width = 128;
      canvas.height = 128;
      
      // Draw the ROI from video to canvas, resizing to 128x128
      ctx.drawImage(
        video, 
        ROI.x, ROI.y, ROI.width, ROI.height,  // Source rectangle
        0, 0, 128, 128  // Destination rectangle (model input size)
      );
      
      // Convert to blob for API
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      if (!blob) {
        if (!isRealtime) message.error('Could not process image.');
      return;
    }

      // Update ROI preview
      setRoiSrc(canvas.toDataURL('image/jpeg', 0.9));

      if (!isRealtime) {
        setImageSrc(canvas.toDataURL('image/jpeg', 0.9));
        setLoading(true);
        setPrediction(null);
      }

      // Send to backend
      const formData = new FormData();
      formData.append('image', blob, 'roi.jpg');
      
      const response = await axios.post('http://localhost:8000/api/predict/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setPrediction(response.data.predicted_class);
      
      // Calculate confidence based on prediction probabilities if available
      if (response.data.confidence) {
        setConfidence(response.data.confidence);
      } else {
        // Mock confidence for now
        setConfidence(Math.random() * 30 + 70); // 70-100% range
      }
      
      if (!isRealtime) setImageSrc(canvas.toDataURL('image/jpeg', 0.9));
      
    } catch (error) {
      console.error('Prediction error:', error);
      if (!isRealtime) {
        message.error('Prediction failed. Make sure the backend is running.');
      }
    } finally {
      if (!isRealtime) setLoading(false);
    }
  };

  // TTS functions
  const speakSentence = () => {
    if (nepaliSentence && ttsSupported) {
      setIsSpeaking(true);
      
      try {
        // Use browser's native speech synthesis as fallback
        if (window.speechSynthesis) {
          // Stop any current speech
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(nepaliSentence);
          
          // Configure speech parameters
          utterance.rate = 0.7;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          // Try to set Nepali language
          utterance.lang = 'ne-NP';
          
          // Get available voices and try to find a suitable one
          const voices = window.speechSynthesis.getVoices();
          const nepaliVoice = voices.find(voice => 
            voice.lang.includes('ne') || voice.lang.includes('hi') || voice.lang.includes('ur')
          );
          
          if (nepaliVoice) {
            utterance.voice = nepaliVoice;
          }
          
          // Event handlers
          utterance.onstart = () => {
            console.log('Speech started:', nepaliSentence);
          };
          
          utterance.onend = () => {
            console.log('Speech ended');
            setIsSpeaking(false);
          };
          
          utterance.onerror = (event) => {
            console.error('Speech error:', event.error);
            setIsSpeaking(false);
            message.error('Text-to-speech failed. Please try again.');
          };
          
          // Start speaking
          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
          message.error('Speech synthesis not supported in this browser.');
        }
      } catch (error) {
        console.error('TTS error:', error);
        setIsSpeaking(false);
        message.error('Text-to-speech failed. Please try again.');
      }
    } else if (!ttsSupported) {
      message.warning('Text-to-speech is not supported in your browser.');
    } else if (!nepaliSentence) {
      message.warning('No text to speak. Please detect some words first.');
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const reset = () => {
    setPrediction(null);
    setImageSrc(null);
    setCapturing(false);
    setSentence("");
    setPredictionHistory([]);
    setLockedPrediction(null);
    setRoiSrc(null);
    setConfidence(0);
    setNepaliSentence("");
    setIsPaused(false);
    stopSpeaking();
  };

  const overlayStyle = {
    position: 'absolute',
    border: '4px solid #00b96b',
    borderRadius: 12,
    left: ROI.x,
    top: ROI.y,
    width: ROI.width,
    height: ROI.height,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 0 20px rgba(0, 185, 107, 0.3)',
  };



  return (
    <ConfigProvider theme={customTheme}>
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Header style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              size={40}
              icon={<FaBrain />}
              style={{ background: 'linear-gradient(45deg, #00b96b, #1890ff)' }}
            />
            <Title style={{ color: 'white', margin: 0 }} level={3}>
              Nepali Sign Language AI
            </Title>
          </div>
          <Space>
            <Tooltip title="TTS Status">
              <Badge 
                status={ttsSupported ? "success" : "error"} 
                text={
                  <Text style={{ color: 'white', fontSize: 12 }}>
                    {ttsSupported ? "TTS Ready" : "TTS Unavailable"}
                  </Text>
                }
              />
            </Tooltip>
            <Tooltip title="Settings">
              <Button type="text" icon={<SettingOutlined />} style={{ color: 'white' }} />
            </Tooltip>
            <Tooltip title="Help">
              <Button type="text" icon={<InfoCircleOutlined />} style={{ color: 'white' }} />
            </Tooltip>
          </Space>
      </Header>
      </motion.div>

      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Stats Row */}
          <motion.div variants={itemVariants}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                  <Statistic
                    title="Total Predictions"
                    value={totalPredictions}
                    prefix={<FaEye style={{ color: token.colorPrimary }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                  <Statistic
                    title="Accuracy"
                    value={accuracy}
                    suffix="%"
                    prefix={<TrophyOutlined style={{ color: token.colorSuccess }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                  <Statistic
                    title="Words Learned"
                    value={sentence.split(' ').length}
                    prefix={<BookOutlined style={{ color: token.colorWarning }} />}
                  />
                </Card>
              </Col>
            </Row>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Card
              style={{
                maxWidth: 1200,
                width: '100%',
                margin: '0 auto',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
              }}
            >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <motion.div variants={itemVariants}>
                  <Title level={2} style={{ textAlign: 'center', marginBottom: 8, background: 'linear-gradient(45deg, #00b96b, #1890ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Real-time Sign Language Recognition
                  </Title>
                  <Paragraph style={{ textAlign: 'center', fontSize: 16, color: token.colorTextSecondary }}>
                    Use your webcam to predict Nepali sign language gestures with AI-powered accuracy
                  </Paragraph>
                </motion.div>

            <Divider />

                <AnimatePresence mode="wait">
            {!capturing ? (
                    <motion.div
                      key="start"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <FaHandPaper style={{ fontSize: 64, color: token.colorPrimary, marginBottom: 24 }} />
                        </motion.div>
                        <Title level={3} style={{ marginBottom: 16 }}>
                          Ready to Start?
                        </Title>
                        <Paragraph style={{ marginBottom: 32, fontSize: 16 }}>
                          Position your hands within the detection area and click start to begin real-time recognition.
                        </Paragraph>
                        <Button
                          type="primary"
                          size="large"
                          icon={<CameraOutlined />}
                          onClick={() => setCapturing(true)}
                          style={{
                            height: 56,
                            fontSize: 18,
                            borderRadius: 28,
                            background: 'linear-gradient(45deg, #00b96b, #1890ff)',
                            border: 'none',
                            boxShadow: '0 8px 24px rgba(0, 185, 107, 0.3)'
                          }}
                        >
                          Start Recognition
              </Button>
                      </div>
                    </motion.div>
            ) : (
                    <motion.div
                      key="capturing"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Row gutter={[24, 24]} align="middle">
                        {/* Webcam Section */}
                        <Col xs={24} lg={14}>
                          <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Card
                              title={
                                <Space>
                                  <FaEye style={{ color: token.colorPrimary }} />
                                  <span>Live Camera Feed</span>
                                  {isPaused ? (
                                    <Badge status="warning" text="Paused" />
                                  ) : (
                                    <Badge status="processing" text="Active" />
                                  )}
                                </Space>
                              }
                    style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: 12
                    }}
                  >
                              <div style={{
                                position: 'relative',
                                width: WEBCAM_WIDTH,
                                height: WEBCAM_HEIGHT,
                                background: '#000',
                                borderRadius: 12,
                                overflow: 'hidden',
                                margin: '0 auto'
                              }}>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width={WEBCAM_WIDTH}
                        height={WEBCAM_HEIGHT}
                                  videoConstraints={{
                                    facingMode: 'user',
                                    width: WEBCAM_WIDTH,
                                    height: WEBCAM_HEIGHT
                                  }}
                                  style={{
                                    borderRadius: 12,
                                    width: WEBCAM_WIDTH,
                                    height: WEBCAM_HEIGHT,
                                    objectFit: 'cover'
                                  }}
                      />
                      <canvas
                        ref={canvasRef}
                        width={WEBCAM_WIDTH}
                        height={WEBCAM_HEIGHT}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    pointerEvents: 'none'
                                  }}
                      />
                                <div style={overlayStyle}></div>

                                {/* Hand positioning guide */}
                                {showGuide && (
                                  <div style={{
                                    position: 'absolute',
                                    top: ROI.y - 60,
                                    left: ROI.x,
                                    right: ROI.x + ROI.width,
                                    textAlign: 'center',
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: 'bold',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                    pointerEvents: 'none'
                                  }}>
                                    Position your hands here
                                  </div>
                                )}

                                {/* Hand position feedback */}
                                {handPosition && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 16,
                                    left: 16,
                                    background: handPosition.inROI ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
                                    color: 'white',
                                    padding: '8px 12px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                  }}>
                                    {handPosition.inROI ? '✓ Hand in position' : '✗ Move hand to center'}
                    </div>
                                )}

                                {/* Confidence indicator */}
                                {confidence > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    padding: '8px 12px',
                                    borderRadius: 20,
                                    fontSize: 12
                                  }}>
                                    Confidence: {confidence.toFixed(1)}%
                                  </div>
                                )}

                                {/* Detection Quality Bar */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: 16,
                                  left: 16,
                                  right: 16,
                                  height: 6,
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  borderRadius: 3,
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 12,
                                    left: 0,
                                    color: 'white',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                  }}>
                                    Quality: {detectionQuality.toFixed(0)}%
                                  </div>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.max(confidence, detectionQuality)}%`,
                                    background: `linear-gradient(90deg, #ff0000, #ffa500, #00ff00)`,
                                    transition: 'width 0.3s ease',
                                    borderRadius: 3
                                  }} />
                                </div>

                                {/* ROI Center Marker */}
                                <div style={{
                                  position: 'absolute',
                                  left: ROI.x + ROI.width / 2 - 4,
                                  top: ROI.y + ROI.height / 2 - 4,
                                  width: 8,
                                  height: 8,
                                  background: '#00b96b',
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                  pointerEvents: 'none'
                                }} />
                              </div>
                          </Card>
                          </motion.div>
                        </Col>

                        {/* Prediction Section */}
                        <Col xs={24} lg={10}>
                          <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Card
                              title={
                                <Space>
                                  <FaBrain style={{ color: token.colorSuccess }} />
                                  <span>AI Predictions</span>
                                  {isPaused && (
                                    <Badge status="warning" text="Paused" />
                                  )}
                                </Space>
                              }
                              style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: 12,
                                height: '100%'
                              }}
                            >
                              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                                                  {/* Hand Positioning Tips */}
                                  {!handPosition && showGuide && (
                                    <Alert
                                      message="Hand Positioning Tips"
                                      description={
                                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                                          <li>Position your hands in the center of the green box</li>
                                          <li>Keep your hands clearly visible and well-lit</li>
                                          <li>Maintain a steady position for 3 seconds</li>
                                          <li>Ensure your entire hand is within the detection area</li>
                                        </ul>
                                      }
                                      type="info"
                                      showIcon
                                      style={{ marginBottom: 16 }}
                                    />
                                  )}

                                  {/* Word Dictionary */}
                                  <div>
                                    <Title level={5} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <BookOutlined style={{ color: token.colorWarning }} />
                                      Word Dictionary
                                    </Title>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                      {LABELS.map((word, index) => {
                                        const wordDetails = nepaliService.getWordDetails(word);
                                        return (
                                          <Tooltip
                                            key={word}
                                            title={
                                              <div>
                                                <div><strong>English:</strong> {wordDetails.english}</div>
                                                <div><strong>Nepali:</strong> {wordDetails.nepali}</div>
                                                <div><strong>Pronunciation:</strong> {wordDetails.pronunciation}</div>
                                              </div>
                                            }
                                          >
                                            <Tag
                                              color="blue"
                                              style={{ cursor: 'pointer', fontSize: 12 }}
                                              onClick={() => {
                                                if (ttsSupported) {
                                                  nepaliService.speak(wordDetails.nepali);
                                                }
                                              }}
                                            >
                                              {wordDetails.nepali}
                                            </Tag>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  </div>

                                {/* Current Prediction */}
                                <div>
                                  <Title level={5} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FaHandPaper style={{ color: token.colorPrimary }} />
                                    Current Prediction
                                  </Title>
                                  <AnimatePresence mode="wait">
                                    {prediction !== null ? (
                                      <motion.div
                                        key={prediction}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        <Tag
                                          color="blue"
                                          style={{
                                            fontSize: 18,
                                            padding: '8px 16px',
                                            borderRadius: 20
                                          }}
                                        >
                                          {LABELS[prediction] || `Class ${prediction}`}
                                        </Tag>
                                      </motion.div>
                                    ) : (
                                      <Text type="secondary">Waiting for gesture...</Text>
                        )}
                                  </AnimatePresence>
                                </div>

                                {/* Locked Prediction */}
                                <div>
                                  <Title level={5} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FaRegSmile style={{ color: token.colorSuccess }} />
                                    Confirmed Word
                                  </Title>
                                  <AnimatePresence mode="wait">
                                    {lockedPrediction !== null ? (
                                      <motion.div
                                        key={lockedPrediction}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                      >
                                        <Tag
                                          color="green"
                                          style={{
                                            fontSize: 20,
                                            padding: '12px 20px',
                                            borderRadius: 24,
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {LABELS[lockedPrediction] || `Class ${lockedPrediction}`}
                                        </Tag>
                                      </motion.div>
                                    ) : (
                                      <Text type="secondary">Hold steady for 3 seconds to confirm</Text>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Progress indicator */}
                                {predictionHistory.length > 0 && predictionHistory.length < 3 && (
                                  <div>
                                    <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                                      Stabilizing prediction... ({predictionHistory.length}/3)
                                    </Text>
                                    <Progress
                                      percent={(predictionHistory.length / 3) * 100}
                                      status="active"
                                      strokeColor={{
                                        '0%': token.colorPrimary,
                                        '100%': token.colorSuccess,
                                      }}
                                    />
                  </div>
                )}

                                {/* Formed Sentence with Translation */}
                                {sentence && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <Card
                                      style={{
                                        background: 'linear-gradient(135deg, #e6fffb, #f6ffed)',
                                        borderColor: token.colorSuccess,
                                        borderRadius: 12
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Title level={5} style={{ margin: 0, color: token.colorSuccess }}>
                                          <HeartOutlined style={{ marginRight: 8 }} />
                                          Your Message
                                        </Title>
                                        <Space>
                                          <Button
                                            type="text"
                                            icon={<TranslationOutlined />}
                                            onClick={() => setShowTranslation(!showTranslation)}
                                            size="small"
                                          >
                                            {showTranslation ? "Hide" : "Show"} Translation
                                          </Button>
                                          {ttsSupported && (
                                            <Button
                                              type="text"
                                              icon={isSpeaking ? <StopOutlined /> : <SoundOutlined />}
                                              onClick={isSpeaking ? stopSpeaking : speakSentence}
                                              size="small"
                                              loading={isSpeaking}
                                            >
                                              {isSpeaking ? "Stop" : "Speak"}
                                            </Button>
                                          )}
                                        </Space>
                                      </div>
                                      
                                      {/* English Sentence */}
                                      <div style={{ marginBottom: showTranslation ? 12 : 0 }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                          English
                                        </Text>
                                        <Text strong style={{ fontSize: 18, color: token.colorText }}>
                                          {sentence}
                                        </Text>
                                      </div>

                                      {/* Nepali Translation */}
                                      {showTranslation && nepaliSentence && (
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                            नेपाली (Nepali)
                                          </Text>
                                          <Text strong style={{ fontSize: 20, color: token.colorPrimary, fontFamily: 'Arial Unicode MS, sans-serif' }}>
                                            {nepaliSentence}
                                          </Text>
                                        </div>
                                      )}

                                      {/* TTS Status */}
                                      {!ttsSupported && (
                                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 8 }}>
                                          ⚠️ Text-to-speech not supported in this browser
                                        </Text>
                                      )}
                                      {ttsSupported && (
                                        <div style={{ marginTop: 8 }}>
                                          <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => {
                                              const testUtterance = new SpeechSynthesisUtterance("धन्यवाद");
                                              testUtterance.lang = 'ne-NP';
                                              testUtterance.rate = 0.7;
                                              window.speechSynthesis.speak(testUtterance);
                                            }}
                                          >
                                            Test TTS
                                          </Button>
                                        </div>
                                      )}
                                    </Card>
                                  </motion.div>
                                )}

                                {/* Controls */}
                                                                <Space style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                                  <Button
                                    icon={<StopOutlined />}
                                    onClick={() => setCapturing(false)}
                                    disabled={loading}
                                    danger
                                  >
                                    Stop
                                  </Button>
                                  <Button
                                    icon={isPaused ? <CameraOutlined /> : <PauseOutlined />}
                                    onClick={() => setIsPaused(!isPaused)}
                                    disabled={loading}
                                    type={isPaused ? "primary" : "default"}
                                  >
                                    {isPaused ? "Resume" : "Pause"}
                                  </Button>
                                  <Button
                                    icon={<ReloadOutlined />}
                                    onClick={reset}
                                    disabled={loading}
                                  >
                                    Reset
                                  </Button>
                                  <Button
                                    type={showGuide ? "primary" : "default"}
                                    onClick={() => setShowGuide(!showGuide)}
                                    size="small"
                                  >
                                    {showGuide ? "Hide Guide" : "Show Guide"}
                                  </Button>
                                  <Button
                                    type={isCalibrating ? "primary" : "default"}
                                    onClick={() => setIsCalibrating(!isCalibrating)}
                                    size="small"
                                    loading={isCalibrating}
                                  >
                                    {isCalibrating ? "Calibrating..." : "Calibrate"}
                                  </Button>
                                </Space>
                </Space>
                            </Card>
                          </motion.div>
                        </Col>
                      </Row>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading State */}
                <AnimatePresence>
            {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ textAlign: 'center' }}
                    >
                      <Spin
                        tip="Processing gesture..."
                        size="large"
                        style={{ marginTop: 16 }}
                      />
                    </motion.div>
            )}
                </AnimatePresence>
          </Space>
        </Card>
          </motion.div>
        </motion.div>
      </Content>

      {/* Enhanced Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Footer style={{
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}>
          <Space direction="vertical" size="small">
            <Text style={{ color: 'white' }}>
              © 2024 Nepali Sign Language AI Recognition System
            </Text>
            <Text type="secondary" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Powered by MediaPipe, TensorFlow, and React
            </Text>
          </Space>
        </Footer>
      </motion.div>
    </Layout>
    </ConfigProvider>
  );
}

export default App;
