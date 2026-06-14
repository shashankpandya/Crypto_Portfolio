import React, { useContext, useState } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { TransactionContext } from "../../context/TransactionContext";

const NavBarItem = ({ title, path, active, closeMenu, classprops }) => (
  <li className={`mx-4 relative group ${classprops || ""}`}>
    <Link
      to={path}
      onClick={closeMenu}
      className={`text-sm font-semibold transition duration-300 py-4 block ${
        active
          ? "text-white font-bold"
          : "text-[#a1a7bb] hover:text-white"
      }`}
    >
      {title}
    </Link>
    {/* Coral sliding underline indicator */}
    <span
      className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#FF385C] to-[#FF7B00] transition-all duration-300 ${
        active ? "w-full" : "w-0 group-hover:w-full"
      }`}
    ></span>
  </li>
);

const CPLogo = () => (
  <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cp-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF385C" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    {/* Geometric sharp hexagon CP monogram */}
    <path
      d="M30 15 L70 15 L90 50 L70 85 L30 85 L10 50 Z"
      stroke="url(#cp-logo-grad)"
      strokeWidth="10"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M40 38 H58 C63 38 63 48 58 48 H40 V62"
      stroke="#ffffff"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite, isAdmin } =
    useContext(TransactionContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  const menuItems = [
    { title: "Dashboard", path: "/" },
    { title: "Watchlist", path: "/watchlist" },
    { title: "Transfer", path: "/transfer" },
    { title: "Allowance", path: "/allowance" },
    ...(isAdmin ? [{ title: "Admin Panel", path: "/admin" }] : []),
  ];

  return (
    <nav className="sticky top-0 w-full h-14 flex items-center justify-between px-6 premium-glass-nav z-50">
      {/* Brand logo: compact stacked layout */}
      <div className="flex items-center text-xl font-black tracking-tight">
        <Link to="/" className="flex items-center space-x-3.5 group">
          <div className="group-hover:scale-105 transition-all duration-300">
            <CPLogo />
          </div>
          <div className="flex flex-col leading-none text-left select-none">
            <span className="text-[9px] uppercase tracking-widest text-[#a1a7bb] font-extrabold">Crypto</span>
            <span className="text-sm font-black tracking-tight text-white group-hover:text-[#FF385C] transition-colors duration-200">Portfolio</span>
          </div>
        </Link>
      </div>

      {/* Navbar links for larger screens */}
      {isConnectedToSite && (
        <ul className="text-white md:flex hidden list-none flex-row justify-between items-center h-full">
          {menuItems.map((item, index) => (
            <NavBarItem
              key={index}
              title={item.title}
              path={item.path}
              active={
                location.pathname === item.path ||
                (item.path === "/allowance" && (location.pathname === "/approveallowance" || location.pathname === "/allowancecheck"))
              }
            />
          ))}
        </ul>
      )}

      {/* Mobile menu toggle */}
      <div className="flex relative items-center">
        {!toggleMenu ? (
          <HiMenuAlt4
            fontSize={24}
            className="text-white md:hidden cursor-pointer hover:text-[#FF385C] transition duration-200"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={24}
            className="text-white md:hidden cursor-pointer hover:text-[#FF385C] transition duration-200"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-50 fixed top-0 right-0 p-6 w-[70vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-l-xl bg-[#0b0f19] border-l border-white/5 text-white animate-slide-in"
          >
            <li className="text-lg w-full my-2 flex justify-between items-center border-b border-white/5 pb-4">
              <span className="text-[#FF385C] font-extrabold tracking-wider">MENU</span>
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                className="cursor-pointer hover:text-[#FF385C] transition duration-200"
                aria-label="Close menu"
              />
            </li>
            {isConnectedToSite &&
              menuItems.map((item, index) => (
                <NavBarItem
                  key={index}
                  title={item.title}
                  path={item.path}
                  active={location.pathname === item.path}
                  classprops="my-2 text-lg w-full text-right"
                  closeMenu={() => setToggleMenu(false)}
                />
              ))}
          </ul>
        )}
      </div>

      {/* Wallet Connection Section */}
      <div className="flex items-center space-x-3 ml-4">
        {isConnectedToSite ? (
          <div className="flex items-center space-x-2.5 bg-[#0b0f19] border border-white/5 px-3 py-1.5 rounded-lg shadow-lg">
            {/* Active Network Dot (Electric Cobalt / Blue) */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]"></span>
            </span>
            <p className="text-[#a1a7bb] font-mono text-xs font-semibold tracking-tight">
              {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
            </p>
            <button
              className="bg-white/5 hover:bg-[#FF385C] hover:text-white border border-white/5 text-[#a1a7bb] text-[10px] font-bold py-1 px-2.5 rounded transition duration-200"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
            {/* Grey disconnected dot */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
            <button
              className="premium-btn text-white text-xs font-bold py-1.5 px-4 rounded-lg transition duration-300"
              onClick={handleConnect}
              data-tooltip-id="connect-wallet-tooltip"
              data-tooltip-content="Connect your Ethereum wallet to access the dashboard"
            >
              Connect Wallet
            </button>
          </div>
        )}
        <Tooltip id="connect-wallet-tooltip" />
      </div>
    </nav>
  );
};

export default Navbar;
