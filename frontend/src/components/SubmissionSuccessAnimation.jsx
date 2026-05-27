import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COIN_GIF = '/assets/Coin.gif';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.3, delay: 3.6 } }
};

const coinContainerVariants = {
    hidden: { scale: 0.3, opacity: 0 },
    visible: {
        scale: [0.3, 1.1, 1],
        opacity: 1,
        rotate: [0, 360, 720],
        transition: { duration: 1.0, ease: 'easeOut', times: [0, 0.6, 1] }
    },
    exit: {
        scale: 0.3,
        opacity: 0,
        rotate: 1080,
        transition: { duration: 0.4, delay: 3.6 }
    }
};

const floatVariants = {
    hidden: { y: 0, rotate: 0 },
    visible: {
        y: [-6, 6, -6],
        rotate: [0, 8, -8, 0],
        transition: { duration: 2, delay: 1, repeat: 1, ease: 'easeInOut' }
    }
};

const textVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.8 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4, delay: 0.6, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.8,
        transition: { duration: 0.3, delay: 3.4 }
    }
};

const pointsVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, delay: 0.8, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        y: -8,
        transition: { duration: 0.3, delay: 3.4 }
    }
};

const SubmissionSuccessAnimation = ({ show, points = 25, onComplete }) => {
    const [gifLoaded, setGifLoaded] = useState(false);
    const timerRef = useRef(null);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        if (show) {
            timerRef.current = setTimeout(() => {
                if (onCompleteRef.current) onCompleteRef.current();
            }, 4000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [show]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="submission-success-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <div className="submission-success-glass" />

                    <div className="submission-success-glow-ring" />

                    <motion.div
                        className="submission-success-coin-container"
                        variants={coinContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="submission-success-coin-wrapper">
                            <div className="submission-success-coin-inner">
                                <img
                                    src={COIN_GIF}
                                    alt=""
                                    className="submission-success-coin-gif"
                                    onLoad={() => setGifLoaded(true)}
                                    onError={() => setGifLoaded(false)}
                                    style={{ display: gifLoaded ? 'block' : 'none' }}
                                />
                                {!gifLoaded && (
                                    <div className="grand-coin">
                                        <div className="grand-coin-face grand-coin-front" />
                                        <div className="grand-coin-face grand-coin-back" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <motion.div
                            className="submission-success-shine"
                            variants={floatVariants}
                            initial="hidden"
                            animate="visible"
                        />
                    </motion.div>

                    <motion.div
                        className="submission-success-accepted"
                        variants={textVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        ACCEPTED
                    </motion.div>

                    <motion.div
                        className="submission-success-points"
                        variants={pointsVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        Points Earned: +{points}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SubmissionSuccessAnimation;
