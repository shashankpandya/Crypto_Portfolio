import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

const slides = [
  {
    title: "Welcome to Crypto Portfolio",
    content:
      "This is a partially decentralized application (dApp) designed to help you track live token values, manage wallet balances, and interact with the blockchain in real-time.",
  },
  {
    title: "Database Watchlist Sync",
    content:
      "Your watchlist is synced with a secure database when your wallet is connected. Any coins you watched offline are automatically synchronized to your account as soon as you sign in.",
  },
  {
    title: "Allowance & Approvals",
    content:
      "Before our smart contract can transfer ERC20 tokens on your behalf, you must grant it permission using the 'Approve Allowance' page. You can inspect active allowances on the 'Allowance Check' screen.",
  },
  {
    title: "Batch Transfers (Save Gas!)",
    content:
      "Using our custom smart contract, you can send tokens to multiple recipient addresses in a single transaction under the 'Batch Transfer' tab, significantly saving transaction gas fees.",
  },
  {
    title: "Owner Admin Fees",
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
        className="fixed bottom-6 right-6 z-50 px-5 py-2.5 premium-btn-secondary text-[#3861fb] text-xs font-bold rounded-full shadow-2xl transition-all duration-300"
        aria-label="Open tour guide"
      >
        Guide
      </button>

      {/* Slide-out Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 backdrop-filter backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={toggleSidebar}></div>

          {/* Drawer container */}
          <div
            ref={sidebarRef}
            className="w-full max-w-md h-full bg-[#0e0f17] bg-opacity-95 border-l border-[#2e324d]/85 backdrop-filter backdrop-blur-md text-white shadow-2xl flex flex-col justify-between p-8 relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-[#2e324d]/30 pb-4">
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a7bb]">
                Platform Guide
              </h3>
              <button
                onClick={toggleSidebar}
                className="px-3.5 py-1.5 rounded-lg bg-[#12131a] hover:bg-[#1a1c27] border border-[#2e324d] text-xs font-bold transition duration-200"
                aria-label="Close guide"
              >
                Close
              </button>
            </div>

            {/* Slide Content */}
            <div ref={contentRef} className="flex-1 flex flex-col justify-center items-center text-center px-4">
              <h4 className="text-2xl font-bold mb-4 text-white">
                {slides[currentSlide].title}
              </h4>
              <p className="text-[#a1a7bb] text-sm leading-relaxed">
                {slides[currentSlide].content}
              </p>
            </div>

            {/* Footer / Controls */}
            <div className="mt-8 border-t border-[#2e324d]/30 pt-6">
              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-6 bg-[#3861fb]" : "w-2 bg-[#2e324d] hover:bg-[#383d5a]"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  ></button>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 bg-[#12131a] hover:bg-[#1a1c27] border border-[#2e324d] text-white font-semibold rounded-lg flex items-center transition duration-200 text-sm"
                >
                  Prev
                </button>
                <span className="text-sm text-[#a1a7bb] font-mono">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 premium-btn text-white font-semibold rounded-lg flex items-center transition duration-200 text-sm"
                >
                  Next
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
