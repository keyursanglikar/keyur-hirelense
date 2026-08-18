import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './LoadingAnimation.css';

const LoadingAnimation = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onComplete) setTimeout(onComplete, 400);
          return 100;
        }
        // Accelerate near the end for a snappy feel
        const increment = prev > 80 ? 3 : prev > 50 ? 2 : 1;
        return prev + increment > 100 ? 100 : prev + increment;
      });
    }, 15);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="modern-loader-container">
      {/* Animated Background Blobs for Modern Mesh Gradient effect */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <motion.div
        className="glass-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
      >
        <div className="card-content">
          
          {/* Header Row: Logo + Text */}
          <motion.div 
            className="brand-header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="modern-logo-wrapper">
              <motion.div
                className="logo-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              />
              <motion.div
                className="logo-ring-inner"
                animate={{ rotate: -360 }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
              />
              <div className="logo-text">NZ</div>
            </div>
            <h1 className="modern-title">
              <span className="gradient-text">NZ Solutions</span>
              <span className="arrow"> &rarr; </span>
              <span className="gradient-text-alt">Hirelens</span>
            </h1>
          </motion.div>

          {/* Slogan */}
          <motion.p 
            className="modern-slogan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Secured CA Firm &amp; Administration Hub
          </motion.p>

          {/* Progress Section */}
          <motion.div 
            className="progress-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="progress-track">
              <motion.div 
                className="progress-indicator"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            
            <div className="progress-footer">
              <span className="loading-status">
                Initializing Environment
                <span className="dots"><span>.</span><span>.</span><span>.</span></span>
              </span>
              <span className="percentage">{progress}%</span>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default LoadingAnimation;