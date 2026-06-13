import React, { useState, useEffect, useRef } from "react";
import {
  FaQuestion,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaInfoCircle,
  FaEthereum,
  FaSlidersH,
  FaDatabase,
  FaCheckDouble,
} from "react-icons/fa";
import { gsap } from "gsap";

const slides = [
  {
    title: "Welcome to Crypto Portfolio",
    icon: <FaInfoCircle className="text-teal-400 text-5xl" />,
    content:
      "This is a partially decentralized application (dApp) designed to help you track live token values, manage wallet balances, and interact with the blockchain in real-time.",
  },
  {
    title: "Database Watchlist Sync",
    icon: <FaDatabase className="text-teal-400 text-5xl" />,
    content:
      "Your watchlist is synced with a secure database when your wallet is connected. Any coins you watched offline are automatically synchronized to your account as soon as you sign in.",
  },
  {
    title: "Allowance & Approvals",
    icon: <FaCheckDouble className="text-teal-400 text-5xl" />,
    content:
      "Before our smart contract can transfer ERC20 tokens on your behalf, you must grant it permission using the 'Approve Allowance' page. You can inspect active allowances on the 'Allowance Check' screen.",
  },
  {
    title: "Batch Transfers (Save Gas!)",
    icon: <FaEthereum className="text-teal-400 text-5xl" />,
    content:
      "Using our custom smart contract, you can send tokens to multiple recipient addresses in a single transaction under the 'Batch Transfer' tab, significantly saving transaction gas fees.",
  },
  {
    title: "Owner Admin Fees",
    icon: <FaSlidersH className="text-teal-400 text-5xl" />,
    content:
      "If you are the smart contract owner, an 'Admin Panel' will unlock in your navigation bar where you can dynamically set the contract transaction fee percentage charged on transfer operations.",
  },
];

function TourGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      // Slide in from right
      gsap.fromTo(
        sidebarRef.current,
        { x: "100%" },
        { x: "0%", duration: 0.5, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Animate slide content change
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [currentSlide, isOpen]);

  const handleNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group border border-teal-400"
        aria-label="Open tour guide"
      >
        <span className="absolute inset-0 rounded-full bg-teal-400 bg-opacity-25 animate-ping group-hover:animate-none"></span>
        <FaQuestion className="text-white text-xl animate-pulse" />
      </button>

      {/* Slide-out Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 backdrop-filter backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={toggleSidebar}></div>

          {/* Drawer container */}
          <div
            ref={sidebarRef}
            className="w-full max-w-md h-full bg-gray-900 bg-opacity-95 border-l border-gray-800 backdrop-filter backdrop-blur-md text-white shadow-2xl flex flex-col justify-between p-8 relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
              <h3 className="text-2xl font-extrabold text-teal-400 flex items-center">
                <FaInfoCircle className="mr-2 text-teal-500" /> Platform Guide
              </h3>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition duration-200"
                aria-label="Close guide"
              >
                <FaTimes className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Slide Content */}
            <div ref={contentRef} className="flex-1 flex flex-col justify-center items-center text-center px-4">
              <div className="mb-6 bg-gray-800 p-6 rounded-full border border-gray-700 shadow-inner">
                {slides[currentSlide].icon}
              </div>
              <h4 className="text-2xl font-bold mb-4 text-white">
                {slides[currentSlide].title}
              </h4>
              <p className="text-gray-300 text-base leading-relaxed">
                {slides[currentSlide].content}
              </p>
            </div>

            {/* Footer / Controls */}
            <div className="mt-8 border-t border-gray-800 pt-6">
              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-6 bg-teal-400" : "w-2.5 bg-gray-700 hover:bg-gray-600"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  ></button>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg flex items-center transition duration-200 border border-gray-700"
                >
                  <FaArrowLeft className="mr-2" /> Prev
                </button>
                <span className="text-sm text-gray-500 font-mono">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-lg flex items-center transition duration-200"
                >
                  Next <FaArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TourGuide;
