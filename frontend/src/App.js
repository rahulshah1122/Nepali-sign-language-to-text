import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button, Layout, Typography, Card, Spin, message, Alert, Space, Divider } from 'antd';
import { CameraOutlined, StopOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Lenis from '@studio-freight/lenis';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { motion } from 'framer-motion';
import { FaHandPaper, FaRegSmile } from 'react-icons/fa';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const LABELS = [
  "dhanyabaad", "ghar", "ma", "namaskaar"
];

function App() {
  useEffect(() => {
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
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
  const canvasRef = useRef(null);

  // Real-time prediction loop
  useEffect(() => {
    if (capturing) {
      setIsRealtime(true);
      intervalRef.current = setInterval(() => {
        captureAndPredict(true);
      }, 1000); // 1 second interval
    } else {
      setIsRealtime(false);
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [capturing]);

  // Update prediction history on every prediction
  useEffect(() => {
    if (prediction === null || loading) return;
    setPredictionHistory((hist) => {
      const newHist = [...hist, prediction].slice(-3); // keep last 3
      return newHist;
    });
  }, [prediction, loading]);

  // Only keep the majority-vote effect for sentence forming:
  useEffect(() => {
    console.log('Prediction history:', predictionHistory);
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
      setPredictionHistory([]); // reset after adding word
    }
  }, [predictionHistory]);

  // Add a debug log for every sentence update
  useEffect(() => {
    console.log('Current sentence:', sentence);
  }, [sentence]);

  // MediaPipe Hands effect
  useEffect(() => {
    if (!capturing) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2, // Track up to 2 hands
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw landmarks for each hand with different colors
      const handColors = [
        { conn: '#00FF00', lm: '#FF0000' }, // Hand 1: green lines, red points
        { conn: '#0000FF', lm: '#FFA500' }, // Hand 2: blue lines, orange points
      ];
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
          const color = handColors[i % handColors.length];
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, { color: color.conn, lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: color.lm, lineWidth: 1 });
        });
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

  const ROI = { x: 100, y: 30, width: 200, height: 200 };

  const captureAndPredict = async (isRealtime = false) => {
    if (!webcamRef.current) return;
    const video = webcamRef.current.video;
    if (video) {
      // Draw ROI from video to canvas
      const canvas = document.createElement('canvas');
      canvas.width = ROI.width;
      canvas.height = ROI.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, ROI.x, ROI.y, ROI.width, ROI.height, 0, 0, ROI.width, ROI.height);
      setRoiSrc(canvas.toDataURL('image/jpeg'));
    }
    const imgSrc = webcamRef.current.getScreenshot();
    if (!imgSrc) {
      if (!isRealtime) message.error('Could not capture image from webcam.');
      return;
    }
    if (!isRealtime) setImageSrc(imgSrc);
    if (!isRealtime) setLoading(true);
    if (!isRealtime) setPrediction(null);
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('image', blob, 'webcam.jpg');
      const response = await axios.post('http://localhost:8000/api/predict/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPrediction(response.data.predicted_class);
      if (!isRealtime) setImageSrc(imgSrc);
    } catch (error) {
      if (!isRealtime) message.error('Prediction failed. Make sure the backend is running.');
    } finally {
      if (!isRealtime) setLoading(false);
    }
  };

  const reset = () => {
    setPrediction(null);
    setImageSrc(null);
    setCapturing(false);
    setSentence("");
    setPredictionHistory([]);
    setLockedPrediction(null); // Only reset here
    setRoiSrc(null);
  };

  // Add a rectangle overlay style
  const overlayStyle = {
    position: 'absolute',
    border: '3px solid #00ff00',
    borderRadius: 8,
    left: 100,
    top: 30,
    width: 200,
    height: 200,
    pointerEvents: 'none',
    boxSizing: 'border-box',
  };

  // Update webcam/canvas size
  const WEBCAM_WIDTH = 640;
  const WEBCAM_HEIGHT = 480;

  const webcamElement = useMemo(() => (
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16, maxWidth: 400 }}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        videoConstraints={{ facingMode: 'user' }}
        style={{ borderRadius: 8, maxWidth: '100%' }}
      />
      <div style={overlayStyle}></div>
    </div>
  ), [capturing]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', display: 'flex', alignItems: 'center' }}>
        <Title style={{ color: 'white', margin: 0, flex: 1 }} level={3}>Sign Language Predictor</Title>
        <InfoCircleOutlined style={{ color: 'white', fontSize: 24, marginLeft: 16 }} />
      </Header>
      <Content style={{ padding: '32px 8px', minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Card style={{ maxWidth: 480, width: '100%', margin: '0 auto', textAlign: 'center', boxShadow: '0 2px 8px #f0f1f2' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={4} style={{ marginBottom: 0 }}>Nepali Sign Language Recognition</Title>
            <Text type="secondary">Use your webcam to predict hand gestures in real time.</Text>
            <Divider />
            {!capturing ? (
              <Button type="primary" size="large" icon={<CameraOutlined />} onClick={() => setCapturing(true)} block>
                Start Webcam
              </Button>
            ) : (
              <>
                {capturing && (
                  <div
                    className="webcam-prediction-row"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 32,
                      width: '100%',
                      maxWidth: 1100,
                      margin: '0 auto 32px auto',
                      justifyContent: 'center',
                      flexWrap: 'nowrap', // Always side by side on desktop
                    }}
                  >
                    <div style={{ position: 'relative', width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT, background: '#222', borderRadius: 12, boxShadow: '0 4px 24px #0002', flex: '0 0 auto' }}>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width={WEBCAM_WIDTH}
                        height={WEBCAM_HEIGHT}
                        videoConstraints={{ facingMode: 'user', width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT }}
                        style={{ borderRadius: 12, width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT, objectFit: 'cover', position: 'absolute', left: 0, top: 0 }}
                      />
                      <canvas
                        ref={canvasRef}
                        width={WEBCAM_WIDTH}
                        height={WEBCAM_HEIGHT}
                        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
                      />
                      <div style={{ ...overlayStyle, borderWidth: 4, borderColor: '#00b96b' }}></div>
                    </div>
                    <Card style={{ minWidth: 320, maxWidth: 400, borderRadius: 12, boxShadow: '0 4px 24px #0001', background: '#f8fafc', flex: '1 1 320px' }}>
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Title level={4} style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaHandPaper style={{ color: '#00b96b' }} /> Live Prediction
                        </Title>
                        {prediction !== null && (
                          <Text strong style={{ fontSize: 28, color: '#00b96b' }}>{LABELS[prediction] || `Class ${prediction}`}</Text>
                        )}
                        <Title level={5} style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaRegSmile style={{ color: '#1890ff' }} /> Locked Prediction
                        </Title>
                        {lockedPrediction !== null && (
                          <Text strong style={{ fontSize: 24, color: '#1890ff' }}>{LABELS[lockedPrediction] || `Class ${lockedPrediction}`}</Text>
                        )}
                        {sentence && (
                          <Card style={{ background: '#e6fffb', borderColor: '#1890ff', borderRadius: 8 }}>
                            <Title level={5} style={{ marginBottom: 0, color: '#1890ff' }}>Formed Sentence</Title>
                            <Text strong style={{ fontSize: 20 }}>{sentence}</Text>
                          </Card>
                        )}
                        {lockedPrediction === null && predictionHistory.length > 0 && predictionHistory.length < 3 && (
                          <Alert
                            message="Hold steady..."
                            description="Keep your gesture steady for 3 seconds to lock the word."
                            type="info"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )}
                      </Space>
                    </Card>
                  </div>
                )}
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button icon={<StopOutlined />} onClick={() => setCapturing(false)} disabled={loading}>
                    Stop Webcam
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={reset} disabled={loading}>
                    Reset
                  </Button>
                </Space>
              </>
            )}
            {imageSrc && !capturing && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Captured Image Preview:</Text>
                <div style={{ margin: '8px auto', width: 200, height: 150, background: '#f0f2f5', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={imageSrc} alt="Captured" style={{ width: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}
            {loading && (
              <Spin tip="Predicting..." size="large" style={{ marginTop: 16 }} />
            )}
          </Space>
        </Card>
      </Content>
      <Footer style={{ textAlign: 'center' }}>©2024 Nepali Sign Language</Footer>
    </Layout>
  );
}

export default App;
